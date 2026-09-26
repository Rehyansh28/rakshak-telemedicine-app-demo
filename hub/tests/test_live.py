"""Tests for the live stream (SSE) the web app reads."""
import http.client
import json
import os
import sys
import threading
import time
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rakshak_hub.config import load_config  # noqa: E402
from rakshak_hub.core import Hub  # noqa: E402
from rakshak_hub.fake_esp32 import generate  # noqa: E402
from rakshak_hub.live import LiveServer  # noqa: E402

CONFIG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config.ini")


def read_events(response, count, timeout=5):
    """Read `count` JSON events from an SSE response (skips pings and retry lines)."""
    events, deadline = [], time.time() + timeout
    while len(events) < count and time.time() < deadline:
        line = response.fp.readline().decode()
        if line.startswith("data: "):
            events.append(json.loads(line[6:]))
    return events


class LiveServerTests(unittest.TestCase):
    def setUp(self):
        self.live = LiveServer("127.0.0.1", 0, log=lambda text: None)
        self.addCleanup(self.live.close)
        self.hub = Hub(load_config(CONFIG), [self.live], log=lambda text: None)
        self.lines = generate("demo")

    def feed_until(self, t_end):
        for t, line in self.lines:
            self.hub.advance(t)
            self.hub.feed(line, t)
            if t >= t_end:
                return t

    def connect(self, path="/live/events"):
        conn = http.client.HTTPConnection("127.0.0.1", self.live.port, timeout=5)
        self.addCleanup(conn.close)
        conn.request("GET", path)
        return conn.getresponse()

    def test_viewer_gets_snapshot_then_live_data(self):
        self.feed_until(12)  # standing, then walking
        response = self.connect()
        self.assertEqual(response.getheader("Content-Type"), "text/event-stream")
        snapshot = read_events(response, 81)
        self.assertEqual(snapshot[0]["type"], "summary")
        self.assertTrue(all(e.get("snapshot") for e in snapshot))
        ecg = [e for e in snapshot if e["type"] == "ecg"]
        self.assertEqual(len(ecg), 80)  # last 8 s of ECG
        self.assertEqual(len(ecg[0]["samples"]), 25)
        self.assertEqual(ecg[0]["soldierId"], "IA-SLD-1923")
        device = snapshot[0]["devices"][0]
        self.assertEqual((device["soldierId"], device["posture"], device["activity"]), ("IA-SLD-1923", "upright", "moving"))
        self.assertIsNotNone(device["hr"])
        # Now live messages flow.
        self.feed_until(14)
        live = read_events(response, 5)
        self.assertEqual(len(live), 5)
        self.assertFalse(any(e.get("snapshot") for e in live))
        seqs = [e["seq"] for e in live if e["type"] == "ecg"]
        self.assertEqual(seqs, sorted(seqs))

    def test_alerts_are_streamed_and_active_ones_are_in_snapshot(self):
        self.live.queue_size = 10000  # the test feeds 34 s of data in a moment
        response = self.connect()
        events = []
        reader = threading.Thread(target=lambda: events.extend(read_events(response, 10**6, timeout=4)))
        reader.start()  # a browser reads all the time
        self.feed_until(34)  # fall at ~18 s, electrodes off at ~32 s (still off)
        reader.join()
        alerts = [e for e in events if e["type"] == "alert"]
        self.assertEqual([a["key"] for a in alerts], ["fall", "leads_off"])
        late = self.connect()
        snap = [e for e in read_events(late, 82) if e["type"] == "alert"]
        self.assertEqual([a["key"] for a in snap], ["leads_off"])  # falls are one-off, not in the snapshot
        self.assertTrue(snap[0]["snapshot"])
        self.feed_until(37)  # electrodes back on -> resolved, gone from the snapshot
        self.assertEqual(self.live.active_alerts, {})

    def test_health_and_closed_viewers_are_removed(self):
        self.feed_until(3)
        health = json.loads(self.connect("/live/health").read())
        self.assertTrue(health["ok"])
        self.assertEqual(health["devices"][0]["dev"], "node-01")
        response = self.connect()
        read_events(response, 2)
        self.assertEqual(len(self.live.clients), 1)
        response.close()
        for _ in range(50):  # the server notices when it next writes to the closed connection
            self.hub.emit_live({"type": "ecg", "dev": "x", "samples": []})
            if not self.live.clients:
                break
            time.sleep(0.05)
        self.assertEqual(len(self.live.clients), 0)

    def test_slow_viewer_is_dropped_not_blocking(self):
        response = self.connect()
        read_events(response, 1)
        started = time.time()
        self.feed_until(40)  # ~450 messages, nobody reading
        self.assertLess(time.time() - started, 5)  # the hub never waits for a browser

    def test_mode_says_live_or_replay(self):
        self.feed_until(3)
        self.assertEqual(self.live.last_summary["mode"], "live")
        self.hub.recording = "real_90s.txt"  # what 'hub.py replay' sets
        self.feed_until(5)
        self.assertEqual(self.live.last_summary["mode"], "replay")
        self.assertEqual(self.live.last_summary["recording"], "real_90s.txt")
        health = json.loads(self.connect("/live/health").read())
        self.assertEqual(health["mode"], "replay")

    def test_unknown_path(self):
        self.assertEqual(self.connect("/nope").status, 404)


if __name__ == "__main__":
    unittest.main()
