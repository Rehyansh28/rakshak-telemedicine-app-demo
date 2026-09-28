# Rakshak real-sensor-data project: context

Updated at the end of each phase. **Last update: merge preparation (branch ready to merge into `main`).**
Branch: `claude/rakshak-real-sensor-data-phbaso` → `main` (the team merges it; see `PR_DESCRIPTION.md`).

## Goal and rules
- **Team:** 3 students. Keep it simple and reliable. The first demo (28 Sep 2026: videos + REPLAY of `real_90s.txt`) is done.
- **Goal:** replace the dummy vitals with real ESP32 data:
  - AD8232 ECG, 250 samples/s;
  - M5Stack MPU6886 IMU (±8 g, ±2000 dps), 100 samples/s;
  - JSON lines over USB at 921600 baud.
- **Architecture:** ESP32 → USB → Python **hub** (`hub/`) → live stream to React (`/live`) + summaries/alerts to Django (`/api/hub/ingest/`).
- **Where it runs:** everything on one Mac (local setup); a Raspberry Pi will be the hub later. The GitHub Pages website has no hub.
- **Rules:**
  - go phase by phase and stop for OK;
  - small changes, don't break existing features;
  - never run `seed_demo` or delete `db.sqlite3` without asking;
  - only essential new libraries, pinned;
  - commit often;
  - label EXPERIMENTAL (live sensor), REPLAY (recording), SIMULATED (dummy).

## Environment
- **How we work:** Claude works in a cloud container (no access to the ESP32). The team runs commands on the demo Mac and pastes the output back.
- **ESP32 port:** `/dev/cu.usbserial-0001` (CP2102). **Firmware:** 0.1.0 on the board (both recordings report it; a 0.1.1 was planned but never confirmed on the board). ESP32 firmware source is not in the repo - the original 0.1.0 sketch was lost. The board still runs it; `real_90s.txt` was recorded with it. It will be rewritten (0.1.2, with the I2C/IMU/ADC fixes), flashed and tested in the next hardware session.
- **IMU:** taped flat on the chest, label facing out. **`+z` confirmed** from real_90s.txt (lying on the back: gravity az ≈ +1.07). Upright calibration: gravity (0.02, 0.98, 0.2) → y axis up.
- **Default soldier:** `node-01 → IA-SLD-1923` (`hub/config.ini` `[devices]`).
- **Sensor demo URL:** local only, http://127.0.0.1:5555 (`npm run dev`). The GitHub Pages site makes no hub requests and shows "Sensor hub not connected" + SIMULATED values.

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
- **Hub:** 45 tests (Python 3.9 / 3.11 / 3.13), including a regression test on real_90s.txt.
- **Backend:** 29 tests (Django 6.1).
- **Frontend:** builds; 14 old lint errors in files the branch does not change (`main` has 15), none new.
- **End to end:** Playwright in a real browser, on replay and on a virtual serial port (live, unplug/replug).

- **Real data:** `hub/recordings/real_90s.txt` (28 Sep, good) and `real_60s_bad_wiring.txt` (24 Sep, first test before the wiring was fixed: flat/clipping ECG, 395 junk lines):
  - ECG 100 % present, HR ~100-110 standing / ~75-85 lying, confirmed by our own R-peak count; clipping < 1.5 %;
  - IMU only 49 % present: two ~22 s dropouts when moving/lying (loose I2C jumper wires; >4,000 read errors);
  - posture correct where data exists; peak |a| 1.43 g, so no false falls; **thresholds unchanged** (good margins);
  - both files report firmware "0.1.0" (the version on the board);
  - explained for the professor in `REAL_DATA_REPORT.md`.
- **IMU-gap handling:** a gap (> `imu_gap_s` = 0.5 s) resets only the still/no-movement timers and pending falls; posture is kept and shown as "last known · no motion data N s"; one "Motion sensor data missing" alert per dropout (clears only after 3 s of steady data); stale posture is not stored in Django; a no-movement alert is never resolved by a gap.
- **Demo (28 Sep, done):** videos of the live session + REPLAY of `real_90s.txt` in the web app. DEMO.md now describes this as a general "Quick demo: replay a real recording".
- **Merge preparation:**
  - checked production safety by building exactly like `deploy.yml` and serving it like GitHub Pages, against `main`'s backend on an un-migrated database and against this branch's backend after `migrate`;
  - found: the website polled the hub (`/live`, ~23 failed requests/min/tab) and `/sensor/` → fixed: the hub stream and `/sensor/` only run with `npm run dev` or a build with `VITE_HUB_URL`; elsewhere a grey "Sensor hub not connected" badge; alerts refresh every 30 s there (4 s with the hub);
  - migrations 0006/0007 are add-only (tested on a 0005 database copy, rollback to 0005 works); the new backend code gives 500s until `migrate` runs → **migrate before the new backend serves**;
  - removed `hub/live_test.log` from git; renamed `real_60s.txt` → `real_60s_bad_wiring.txt`;
  - docs made general and correct before/after the merge; `PR_DESCRIPTION.md` has the server steps (persistent `db.sqlite3` check, backup, migrate, merge, check) and the known issues already on `main` (TURN passwords in `AppContext.jsx`, default `SECRET_KEY`, unpinned backend requirements, entrypoint seed check after `migrate`) - not fixed on this branch;
  - re-tested: production-like tour (no failing requests, badge shown, all logins/pages OK) and the local setup (`npm run dev` + replay of `real_90s.txt`: REPLAY badge, ECG, HR, posture, alerts).

## Still open
- **Waiting on the team:**
  - firmware: ESP32 firmware source is not in the repo - the original 0.1.0 sketch was lost. The board still runs it; `real_90s.txt` was recorded with it. It will be rewritten (0.1.2, with the I2C/IMU/ADC fixes), flashed and tested in the next hardware session.;
  - a recording with **side** lying and a 30 s still period *with* IMU data (not captured yet) to check side detection and the no-movement alert on real data;
  - hardware fix for the IMU connection (see REAL_DATA_REPORT.md).
- **Left for later:** AR Diagnostic, Organ Detail, AI Insights / Report charts, an "acknowledge alert" button.
- **Merge:** the team opens the PR (text in `PR_DESCRIPTION.md`), runs the server steps, merges; later the same into the original project repo.
