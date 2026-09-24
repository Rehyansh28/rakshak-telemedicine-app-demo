"""Command line: ``python hub.py ports | run | record | replay``."""
from __future__ import annotations

import argparse
import os
import queue
import sys
import threading
import time
from datetime import datetime

from .backend import BackendSink, load_env_file
from .config import ConfigError, load_config
from .console import ConsoleSink
from .core import Hub
from .live import LiveServer
from .sources import (
    HUB_COMMAND_PREFIX,
    KNOWN_USB_VIDS,
    Recorder,
    SerialSource,
    list_serial_ports,
    port_score,
    read_recording,
)

HUB_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANNER = "Rakshak hub - EXPERIMENTAL student prototype, not a medical device."


class KeyboardCommands:
    """Reads commands typed in the terminal (c = calibrate, q = quit) without blocking."""

    def __init__(self):
        self.queue = queue.Queue()
        if sys.stdin and sys.stdin.isatty():
            threading.Thread(target=self._read, daemon=True).start()

    def _read(self):
        for line in sys.stdin:
            self.queue.put(line.strip().lower())

    def pop(self):
        commands = []
        while not self.queue.empty():
            commands.append(self.queue.get())
        return commands


def cmd_ports(args, cfg):
    ports = list_serial_ports()
    if not ports:
        print("No serial ports found. Plug in the ESP32 (use a data USB cable) and try again.")
        return
    print("Serial ports on this computer:")
    for p in ports:
        mark = "   <-- looks like an ESP32" if port_score(p) > 0 else ""
        chip = f" [{KNOWN_USB_VIDS[p.vid]}]" if p.vid in KNOWN_USB_VIDS else ""
        print(f"  {p.device}  -  {p.description}{chip}{mark}")
    print("\nWith port = auto in config.ini the hub picks the first marked port by itself.")


def make_sinks(args, cfg):
    """Console always; live stream and Django backend when enabled."""
    sinks = [ConsoleSink(quiet=args.quiet, verbose=args.verbose)]
    if cfg.live.enabled:
        try:
            live = LiveServer(cfg.live.host, cfg.live.port)
            sinks.append(live)
            print(f"Live data for the web app: {live.address}/events")
        except OSError as exc:
            print(
                f"Live view OFF: port {cfg.live.port} is in use ({exc}). Is another hub already running? "
                "Stop it, or change [live] port in config.ini."
            )
    if args.no_backend or not cfg.backend.enabled:
        print("Backend: off (summaries and alerts are not sent to Django).")
        return sinks
    env = load_env_file(os.path.join(HUB_DIR, ".env"))
    if not env.get("HUB_USERNAME") or not env.get("HUB_PASSWORD"):
        print(
            "Backend: off - no hub login. Copy .env.example to .env and fill in HUB_USERNAME and "
            "HUB_PASSWORD (a Medical Staff account), or use --no-backend."
        )
        return sinks
    sinks.append(
        BackendSink(
            cfg.backend.url,
            env["HUB_USERNAME"],
            env["HUB_PASSWORD"],
            soldier_ids=cfg.devices.values(),
            send_interval_s=cfg.backend.send_interval_s,
        )
    )
    return sinks


def close_sinks(sinks):
    for sink in sinks:
        if hasattr(sink, "close"):
            sink.close()


def run_live(args, cfg, seconds=None, record_path=None):
    port = args.port or cfg.serial.port
    source = SerialSource(port, cfg.serial.baud, cfg.serial.reconnect_interval_s)
    sinks = make_sinks(args, cfg)
    hub = Hub(cfg, sinks)
    recorder = None
    if record_path:
        recorder = Recorder(record_path, note=f"port: {port}  baud: {cfg.serial.baud}")
        print(f"Recording to {record_path}" + (f" for {seconds:g} s" if seconds else " (Ctrl+C to stop)"))
    keys = KeyboardCommands()
    print("Type  c + Enter  to calibrate upright,  q + Enter  to quit (or press Ctrl+C).")
    start = time.monotonic()
    try:
        while True:
            line = source.read_line()
            now = time.monotonic()
            if line is not None:
                if recorder:
                    recorder.write(now - start, line)
                hub.feed(line, now)
            for command in keys.pop():
                if command in ("q", "quit", "exit"):
                    raise KeyboardInterrupt
                if command in ("c", "calibrate"):
                    hub.calibrate()
                    if recorder:
                        recorder.write(now - start, HUB_COMMAND_PREFIX + "calibrate")
            hub.source_status = source.status
            hub.tick(now)
            if seconds and now - start >= seconds:
                break
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        source.close()
        if recorder:
            recorder.close()
            print(f"Saved {recorder.lines} lines to {recorder.path}")
        close_sinks(sinks)
    final_report(hub, time.monotonic() - start)


def cmd_run(args, cfg):
    run_live(args, cfg, record_path=args.record)


def cmd_record(args, cfg):
    out = args.out or os.path.join(
        HUB_DIR, "recordings", datetime.now().strftime("recording_%Y%m%d_%H%M%S.txt")
    )
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    run_live(args, cfg, seconds=args.seconds, record_path=out)


