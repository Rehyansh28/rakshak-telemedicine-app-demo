# Rakshak real-sensor-data project: context

Updated at the end of each phase. **Last update: Phase 4 follow-up (26 Sep 2026).**
Branch: `claude/rakshak-real-sensor-data-phbaso` (never `main`).

## Goal and rules
- **Team and deadline:** 3 students, **demo deadline Monday 28 Sep 2026**. Keep it simple and reliable.
- **Goal:** replace the dummy vitals with real ESP32 data:
  - AD8232 ECG, 250 samples/s;
  - M5Stack MPU6886 IMU (±8 g, ±2000 dps), 100 samples/s;
  - JSON lines over USB at 921600 baud.
- **Architecture:** ESP32 → USB → Python **hub** (`hub/`) → live stream to React (`/live`) + summaries/alerts to Django (`/api/hub/ingest/`).
- **Where it runs:** everything on one Mac for the demo; a Raspberry Pi will be the hub later.
- **Rules:**
  - go phase by phase and stop for OK;
  - small changes, don't break existing features;
  - never run `seed_demo` or delete `db.sqlite3` without asking;
  - only essential new libraries, pinned;
  - commit often;
  - label EXPERIMENTAL (live sensor), REPLAY (recording), SIMULATED (dummy).

## Environment
- **How we work:** Claude works in a cloud container (no access to the ESP32). The team runs commands on the demo Mac and pastes the output back.
- **ESP32 port:** `/dev/cu.usbserial-0001` (CP2102). **Firmware:** 0.1.1 (retries starting the IMU, silences ESP-IDF log messages).
- **IMU:** taped flat on the chest, label facing out; `chest_normal_axis = +z` is assumed, and confirming it is still pending.
- **Default soldier:** `node-01 → IA-SLD-1923` (`hub/config.ini` `[devices]`).
- **Demo URL:** local only, http://127.0.0.1:5555 (the GitHub Pages site can't reach the hub).

## What was built
- **Phase 0 (report):** found the dummy data sources:
  - the jitter endpoint (every 3 s, saved random HR into the database);
  - `generateEcgPoints` / seeded `ecg_points`;
  - the fake sensor progress bar.
- **Phase 1 (hub, only `pyserial==3.5`):**
  - serial auto-detect, reconnect, and a BUSY message;
  - one handler per message type;
  - IMU calibration, posture, activity, fall and no-movement detection (thresholds in `config.ini`);
  - `record` / `replay`;
  - an ECG signal-quality check (flat / near the ends / clipping → heart rate hidden, "ECG signal poor" alert).
  - **Real test run showed:** a loose AD8232 power/ground wire (flat ECG with a stale bpm) and loose IMU wires (503 errors). The team is fixing the wiring.
- **Phase 2 (backend):**
  - `VitalSummary` table (1 row per second, no raw ECG);
  - 4 optional fields on `EmergencyAlert`;
  - `POST /api/hub/ingest/` (medical-staff login) and `GET /api/patients/<id>/sensor/`;
  - jitter no longer overwrites a real heart rate;
  - migration 0006 (adds only).
- **Phase 3 (frontend):**
  - a live SSE stream from the hub (port 8765, Vite proxy `/live`);
  - canvas live ECG, live HR and posture, status badges, auto-refreshing alerts with toasts, on **Command Center, Live Consultation, Staff Waiting Room**.
- **Phase 4:**
  - **REPLAY mode:** the hub marks everything made from a recording; the app shows a violet "Replay · recorded data" and REPLAY tags instead of "Live sensor"; Django stores replay alerts as `hub-replay` and patient label "REPLAY (recorded)"; migration 0007 (adds only);
  - `python manage.py resolve_sensor_alerts` (and `--delete`, which asks first);
  - simulated SpO2 hovers between 95 and 99%;
  - soldier cards tag their heart rate;
  - DEMO.md, README updates, fixes found by end-to-end tests.
- **Phase 4 follow-up (approved changes):**
  - DEMO.md now has a one-time setup (section 0), a "day before" update followed by a **code freeze** (no `git pull` on demo day), **battery-only safety** (no charger, projector or other mains cable while electrodes are on; electrodes off before plugging the charger back in), and how to record and commit `real_90s.txt`;
  - the Sensor Connection page shows the real hub status for the sensor soldier and labels the fake pairing animation SIMULATED.

## Bugs found and fixed along the way
- `replay --loop` flooded "Sensor disconnected" alerts (loop offset added twice). Regression test added.
- The live-view ECG froze for up to ~10 s after an ESP32 restart (sequence numbers restarting looked like duplicates).
- Viewer registration in the live server; backend heart rate taken from the newest summary that has one.

## Tests
- **Hub:** 39 tests (Python 3.9 / 3.11 / 3.13).
- **Backend:** 29 tests (Django 6.1).
- **Frontend:** builds; 14 old lint errors in untouched files, none new.
- **End to end:** Playwright in a real browser, on replay and on a virtual serial port (live, unplug/replug).

## Still open
- **Waiting on the team:**
  - firmware `firmware/rakshak_node/rakshak_node.ino` (check the repeated IMU-tail lines);
  - `real_60s.txt` + `real_90s.txt` (with lying down) → tune activity/posture/no-movement thresholds, confirm `+z`;
  - Mac outputs of the Phase 2–4 steps.
- **Left for later:** AR Diagnostic, Organ Detail, AI Insights / Report charts, an "acknowledge alert" button.
