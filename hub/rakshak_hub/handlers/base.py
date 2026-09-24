"""Shared pieces for message handlers.

One handler class per message ``type``. The hub makes one handler object per
device and message type, so a handler can keep its own state (e.g. last heart rate).
"""
from __future__ import annotations

from collections import deque

from ..protocol import number

# message type -> handler class. Filled by the @register decorator.
HANDLERS = {}


def register(cls):
    """Class decorator: make the hub use this handler for ``cls.msg_type`` messages."""
    HANDLERS[cls.msg_type] = cls
    return cls


class SeqTracker:
    """Counts lost messages from the ``seq`` counter (a gap in seq = lost message)."""

    def __init__(self):
        self.last = None
        self.lost = 0
        self.restarts = 0

    def update(self, seq):
        """Return how many messages were lost before this one, or -1 when seq restarted."""
        seq = int(number(seq, "seq"))
        previous, self.last = self.last, seq
        if previous is None:
            return 0
        gap = seq - previous
        if gap == 1:
            return 0
        if gap <= 0 or gap > 100000:
            # Counter went backwards: the ESP32 restarted (or a replay looped).
            self.restarts += 1
            return -1
        self.lost += gap - 1
        return gap - 1


class RateMeter:
    """Messages and samples per second over the last few seconds (hub clock)."""

    def __init__(self, window_s=5.0):
        self.window_s = window_s
        self.reset()

    def reset(self):
        self.events = deque()
        self.started = None

    def add(self, now, samples):
        if self.started is None:
            self.started = now
        self.events.append((now, samples))

    def rates(self, now):
        """Return (messages per second, samples per second)."""
        while self.events and self.events[0][0] < now - self.window_s:
            self.events.popleft()
        if self.started is None:
            return 0.0, 0.0
        span = max(1.0, min(self.window_s, now - self.started))
        return len(self.events) / span, sum(n for _, n in self.events) / span


class SensorHandler:
    """Base class. Subclasses set ``msg_type``/``label`` and implement ``on_message``."""

    msg_type = None
    label = None
    # Set to False for messages that are not a data stream (e.g. "status").
    stream = True

    def __init__(self, device, config):
        self.device = device
        self.config = config
        self.seq = SeqTracker()
        self.rate = RateMeter()
        self.messages = 0
        self.samples = 0
        self.last_msg_at = None

    def handle(self, msg, now):
        """Called by the device for every valid message of this type."""
        self.on_message(msg, now)
        self.messages += 1
        self.last_msg_at = now

    def count(self, now, samples):
        self.samples += samples
        self.rate.add(now, samples)

    def on_message(self, msg, now):
        raise NotImplementedError

    def tick(self, now):
        """Called about 10 times per second: raise or clear this sensor's alerts."""
        if not self.stream or self.last_msg_at is None:
            return
        key = f"{self.msg_type}_stale"
        timeout = self.config.timeouts.stale_after_s
        # Only when the rest of the sensor kept talking after this type went quiet (if
        # everything stops, that is "disconnected"), and not just after a reconnect.
        device = self.device
        others_still_talking = (
            now - device.last_seen <= timeout and device.last_seen - self.last_msg_at > timeout / 2
        )
        settled = now - device.connected_at > timeout
        if now - self.last_msg_at > timeout and others_still_talking and settled:
            self.device.alerts.raise_(
                key,
                "warning",
                f"{self.label} data stopped",
                f"No {self.label} data for more than {timeout:g} s.",
            )
        else:
            self.device.alerts.clear(key)

    def summary(self, now):
        """Return a small dict about this sensor for the per-second summary."""
        msg_rate, sample_rate = self.rate.rates(now)
        return {
            "msgRate": round(msg_rate, 1),
            "sampleRate": round(sample_rate, 1),
            "lost": self.seq.lost,
            "ageS": None if self.last_msg_at is None else round(now - self.last_msg_at, 1),
        }
