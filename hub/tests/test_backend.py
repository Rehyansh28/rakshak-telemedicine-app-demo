"""Tests for sending summaries / alerts to Django, against a small fake server."""
import json
import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rakshak_hub.backend import BackendSink, summary_for_backend  # noqa: E402
from rakshak_hub.core import Alert  # noqa: E402


class FakeDjango(BaseHTTPRequestHandler):
    """Accepts user 'hub'/'pw'. server.mode: 'ok', 'reject' (400) or 'expire' (401 once)."""

    def log_message(self, *args):
        pass

    def reply(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        server = self.server
        if self.path == "/api/auth/staff/login/":
            server.logins += 1
            if body == {"username": "hub", "password": "pw"}:
                return self.reply(200, {"token": f"t{server.logins}"})
            return self.reply(401, {"detail": "Invalid credentials"})
        if self.headers.get("Authorization") != f"Token t{server.logins}":
            return self.reply(401, {"detail": "Invalid token."})
        if server.mode == "expire":
            server.mode = "ok"
            return self.reply(401, {"detail": "Invalid token."})
        if server.mode == "reject":
            return self.reply(400, {"alerts": ["bad"]})
        server.batches.append(body)
        return self.reply(201, {"summaries": len(body["summaries"]), "unknownSoldiers": []})


def start_server():
    server = HTTPServer(("127.0.0.1", 0), FakeDjango)
    server.logins, server.batches, server.mode = 0, [], "ok"
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def device_summary(hr=70, connected=True):
    return {
        "soldierId": "IA-SLD-1923", "dev": "node-01", "connected": connected,
        "ecg": {"hr": hr, "signal": "ok", "leadsOff": False},
        "imu": {"posture": "lying", "lyingSide": "back", "activity": "still"},
    }


class FakeHub:
    replaying = False

    @staticmethod
    def wall_now():
        from datetime import datetime
        return datetime(2026, 9, 25, 10, 0, 0).astimezone()


class BackendSinkTests(unittest.TestCase):
    def make_sink(self, port, password="pw"):
        logs = []
        sink = BackendSink(
            f"http://127.0.0.1:{port}/api", "hub", password, soldier_ids=["IA-SLD-1923"],
            send_interval_s=3600, log=logs.append,  # we call send_now() ourselves
        )
        self.addCleanup(sink.stop_event.set)
        return sink, logs

    def test_sends_summaries_alerts_and_restart_note(self):
        server = start_server()
        self.addCleanup(server.shutdown)
        sink, logs = self.make_sink(server.server_port)
        sink.on_summary([device_summary(hr=81)], FakeHub())
        sink.on_alert(Alert("node-01", "IA-SLD-1923", "fall", "critical", "Possible fall", "m"))
        sink.on_alert(Alert("node-01", None, "fall", "critical", "No soldier -> not sent", "m"))
        self.assertTrue(sink.send_now())
        batch = server.batches[0]
        self.assertEqual(batch["resolveOpenAlerts"], ["IA-SLD-1923"])
        self.assertEqual(batch["summaries"][0]["hr"], 81)
        self.assertEqual(batch["summaries"][0]["posture"], "lying")
        self.assertEqual([a["key"] for a in batch["alerts"]], ["fall"])
        self.assertNotIn("samples", json.dumps(batch))  # never raw ECG
        # Second batch: no restart note any more.
        sink.on_summary([device_summary()], FakeHub())
        sink.send_now()
        self.assertNotIn("resolveOpenAlerts", server.batches[1])
        self.assertIn("connected", logs[-1])

    def test_replay_is_marked_in_summaries_and_alerts(self):
        server = start_server()
        self.addCleanup(server.shutdown)
        sink, _ = self.make_sink(server.server_port)
        replay_hub = FakeHub()
        replay_hub.replaying = True
        sink.on_summary([device_summary()], replay_hub)
        sink.on_alert(Alert("node-01", "IA-SLD-1923", "fall", "critical", "Possible fall", "m", replay=True))
        sink.send_now()
        batch = server.batches[0]
        self.assertTrue(batch["summaries"][0]["replay"])
        self.assertTrue(batch["alerts"][0]["replay"])

    def test_disconnected_summary_sends_no_old_values(self):
        s = summary_for_backend(device_summary(hr=81, connected=False), FakeHub.wall_now())
        self.assertEqual((s["connected"], s["hr"], s["posture"], s["activity"]), (False, None, None, None))

    def test_backend_down_keeps_data_then_sends_it(self):
        server = start_server()
        port = server.server_port
        server.shutdown()
        server.server_close()
        sink, logs = self.make_sink(port)
        for hr in (60, 61, 62):
            sink.on_summary([device_summary(hr=hr)], FakeHub())
        self.assertFalse(sink.send_now())
        self.assertFalse(sink.send_now())
        self.assertEqual(len(sink.summaries), 3)
        self.assertEqual(sum("not reachable" in line for line in logs), 1)  # said once, not every retry
        # Backend comes back on the same port.
        server = HTTPServer(("127.0.0.1", port), FakeDjango)
        server.logins, server.batches, server.mode = 0, [], "ok"
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.shutdown)
        sink.on_summary([device_summary(hr=63)], FakeHub())
        self.assertTrue(sink.send_now())
        self.assertEqual([s["hr"] for s in server.batches[0]["summaries"]], [60, 61, 62, 63])  # in order

    def test_wrong_password_is_explained(self):
        server = start_server()
        self.addCleanup(server.shutdown)
        sink, logs = self.make_sink(server.server_port, password="wrong")
        sink.on_summary([device_summary()], FakeHub())
        self.assertFalse(sink.send_now())
        self.assertIn("HUB_PASSWORD", logs[-1])
        self.assertEqual(len(sink.summaries), 1)  # kept for later

    def test_expired_token_logs_in_again(self):
        server = start_server()
        self.addCleanup(server.shutdown)
        sink, _ = self.make_sink(server.server_port)
        sink.on_summary([device_summary()], FakeHub())
        sink.send_now()
        server.mode = "expire"
        sink.on_summary([device_summary(hr=90)], FakeHub())
        self.assertFalse(sink.send_now())  # 401 -> forget token
        self.assertTrue(sink.send_now())  # logs in again and sends
        self.assertEqual(server.logins, 2)
        self.assertEqual(server.batches[-1]["summaries"][0]["hr"], 90)

    def test_rejected_batch_is_dropped_not_retried_forever(self):
        server = start_server()
        self.addCleanup(server.shutdown)
        sink, logs = self.make_sink(server.server_port)
        server.mode = "reject"
        sink.on_summary([device_summary()], FakeHub())
        sink.send_now()
        self.assertEqual(len(sink.summaries), 0)
        self.assertIn("rejected", logs[-1])


if __name__ == "__main__":
    unittest.main()
