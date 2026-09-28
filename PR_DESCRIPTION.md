# Real sensor data (ESP32 ECG + IMU) for Rakshak - EXPERIMENTAL

Branch `claude/rakshak-real-sensor-data-phbaso` → `main`.

## ⚠ Server steps - do these first, in this order

**1. BEFORE any redeploy: confirm the production `db.sqlite3` is on persistent storage.**
**Find the file on the server and make sure it survives a rebuild/restart (with
`docker-compose.yml` it lives in the host's `backend/` folder, bind-mounted to `/app`; the
Docker image itself never contains it, see `backend/.dockerignore`). If the file is missing
when the container starts, `backend/docker-entrypoint.sh` runs `migrate` on a new empty
database and is written to run `seed_demo` - either way all production data is replaced.
Do not continue until this is confirmed.**

**2. Back up the database** (in the backend folder on the server) **and copy the backup off
the server:**
**`cp db.sqlite3 db.sqlite3.bak-$(date +%Y%m%d-%H%M)`**

**3. Deploy the new backend code and run the migrations BEFORE it serves traffic:**
**`python manage.py migrate`** → must print
`Applying core.0006_hub_sensor_summaries... OK` and `Applying core.0007_vitalsummary_replay... OK`.
(With Docker, restarting the container runs `migrate` by itself; check the log for those
two lines.) The new backend code on an un-migrated database gives HTTP 500 on
`/api/emergency-alerts/`, the admin overview/alerts and the vitals jitter endpoint.

**4. Restart the backend (daphne) and check the API:**
- **`https://api.rakshak.online/api/patients/` → 200**
- **`https://api.rakshak.online/api/emergency-alerts/` → 200**
- **`https://api.rakshak.online/api/patients/<a soldier id>/sensor/` → 200** (new)
- **`POST https://api.rakshak.online/api/hub/ingest/` without login → 401** (new, staff only)

**5. Merge this PR.** GitHub Actions (`deploy.yml`) builds the frontend and deploys it to
GitHub Pages. Wait for the workflow run to be green.

**6. Check the website** (hard refresh, `Cmd + Shift + R`):
- **doctor login → Command Center: "Priority Patient Vitals" shows the grey badge
  "SENSOR HUB NOT CONNECTED" and SIMULATED tags;**
- **Live Consultation, staff Soldiers → Start → Sensor Connection / Waiting Room open normally;**
- **Super Admin login → Overview and Alerts open;**
- **browser console: no requests to `/live/...` or `/sensor/`, no new red errors.**

**Never run `seed_demo` and never delete `db.sqlite3` on the server.**

**Rollback** (if needed): with the *new* code still in place run
`python manage.py migrate core 0005` (removes only the new table/columns; tested, other data
kept), then deploy the old backend code. Or restore the backup from step 2. The website:
revert the merge commit on `main` (Pages redeploys the old frontend).

Why this order: the new website works with the old backend (tested: no errors, the sensor
parts show "Sensor hub not connected"), but the new backend does **not** work with an
un-migrated database. So the migration always comes before the new backend code serves
requests; merging (the website) can come before or after.

Both migrations only **add** things: nullable columns on `EmergencyAlert` (`source`,
`hub_key`, `created_at`, `resolved_at`) and a new `VitalSummary` table. No table is rebuilt,
no existing row is changed. Tested on a copy of a database at migration 0005: applied
cleanly, all rows kept, rollback to 0005 works. No new Python or npm dependencies for the
backend or frontend.

## What this branch adds

Everything sensor-related is a **student prototype, not a medical device**: real values are
tagged EXPERIMENTAL, recorded ones REPLAY, dummy ones SIMULATED.

**Hub (`hub/`, new, Python 3.9+, only `pyserial==3.5`)** - runs on the laptop next to the
sensor (later a Raspberry Pi), not on the server.
- Reads the ESP32 (AD8232 ECG 250 Hz, MPU6886 IMU 100 Hz, JSON lines at 921600 baud) with
  port auto-detect, reconnect and a clear "port BUSY" message.
- Heart rate with an ECG signal-quality check (flat / stuck / clipping → heart rate hidden,
  "ECG signal poor"), electrodes on/off.
- IMU: upright calibration, posture (upright / leaning / lying + side), activity, fall and
  no-movement alerts; IMU dropouts show the last known posture, marked as such, with one
  alert per dropout and no false fall / no-movement alerts.
- `record` / `replay` (`--loop`, `--speed`); everything from a replay is marked REPLAY.
- Live stream for the web app (Server-Sent Events, `/live/events`), and 1 summary per second
  + alerts to Django. The raw ECG waveform is never stored.
- `config.ini` for all thresholds and the sensor → soldier mapping.

