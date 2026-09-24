"""Live data for the browser: a tiny Server-Sent Events (SSE) server, standard library only.

    GET /live/events   -> endless stream of JSON messages (one "data:" line each)
    GET /live/health   -> JSON: is the hub running, which sensors, how many viewers

The React app reaches it through the Vite dev server proxy (/live -> this server),
so the browser only ever talks to one address. The browser's EventSource reconnects
by itself when the hub restarts.

Messages (all have "type"):
    ecg      raw ECG samples as they arrive (10 per second per sensor) - never stored
    summary  once per second: every sensor's heart rate, electrodes, signal, posture...
    alert    an alert started or ended
A new viewer first gets the last summary, the active alerts and the last few seconds
of ECG (marked "snapshot": true), so the graph and badges fill in at once.

EXPERIMENTAL student prototype - not a medical device.
"""
from __future__ import annotations

import json
import queue
import threading
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ECG_BACKLOG_MESSAGES = 80  # 8 s of ECG (10 messages per second) for new viewers
CLIENT_QUEUE_SIZE = 300  # ~25 s of messages; a viewer that falls further behind is dropped
PING_EVERY_S = 5.0


class _Viewer:
    """One connected browser: its outgoing message queue."""

    def __init__(self, size):
        self.queue = queue.Queue(maxsize=size)
        self.dead = False


def live_device(s):
    """The part of a device summary the web page needs."""
    ecg = s.get("ecg") or {}
    imu = s.get("imu") or {}
    status = s.get("status") or {}
    return {
        "dev": s["dev"],
        "soldierId": s["soldierId"],
        "connected": s["connected"],
        "lastSeenAgoS": s["lastSeenAgoS"],
        "hr": ecg.get("hr"),
        "leadsOff": ecg.get("leadsOff"),
        "ecgSignal": ecg.get("signal"),
        "ecgSampleRate": ecg.get("sampleRate"),
        "posture": imu.get("posture"),
        "lyingSide": imu.get("lyingSide"),
        "activity": imu.get("activity"),
        "stillForS": imu.get("stillForS"),
        "noMovementForS": imu.get("noMovementForS"),
        "calibrated": imu.get("calibrated"),
        "calibrating": imu.get("calibrating"),
        "pitch": imu.get("pitch"),
        "roll": imu.get("roll"),
        "fw": status.get("fw"),
        "activeAlerts": s["activeAlerts"],
    }


class LiveServer:
    """Sink that streams hub data to web browsers."""

    def __init__(self, host="127.0.0.1", port=8765, log=print):
        self.log = log
        self.lock = threading.Lock()
        self.clients = set()
        self.last_summary = None
        self.active_alerts = {}  # (dev, key) -> alert message
        self.ecg_backlog = {}  # dev -> deque of ecg messages
        self.source_status = None
        self.queue_size = CLIENT_QUEUE_SIZE
        live = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                if self.path.split("?")[0] == "/live/events":
                    live._stream(self)
                elif self.path.split("?")[0] == "/live/health":
                    live._health(self)
                else:
                    self.send_error(404)

        self.server = ThreadingHTTPServer((host, port), Handler)  # raises OSError if the port is taken
        self.server.daemon_threads = True
        self.port = self.server.server_address[1]  # port 0 = any free port (used by the tests)
        self.address = f"http://{host}:{self.port}/live"
        threading.Thread(target=self.server.serve_forever, name="live-server", daemon=True).start()

    # ----- sink interface (called by the hub, on the hub's thread) -----

    def on_ignored_line(self, line):
        pass

    def on_live(self, event):
        with self.lock:
            self.ecg_backlog.setdefault(event["dev"], deque(maxlen=ECG_BACKLOG_MESSAGES)).append(event)
        self._broadcast(event)

    def on_summary(self, summaries, hub):
        event = {
            "type": "summary",
            "time": hub.wall_now().isoformat(),
            "source": hub.source_status,
            "experimental": True,
            "devices": [live_device(s) for s in summaries],
        }
        with self.lock:
            self.last_summary = event
        self._broadcast(event)

    def on_alert(self, alert):
        event = {
            "type": "alert",
            "dev": alert.dev,
            "soldierId": alert.soldier_id,
            "key": alert.key,
            "level": alert.level,
            "title": alert.title,
            "message": alert.message,
            "time": alert.time.isoformat(),
            "resolved": alert.resolved,
        }
        with self.lock:
            if alert.resolved:
                self.active_alerts.pop((alert.dev, alert.key), None)
            elif alert.key != "fall":  # a fall is a one-off event, not an ongoing state
                self.active_alerts[(alert.dev, alert.key)] = event
        self._broadcast(event)

    def close(self):
        self.server.shutdown()
        self.server.server_close()

    # ----- internals -----

    def _broadcast(self, event):
        data = self._encode(event)
        with self.lock:
            clients = list(self.clients)
        for client in clients:
            try:
                client.queue.put_nowait(data)
            except queue.Full:
                # Too slow (or gone): drop it; its browser reconnects and gets a fresh snapshot.
                client.dead = True
                with self.lock:
                    self.clients.discard(client)

    @staticmethod
    def _encode(event):
        return f"data: {json.dumps(event, separators=(',', ':'))}\n\n".encode("utf-8")

    def _snapshot_locked(self):
        """Current state for a new viewer. Call with self.lock held."""
        events = []
        if self.last_summary:
            events.append(dict(self.last_summary, snapshot=True))
        events += [dict(a, snapshot=True) for a in self.active_alerts.values()]
        for backlog in self.ecg_backlog.values():
            events += [dict(e, snapshot=True) for e in backlog]
        return [self._encode(e) for e in events]

    def _stream(self, handler):
        handler.send_response(200)
        handler.send_header("Content-Type", "text/event-stream")
        handler.send_header("Cache-Control", "no-cache")
        handler.send_header("Access-Control-Allow-Origin", "*")
        handler.send_header("X-Accel-Buffering", "no")
        handler.end_headers()
        client = _Viewer(self.queue_size)
        # Snapshot + joining the broadcast in one step, so no message falls in between.
        with self.lock:
            snapshot = self._snapshot_locked()
            self.clients.add(client)
        try:
            handler.wfile.write(b"retry: 2000\n\n")  # browser: reconnect after 2 s
            for data in snapshot:
                handler.wfile.write(data)
            while not client.dead:
                try:
                    data = client.queue.get(timeout=PING_EVERY_S)
                except queue.Empty:
                    data = b": ping\n\n"  # keeps the connection open, finds closed tabs
                handler.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass  # the browser closed the page
        finally:
            with self.lock:
                self.clients.discard(client)

    def _health(self, handler):
        with self.lock:
            summary = self.last_summary
            viewers = len(self.clients)
        body = json.dumps({
            "ok": True,
            "experimental": True,
            "viewers": viewers,
            "source": summary["source"] if summary else None,
            "devices": summary["devices"] if summary else [],
        }).encode("utf-8")
        handler.send_response(200)
        handler.send_header("Content-Type", "application/json")
        handler.send_header("Access-Control-Allow-Origin", "*")
        handler.send_header("Content-Length", str(len(body)))
        handler.end_headers()
        handler.wfile.write(body)
