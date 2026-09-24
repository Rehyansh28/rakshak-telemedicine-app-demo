"""Send per-second summaries and alerts to the Django backend (POST /api/hub/ingest/).

Runs in a background thread, so a slow or stopped backend never delays reading the
ESP32. While Django is not reachable, data is kept (the newest ~15 minutes) and sent
when it is back. The raw ECG waveform is never sent to Django.

The hub logs in like a person: with a Medical Staff account (username + password in
hub/.env), via POST /api/auth/staff/login/.
"""
from __future__ import annotations

import json
import os
import threading
import urllib.error
import urllib.request
from collections import deque

MAX_BUFFERED_SUMMARIES = 900  # 15 minutes at one per second
MAX_BUFFERED_ALERTS = 500
MAX_RETRY_DELAY_S = 30.0

# Only local / LAN backends: never go through a proxy configured on the computer.
_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def load_env_file(path):
    """Read KEY=VALUE lines (like hub/.env). Real environment variables win."""
    values = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip('"').strip("'")
    for key in ("HUB_USERNAME", "HUB_PASSWORD"):
        if os.environ.get(key):
            values[key] = os.environ[key]
    return values


def summary_for_backend(s, when):
    """Turn one device summary into the small record Django stores."""
    ecg = s.get("ecg") or {}
    imu = s.get("imu") or {}
    live = s["connected"]
    return {
        "soldierId": s["soldierId"],
        "dev": s["dev"],
        "time": when.isoformat(),
        "connected": live,
        # When the sensor is disconnected, nothing it said before is current any more.
        "hr": ecg.get("hr") if live else None,
        "ecgSignal": ecg.get("signal") if live else None,
        "leadsOff": ecg.get("leadsOff") if live else None,
        "posture": imu.get("posture") if live else None,
        "lyingSide": imu.get("lyingSide") if live else None,
        "activity": imu.get("activity") if live else None,
    }


class LoginFailed(Exception):
    pass


class BackendSink:
    def __init__(self, base_url, username, password, soldier_ids=(), send_interval_s=1.0, log=print):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.send_interval_s = send_interval_s
        self.log = log
        self.token = None
        # Sent once after start: closes hub alerts left open by an earlier run.
        self.resolve_on_start = sorted(set(soldier_ids))
        self.summaries = deque(maxlen=MAX_BUFFERED_SUMMARIES)
        self.alerts = deque(maxlen=MAX_BUFFERED_ALERTS)
        self.lock = threading.Lock()
        self.stop_event = threading.Event()
        self.sent_summaries = 0
        self.sent_alerts = 0
        self.unknown_reported = set()
        self._last_state = None
        self.thread = threading.Thread(target=self._run, name="backend-sender", daemon=True)
        self.thread.start()

    # ----- sink interface (called by the hub) -----

    def on_ignored_line(self, line):
        pass

    def on_summary(self, summaries, hub):
        when = hub.wall_now()
        with self.lock:
            for s in summaries:
                if s["soldierId"]:
                    self.summaries.append(summary_for_backend(s, when))

    def on_alert(self, alert):
        if not alert.soldier_id:
            return
        with self.lock:
            self.alerts.append({
                "soldierId": alert.soldier_id,
                "dev": alert.dev,
                "key": alert.key,
                "level": alert.level,
                "title": alert.title,
                "message": alert.message,
                "time": alert.time.isoformat(),
                "resolved": alert.resolved,
            })

    # ----- sending -----

    def _state(self, state, text):
        """Log only when the connection state changes (no spam every second)."""
        if state != self._last_state:
            self._last_state = state
            self.log(text)

    def _post(self, path, body, token=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Token {token}"
        request = urllib.request.Request(
            self.base_url + path, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST"
        )
        with _OPENER.open(request, timeout=5) as response:
            return json.loads(response.read() or b"{}")

    @staticmethod
    def _detail(error):
        try:
            return json.loads(error.read()).get("detail", "")
        except Exception:  # noqa: BLE001 - only used for a friendlier message
            return ""

    def _login(self):
        try:
            data = self._post("/auth/staff/login/", {"username": self.username, "password": self.password})
        except urllib.error.HTTPError as exc:
            if exc.code in (400, 401, 403):
                raise LoginFailed(self._detail(exc) or f"HTTP {exc.code}") from None
            raise
        self.token = data["token"]

    def send_now(self):
        """Try once to send everything waiting. Returns True when nothing is left unsent."""
        with self.lock:
            summaries, alerts = list(self.summaries), list(self.alerts)
            self.summaries.clear()
            self.alerts.clear()
        body = {"summaries": summaries, "alerts": alerts}
        if self.resolve_on_start:
            body["resolveOpenAlerts"] = self.resolve_on_start
        if not summaries and not alerts and not self.resolve_on_start:
            return True
        try:
            if self.token is None:
                self._login()
            result = self._post("/hub/ingest/", body, self.token)
        except LoginFailed as exc:
            self._put_back(summaries, alerts)
            self._state(
                "login",
                f"Backend: hub login as '{self.username}' failed ({exc}). Check HUB_USERNAME / HUB_PASSWORD "
                "in hub/.env and that this is a Medical Staff account in Super Admin. Retrying...",
            )
            return False
        except urllib.error.HTTPError as exc:
            if exc.code != 400:
                self._put_back(summaries, alerts)
            if exc.code in (401, 403):
                self.token = None  # log in again next time
                self._state("forbidden", f"Backend refused the hub ({exc.code}: {self._detail(exc)}). Retrying...")
            elif exc.code == 400:
                # Bad data would be refused forever: drop this batch (it is not put back) so newer data goes through.
                self.log(f"Backend rejected a batch as invalid (dropped): {exc.read()[:300]!r}")
                return True
            else:
                self._state("error", f"Backend error HTTP {exc.code}. Data is kept and sent later. Retrying...")
            return False
        except (urllib.error.URLError, OSError, ValueError) as exc:
            self._put_back(summaries, alerts)
            self._state(
                "down",
                f"Backend not reachable at {self.base_url} ({getattr(exc, 'reason', exc)}). Is Django running "
                "(python manage.py runserver)? Data is kept and sent when it is back. Retrying...",
            )
            return False

        self.resolve_on_start = []
        self.sent_summaries += len(summaries)
        self.sent_alerts += len(alerts)
        self._state("ok", f"Backend: connected to {self.base_url} as '{self.username}', sending summaries and alerts.")
        for soldier in result.get("unknownSoldiers", []):
            if soldier not in self.unknown_reported:
                self.unknown_reported.add(soldier)
                self.log(
                    f"Backend does not know soldier '{soldier}'. Fix the [devices] section in config.ini "
                    "(see the IDs in Super Admin -> Soldiers)."
                )
        return True

    def _put_back(self, summaries, alerts):
        """Keep unsent data in front of anything newer (oldest is dropped if the buffer is full)."""
        with self.lock:
            newer_s, newer_a = list(self.summaries), list(self.alerts)
            self.summaries.clear()
            self.alerts.clear()
            self.summaries.extend(summaries + newer_s)
            self.alerts.extend(alerts + newer_a)

    def _run(self):
        delay = self.send_interval_s
        while not self.stop_event.wait(delay):
            ok = self.send_now()
            delay = self.send_interval_s if ok else min(MAX_RETRY_DELAY_S, max(2.0, delay * 2))

    def close(self):
        """Stop the thread and try one last time to send what is left."""
        self.stop_event.set()
        self.thread.join(timeout=6)
        if not self.send_now():
            with self.lock:
                left = len(self.summaries) + len(self.alerts)
            self.log(f"Backend: {left} summaries/alerts could not be sent before stopping.")