**Backend (`backend/core`)**
- `POST /api/hub/ingest/` (medical-staff login) and `GET /api/patients/<id>/sensor/`.
- New `VitalSummary` model, 4 optional fields on `EmergencyAlert`, migrations 0006 + 0007.
- The vitals jitter no longer overwrites a real heart rate; simulated SpO2 stays in 95-99 %.
- `python manage.py resolve_sensor_alerts` closes sensor alerts (nothing deleted;
  `--delete` asks first).

**Frontend (`frontend/src`)**
- Live ECG graph (canvas), real heart rate and posture, sensor status badges on Command
  Center, Live Consultation and the staff Waiting Room; Sensor Connection shows the real
  status and labels its animation SIMULATED.
- Emergency alerts refresh by themselves with toasts (every 4 s with the hub, 30 s
  without).
- REPLAY is never shown as live (violet badge and tags).
- Where there is no hub (the GitHub Pages build) nothing is requested from a hub; the pages
  show "Sensor hub not connected" and SIMULATED values. The hub is used by `npm run dev`
  (Vite proxies `/live`) or a build with `VITE_HUB_URL`.

**Docs and data**
- `DEMO.md` (runbook: replay without hardware, live hardware, checklists, electrical safety),
  `hub/README.md`, `REAL_DATA_REPORT.md` (what the real recordings showed), README updates.
- Real recordings `hub/recordings/real_90s.txt` (good) and `real_60s_bad_wiring.txt` (first
  test, before the wiring was fixed), plus the SIMULATED `simulated_demo.txt`.

**Firmware:** ESP32 firmware source is not in the repo - the original 0.1.0 sketch was lost. The board still runs it; `real_90s.txt` was recorded with it. It will be rewritten (0.1.2, with the I2C/IMU/ADC fixes), flashed and tested in the next hardware session.

## How to test

**Automated**
```bash
# Hub (Python 3.9+)
cd hub && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
python -m unittest discover -s tests -v             # 45 tests

# Backend (Python 3.12+)
cd backend && source venv/bin/activate
python manage.py test core                           # 29 tests
python manage.py makemigrations --check --dry-run    # "No changes detected"

# Frontend
cd frontend && npm ci && npm run build && npm run lint
```
Results on this branch: hub 45/45 (Python 3.9, 3.11, 3.13), backend 29/29 (Django 5.2 and
6.1), build OK. Lint reports 14 errors, all in files this branch does not change (`main` has
15; the branch fixed one).

**Local, no hardware** (see `DEMO.md`, "Quick demo"): backend `runserver`, frontend
`npm run dev`, then `python hub.py replay recordings/real_90s.txt --loop` in `hub/`. Command
Center shows REPLAY · RECORDED DATA, the moving ECG, heart rate ~100-110 standing and
~75-85 lying, posture Upright → moving → Lying down (back), "last known" during the two IMU
dropouts, and a "Motion sensor data missing" alert (REPLAY).

**Production-like** (done for this PR): built exactly like `deploy.yml`, served like GitHub
Pages, against (a) `main`'s backend on an un-migrated database and (b) this branch's backend
after `migrate`. All logins and pages work in both; no requests to `/live/` or `/sensor/`;
"Sensor hub not connected" shown; the same console messages as `main` (see below).

## Next phase (not in this PR)

- **Firmware rewrite:** ESP32 sketch 0.1.2 with the I2C/IMU/ADC fixes, committed to the repo,
  flashed and tested in the next hardware session.
- **Wiring fixes:** a proper Grove cable for the IMU instead of jumper wires, then soldered
  connections (see `REAL_DATA_REPORT.md`).
- **SpO2 + temperature sensors:** replace the last SIMULATED values (a new hub handler per
  sensor, see `hub/README.md`).
- **Raspberry Pi hub:** run the same hub code on a Pi instead of the laptop.
- **Live data on the website:** make the hub reachable from the deployed site (today it only
  works on the local setup; the website shows "Sensor hub not connected").

## Known issues already on `main` (not changed by this PR)

- `frontend/src/context/AppContext.jsx` contains public TURN server usernames/passwords
  (openrelay) in the source.
- `backend/config/settings.py` falls back to a default `SECRET_KEY` ("dev-only-secret-key")
  when none is set - production must set its own.
- `backend/requirements.txt` has no version pins.
- `docker-entrypoint.sh` checks for a missing `db.sqlite3` only after `migrate` has already
  created it, so its `seed_demo` step does not run as intended (a missing database becomes
  an empty one). See server step 1.
- Also seen on `main` in testing: a 404 for `/api/patients/<id>/medical-report/` and
  "MediaPipe Pose library is not available globally" in the console.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_014kgPXqwoDo583kHehNpoEy