def cmd_replay(args, cfg):
    sinks = make_sinks(args, cfg)
    hub = Hub(cfg, sinks)
    hub.source_status = f"replay {os.path.basename(args.file)}"
    speed = max(args.speed, 0.01)
    print(f"Replaying {args.file}" + (" as fast as possible" if args.fast else f" at {speed:g}x speed"))
    offset = 0.0
    now = 0.0
    real_start = time.monotonic()
    try:
        while True:
            last_t = None
            for t, line in read_recording(args.file):
                last_t = t
                now = offset + t
                if not args.fast:
                    # Wait until it is time for this line, keeping the summaries ticking.
                    # (hub time = real time since the start x speed; it already includes earlier loops)
                    while (time.monotonic() - real_start) * speed < now:
                        hub.tick((time.monotonic() - real_start) * speed)
                        time.sleep(0.01)
                if line.startswith(HUB_COMMAND_PREFIX):
                    if line[len(HUB_COMMAND_PREFIX):] == "calibrate":
                        hub.calibrate()
                    continue
                hub.advance(now)
                hub.feed(line, now)
                hub.tick(now)
            if last_t is None:
                print("The recording file has no data lines.")
                return
            if not args.loop:
                break
            offset = now + 0.1
            hub.log("--- replay looping back to the start ---")
        # Keep going briefly after the end, so the "disconnected" alert shows like when unplugged.
        end = now + cfg.timeouts.disconnect_after_s + 1.5
        while now < end:
            now += 0.1
            if not args.fast:
                time.sleep(0.1 / speed)
            hub.tick(now)
    except KeyboardInterrupt:
        print("\nStopping...")
    close_sinks(sinks)
    final_report(hub, now)


def final_report(hub, duration_s):
    print("\n==== Summary ====")
    print(f"Ran for {duration_s:.0f} s. Lines read: {hub.lines}, ignored (broken / not JSON): {hub.ignored_lines}")
    for kind, n in hub.ignored_kinds.most_common():
        print(f"  ignored: {n} x {kind}, e.g. {hub.ignored_examples[kind]!r}")
    if not hub.devices:
        print("No messages from any ESP32 were received.")
    for device in hub.devices.values():
        print(f"Sensor {device.dev_id} -> soldier {device.soldier_id or '(not linked in config.ini)'}")
        for msg_type, handler in device.handlers.items():
            extra = f", lost {handler.seq.lost}" if handler.stream else ""
            restarts = f", counter restarts {handler.seq.restarts}" if handler.seq.restarts else ""
            print(f"  {msg_type:7} messages {handler.messages}, samples {handler.samples}{extra}{restarts}")
        if device.unknown_types:
            print(f"  ignored message types: {dict(device.unknown_types)}")
        if device.bad_messages:
            print(f"  messages with bad content: {device.bad_messages} (last: {device.last_error})")
        status = device.handlers.get("status")
        if status:
            errors = "--" if status.imu_errors is None else f"{status.imu_errors:.0f}"
            print(f"  firmware {status.fw}, IMU read errors reported by the ESP32: {errors}")
        imu = device.handlers.get("imu")
        if imu:
            print(f"  calibrated: {'yes' if imu.analyzer.calibrated else 'NO'}")
    for sink in hub.sinks:
        if hasattr(sink, "sent_summaries"):
            print(f"Sent to Django: {sink.sent_summaries} summaries, {sink.sent_alerts} alerts")
    print("EXPERIMENTAL: values and alerts are not medically validated.")


def build_parser():
    parser = argparse.ArgumentParser(prog="hub.py", description=BANNER)
    parser.add_argument("--config", default=os.path.join(HUB_DIR, "config.ini"), help="settings file")
    parser.add_argument("--quiet", action="store_true", help="only print alerts and checks")
    parser.add_argument("--verbose", action="store_true", help="also print ignored (broken) lines")
    parser.add_argument("--no-backend", action="store_true", help="do not send anything to Django")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("ports", help="list serial ports (find the ESP32)").set_defaults(func=cmd_ports)

    p = sub.add_parser("run", help="read the ESP32 live")
    p.add_argument("--port", help="serial port (default: from config.ini, 'auto')")
    p.add_argument("--record", metavar="FILE", help="also save everything to FILE")
    p.set_defaults(func=cmd_run)

    p = sub.add_parser("record", help="read the ESP32 live and save it to a file")
    p.add_argument("--port", help="serial port (default: from config.ini, 'auto')")
    p.add_argument("--seconds", type=float, default=60, help="how long to record (default 60)")
    p.add_argument("--out", help="file name (default: recordings/recording_<date>_<time>.txt)")
    p.set_defaults(func=cmd_record)

    p = sub.add_parser("replay", help="play a recording back as if it were live")
    p.add_argument("file", help="recording file")
    p.add_argument("--speed", type=float, default=1.0, help="1 = real time, 2 = twice as fast")
    p.add_argument("--loop", action="store_true", help="start again at the end (Ctrl+C to stop)")
    p.add_argument("--fast", action="store_true", help="no waiting - process the file instantly")
    p.set_defaults(func=cmd_replay)
    return parser


def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(line_buffering=True)  # show lines at once, also when piped to a file
    args = build_parser().parse_args(argv)
    try:
        cfg = load_config(args.config)
    except ConfigError as exc:
        raise SystemExit(f"Config problem: {exc}") from None
    print(BANNER)
    args.func(args, cfg)

