"""The hub: takes text lines, sends each message to its handler, makes summaries and alerts.

The hub does not know where lines come from (serial port or replay file) and
does not know where results go: it hands them to "sinks" (for now the console;
later the WebSocket server and Django).
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime

from .handlers import HANDLERS
from .protocol import BadMessage, describe_ignored, parse_line


@dataclass
class Alert:
    dev: str
    soldier_id: str
    key: str  # e.g. "fall", "leads_off", "disconnected"
    level: str  # "critical" / "warning" / "info" (same words as the Django EmergencyAlert)
    title: str
    message: str
    resolved: bool = False
    time: datetime = field(default_factory=lambda: datetime.now().astimezone())


class AlertTracker:
    """Makes sure an ongoing problem gives one alert (not one per second)."""

    def __init__(self, device):
        self.device = device
        self.active = {}
        self.last_fired = {}

    def raise_(self, key, level, title, message):
        """Problem is present now. Sends an alert only when it starts."""
        if key in self.active:
            return
        alert = Alert(self.device.dev_id, self.device.soldier_id, key, level, title, message)
        self.active[key] = alert
        self.device.hub.emit_alert(alert)

    def clear(self, key):
        """Problem is gone. Sends a 'resolved' notice if it was active."""
        alert = self.active.pop(key, None)
        if alert:
            self.device.hub.emit_alert(
                Alert(alert.dev, alert.soldier_id, key, "info", alert.title, "Resolved.", resolved=True)
            )

    def fire(self, key, level, title, message):
        """One-off event (like a fall): always sends an alert."""
        self.device.hub.emit_alert(Alert(self.device.dev_id, self.device.soldier_id, key, level, title, message))


class Device:
    """One ESP32 (identified by the "dev" field in its messages)."""

    def __init__(self, hub, dev_id, soldier_id):
        self.hub = hub
        self.config = hub.config
        self.dev_id = dev_id
        self.soldier_id = soldier_id
        self.alerts = AlertTracker(self)
        self.handlers = {}
        self.info = {}  # shared between handlers, e.g. imu field order from the status message
        self.last_seen = None
        self.connected = False
        self.connected_at = None
        self.bad_messages = 0
        self.last_error = None
        self.unknown_types = Counter()

    def log(self, text):
        self.hub.log(f"{self.dev_id}: {text}")

    def handler(self, msg_type):
        if msg_type not in self.handlers and msg_type in HANDLERS:
            self.handlers[msg_type] = HANDLERS[msg_type](self, self.config)
        return self.handlers.get(msg_type)

    def on_message(self, msg, now):
        self.last_seen = now
        if not self.connected:
            self.connected = True
            self.connected_at = now
            self.alerts.clear("disconnected")
            for handler in self.handlers.values():
                handler.rate.reset()  # do not count the gap in msg/s
        handler = self.handler(msg["type"])
        if handler is None:
            if not self.unknown_types[msg["type"]]:
                self.log(f'ignoring messages of unknown type "{msg["type"]}" (no handler)')
            self.unknown_types[msg["type"]] += 1
            return
        try:
            handler.handle(msg, now)
        except (BadMessage, TypeError, ValueError, KeyError, IndexError) as exc:
            self.bad_messages += 1
            self.last_error = f'{msg["type"]}: {exc}'

    def tick(self, now):
        timeout = self.config.timeouts.disconnect_after_s
        if self.connected and now - self.last_seen > timeout:
            self.connected = False
            self.alerts.raise_(
                "disconnected",
                "critical",
                "Sensor disconnected",
                f"No data from sensor {self.dev_id} for more than {timeout:g} s.",
            )
        if self.connected:
            for handler in self.handlers.values():
                handler.tick(now)

    def summary(self, now):
        data = {
            "dev": self.dev_id,
            "soldierId": self.soldier_id,
            "connected": self.connected,
            "lastSeenAgoS": None if self.last_seen is None else round(now - self.last_seen, 1),
            "badMessages": self.bad_messages,
            "activeAlerts": sorted(self.alerts.active),
        }
        for msg_type, handler in self.handlers.items():
            data[msg_type] = handler.summary(now)
        return data


class Hub:
    def __init__(self, config, sinks=(), log=print):
        self.config = config
        self.sinks = list(sinks)
        self.log = log
        self.devices = {}
        self.lines = 0
        self.ignored_lines = 0
        self.ignored_kinds = Counter()  # label -> count
        self.ignored_examples = {}  # label -> first example line
        self.source_status = None
        self._next_summary = None
        self._last_tick = None

    # ----- input -----

    def feed(self, line, now):
        """Handle one raw text line from the ESP32. Never raises for bad input."""
        self.lines += 1
        msg = parse_line(line)
        if msg is None:
            self.ignored_lines += 1
            kind = describe_ignored(line)
            self.ignored_kinds[kind] += 1
            self.ignored_examples.setdefault(kind, line.strip()[:90])
            for sink in self.sinks:
                sink.on_ignored_line(line)
            return
        dev_id = msg.get("dev") if isinstance(msg.get("dev"), str) else "unknown"
        device = self.devices.get(dev_id)
        if device is None:
            soldier_id = self.config.devices.get(dev_id)
            if soldier_id is None:
                self.log(
                    f'New sensor "{dev_id}" is not linked to a soldier. '
                    f"Add a line '{dev_id} = <soldier ID>' under [devices] in config.ini."
                )
            else:
                self.log(f'Sensor "{dev_id}" -> soldier {soldier_id}')
            device = self.devices[dev_id] = Device(self, dev_id, soldier_id)
        device.on_message(msg, now)

    def calibrate(self):
        """Command: next few still seconds become the "upright" reference (all sensors)."""
        self.log("Calibrating: the person should stand upright and still for a few seconds...")
        for device in self.devices.values():
            imu = device.handlers.get("imu")
            if imu:
                imu.calibrate()

    # ----- output -----

    def emit_alert(self, alert):
        for sink in self.sinks:
            sink.on_alert(alert)

    def advance(self, now, step=0.1):
        """Tick through the time since the last tick (for replays that do not wait),
        so timeouts like "disconnected" still work during gaps in the data."""
        if self._last_tick is not None:
            t = self._last_tick + step
            while t < now:
                self.tick(t)
                t += step
        self.tick(now)

    def tick(self, now):
        """Call often (about 10x per second). Checks alerts; makes a summary every summary_interval_s."""
        self._last_tick = now
        for device in self.devices.values():
            device.tick(now)  # alerts: checked on every tick so they come quickly
        if self._next_summary is None:
            self._next_summary = now
        if now < self._next_summary:
            return
        self._next_summary = now + self.config.hub.summary_interval_s
        summaries = [device.summary(now) for device in self.devices.values()]
        for sink in self.sinks:
            sink.on_summary(summaries, self)
