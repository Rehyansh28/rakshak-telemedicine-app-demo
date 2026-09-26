# Rakshak Telemedicine App

Tactical telemedicine platform for high-altitude soldier health monitoring, doctor command center, patient bio-suit flows, and super-admin data management. Built as a **React (Vite)** frontend and **Django REST** backend with **SQLite**.

Developed in collaboration with **IIT Jodhpur**, Department of Computer Science and Engineering.

> **Real sensor data (EXPERIMENTAL):** an ESP32 with an ECG (AD8232) and a motion sensor
> (MPU6886) feeds live heart rate, ECG, posture and alerts into the app through the
> [`hub/`](hub/README.md). For demo day follow **[DEMO.md](DEMO.md)**. This is a student
> prototype, not a medical device: real values are tagged EXPERIMENTAL, recorded ones
> REPLAY, dummy ones SIMULATED.

---

## Table of contents

- [Architecture](#architecture)
- [Real sensor data (hub)](#real-sensor-data-hub)
- [Prerequisites](#prerequisites)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Backend setup](#backend-setup)
- [Frontend setup](#frontend-setup)
- [Environment variables](#environment-variables)
- [Ports and URLs](#ports-and-urls)
- [User roles and login](#user-roles-and-login)
- [Super Admin console](#super-admin-console)
- [Database commands](#database-commands)
- [API overview](#api-overview)
- [Production build](#production-build)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────┐         HTTP (JSON)          ┌─────────────────────┐
│  React + Vite       │  ──────────────────────────► │  Django REST API    │
│  http://127.0.0.1:  │         /api/*               │  http://127.0.0.1:  │
│       5555          │                              │       8555          │
└─────────────────────┘                              └──────────┬──────────┘
                                                                │
                                                                ▼
                                                     ┌─────────────────────┐
                                                     │  SQLite (db.sqlite3) │
                                                     └─────────────────────┘
```

With the sensor hub (EXPERIMENTAL):

```
ESP32 (ECG + IMU) --USB--> hub/ (Python, :8765) --live ECG, HR, posture, alerts (/live)--> React
                                                --1 summary/s + alerts (/api/hub/ingest/)--> Django
```

The browser only talks to Vite (:5555); Vite forwards `/api` to Django and `/live` to the hub.

- **Frontend**: React 19, React Router, Tailwind CSS 4, Three.js (AR body), Recharts (charts), a canvas live ECG.
- **Backend**: Django 6, Django REST Framework, Token authentication, Channels/Daphne (video-call signalling).
- **Hub**: Python 3.9+ with `pyserial` - reads the ESP32, see [`hub/README.md`](hub/README.md).
- **Database**: SQLite file at `backend/db.sqlite3` (no separate DB server required for development).

---

## Prerequisites

Install these on any machine before cloning:

| Tool | Version | Check |
|------|---------|--------|
| **Node.js** | 18+ (20+ recommended) | `node -v` |
| **npm** | 9+ | `npm -v` |
| **Python** | **3.12+** for the backend (Django 6); 3.9+ is enough for the hub | `python3 --version` |
| **pip** | latest | `pip3 --version` |
| **Git** | any | `git --version` |

Optional: `curl` for quick API checks.

---

## Project structure

```
rakshak-telemedicine-app/
├── README.md                 ← this file
├── DEMO.md                   ← demo-day runbook (startup order, checklist, backup plan)
├── hub/                      ← reads the ESP32 sensors (see hub/README.md)
├── backend/
│   ├── config/               # Django settings, root URLs
│   ├── core/                 # Models, API views, admin API, seed command
│   ├── manage.py             # Defaults runserver to port 8555
│   ├── requirements.txt
│   └── db.sqlite3            # Created after migrate (gitignored)
└── frontend/
    ├── public/               # Logos and static assets
    ├── src/
    │   ├── api/              # HTTP client + auth tokens
    │   ├── pages/            # App screens + SuperAdminPage
    │   ├── routes/           # React Router paths
    │   └── components/
    ├── .env.example
    ├── vite.config.js        # Dev server port 5555, API proxy
    └── package.json
```

---

## Quick start

Run **backend** and **frontend** in two terminals.

### Terminal 1 — Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py seed_demo         # ONLY on a new, empty database: it WIPES existing data
python3 manage.py runserver       # starts on http://127.0.0.1:8555
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
cp .env.example .env              # Windows: copy .env.example .env
npm run dev                       # starts on http://127.0.0.1:5555
```

Open in browser:

- **App home**: http://127.0.0.1:5555/
- **Super Admin**: http://127.0.0.1:5555/superadminuser
- **Doctor login**: http://127.0.0.1:5555/doctor/login

### Terminal 3 - Sensor hub (optional)

See [`hub/README.md`](hub/README.md) (one-time setup) and [DEMO.md](DEMO.md). Without the
hardware, `python hub.py replay recordings/simulated_demo.txt --loop` plays SIMULATED data.

---

## Backend setup

### 1. Create virtual environment

**macOS / Linux:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

**Windows (PowerShell):**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

Packages installed (not pinned to exact versions): `Django` (6.x, needs Python 3.12+),
`djangorestframework`, `django-cors-headers`, `daphne`, `channels`, `channels-redis`.

### 3. Apply database migrations

```bash
python3 manage.py migrate
```

This creates `backend/db.sqlite3` with all tables (users, doctors, patients, alerts, reports, etc.).

### 4. Load demo data (only for a brand-new database)

```bash
python3 manage.py seed_demo
```

⚠️ This **deletes all existing app data** (patients, doctors, alerts, reports...) and loads
sample data and default accounts (see [User roles](#user-roles-and-login)). Never run it on a
database you want to keep - back up `db.sqlite3` first.

### 5. Start the API server

```bash
python3 manage.py runserver
```

`manage.py` is configured to use port **8555** when you run `runserver` without a port argument.

Verify the API:

```bash
curl http://127.0.0.1:8555/api/config/
```

You should get JSON with `secureNode` and `uplinkData`.

### Django admin (optional)

Create a Django superuser for `/admin/`:

```bash
python3 manage.py createsuperuser
```

Then visit: http://127.0.0.1:8555/admin/

---

## Frontend setup

### 1. Install Node dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment

Copy the example env file:

```bash
cp .env.example .env
```

Default content:

```env
VITE_API_BASE_URL=/api
```

`/api` goes through the Vite dev server, which forwards it to Django on port 8555 (and
`/live` to the sensor hub on 8765). Keep it like this for local use - it avoids CORS problems.

### 3. Start development server

```bash
npm run dev
```

Vite is configured to:

- Listen on **127.0.0.1:5555** (IPv4 — avoids macOS `localhost` / `::1` issues)
- Proxy `/api` → `http://localhost:8555` when using relative API paths

### 4. Other scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

---

## Environment variables

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Base URL for all API calls | `/api` |
| `VITE_PROXY_TARGET` | (shell variable for `npm run dev`) where Vite forwards `/api` | `http://127.0.0.1:8555` |
| `VITE_HUB_TARGET` | (shell variable for `npm run dev`) where Vite forwards `/live` | `http://127.0.0.1:8765` |

Restart `npm run dev` after changing `.env`.

### Backend

No `.env` file is required for local development. Settings in `backend/config/settings.py`
can be changed with environment variables:

- `DEBUG` - default `False` (set `DEBUG=True` to see error pages)
- `ALLOWED_HOSTS` - default `localhost,127.0.0.1`
- `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` - empty by default (not needed with the Vite proxy)
- Database: SQLite at `backend/db.sqlite3`

The sensor hub has its own settings in `hub/config.ini` and its login in `hub/.env`.

---

## Ports and URLs

| Service | URL | Notes |
|---------|-----|--------|
| Frontend (Vite) | http://127.0.0.1:5555 | Use this URL in the browser |
| Backend API | http://127.0.0.1:8555/api/ | REST JSON API |
| Django admin | http://127.0.0.1:8555/admin/ | After `createsuperuser` |
| Sensor hub live stream | http://127.0.0.1:8765/live/health | While `hub.py` runs |

Custom backend port:

```bash
python3 manage.py runserver 9000
```

Start the frontend with the new target:

```bash
VITE_PROXY_TARGET=http://127.0.0.1:9000 npm run dev
```

---

## User roles and login

### After `seed_demo`

| Role | Where to log in | Username | Password |
|------|-----------------|----------|----------|
| **Doctor** | `/doctor/login` | `doctor` | `rakshak2026` |
| **Medical Staff** | `/staff/login` | `fieldmedic` | `rakshak2026` |
| **Super Admin** | `/superadminuser` | `superadmin` | `rakshak2026` |

Login accepts **username or email** plus password.

### Medical staff flow

Soldiers do not log in. From the home screen, choose **Medical Staff View** → sign in at `/staff/login` → register or select a soldier → sensor → camera → waiting room.

### Doctor login notes

- Doctor accounts are created under **Doctors** in Super Admin.
- Medical staff accounts are created under **Medical Staff** in Super Admin.
- Use the **Username** field from Super Admin, or the **email** if it was saved on the user.
- If login returns “not registered as a doctor”, the user exists but has no `Doctor` profile — create/fix it in Super Admin → Doctors.

---

## Super Admin console

URL: **http://127.0.0.1:5555/superadminuser**

Sign in with a staff/superuser account (`superadmin` after `seed_demo`, or any user with `is_staff` / `is_superuser`).

### Sidebar sections

| Section | Manage |
|---------|--------|
| **Overview** | Stats, recent activity, recent alerts |
| **Doctors** | Create/edit/delete doctors + login credentials |
| **Medical Staff** | Create/edit/delete medical staff + login credentials |
| **Soldiers** | Full vitals (no portal login), view nested data |
| **Alerts** | Emergency alerts |
| **Activity** | Activity log entries |
| **Reports** | Medical reports |
| **AI Tips** | AI recommendations |
| **Queue** | Consultation queue |
| **System** | Secure node + uplink JSON config |

Patient **View** opens full detail: alerts, sensor steps, AI insights, organs, reports, queue.

---

## Database commands

| Goal | Command |
|------|---------|
| Create tables | `python3 manage.py migrate` |
| Load demo data | `python3 manage.py seed_demo` |
| **Wipe all data** | Delete `backend/db.sqlite3`, then `python3 manage.py migrate` |
| Reset + demo | `python3 manage.py seed_demo` (⚠️ deletes app data first) |
| Back up the database | `cp db.sqlite3 ~/Desktop/db-backup-$(date +%Y%m%d-%H%M).sqlite3` |
| Close all sensor alerts (safe) | `python3 manage.py resolve_sensor_alerts` |
| Delete all sensor alerts (asks first) | `python3 manage.py resolve_sensor_alerts --delete` |

`seed_demo` removes doctors, patients, alerts, reports, etc., then reloads demo content. It does not remove Django’s built-in tables.

---

## API overview

Base path: `http://127.0.0.1:8555/api/`

### Public / app

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login/` | Doctor login → `{ token, doctor }` |
| POST | `/auth/staff/login/` | Medical staff login → `{ token, staff }` |
| GET | `/config/` | System config |
| GET | `/patients/` | Patient list |
| GET | `/patients/<soldier_id>/` | Patient detail |
| GET | `/emergency-alerts/` | Alerts |
| GET | `/activity/` | Activity log |
| GET | `/dashboard/stats/` | Dashboard counts |
| GET | `/patients/<soldier_id>/sensor/` | Latest sensor summary + recent history (EXPERIMENTAL) |

### Sensor hub (medical staff login)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/hub/ingest/` | Hub sends 1 summary per second + alerts (never the raw ECG) |

### Super Admin (requires admin token)

Header: `Authorization: Token <admin_token>`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/superadmin/login/` | Admin login |
| GET | `/admin/overview/` | Dashboard summary |
| GET/POST | `/admin/doctors/` | List / create doctors |
| GET/PATCH/DELETE | `/admin/doctors/<id>/` | Doctor detail |
| GET/POST | `/admin/medical-staff/` | List / create medical staff |
| GET/PATCH/DELETE | `/admin/medical-staff/<id>/` | Medical staff detail |
| GET/POST | `/admin/patients/` | List / create soldiers (no login credentials) |
| GET/PATCH/DELETE | `/admin/patients/<soldier_id>/` | Patient + nested data |
| GET/POST | `/admin/alerts/` | Emergency alerts |
| GET/POST | `/admin/activity/` | Activity logs |
| GET | `/admin/reports/` | Medical reports |
| GET/PATCH | `/admin/system-config/` | System settings |

Full route list: `backend/core/urls.py`

---

## Production build

### Frontend

```bash
cd frontend
npm run build
```

Serve the `frontend/dist/` folder with any static host (Nginx, Vercel, etc.). Set `VITE_API_BASE_URL` at **build time** to your production API URL.

Pushes to `main` are deployed to GitHub Pages by `.github/workflows/deploy.yml` (API:
`https://api.rakshak.online/api`). The live sensor view needs the local hub and the Vite
proxy, so **run the sensor demo locally** (`npm run dev`), not on the website.

### Backend

For production you should:

1. Set `DEBUG = False` and configure `SECRET_KEY`, `ALLOWED_HOSTS`, and HTTPS.
2. Use PostgreSQL or another production database instead of SQLite.
3. Run with Gunicorn/uWSGI behind a reverse proxy.
4. Collect static files and configure CORS for your frontend domain only.

This repository is optimized for **local development**; production hardening is not pre-configured.

---

## Troubleshooting

### Frontend shows `ERR_EMPTY_RESPONSE` on localhost:5555

- Ensure `npm run dev` is running and not stopped.
- Open **http://127.0.0.1:5555/** (not only `localhost`) — Vite binds to IPv4 by design.

### `ModuleNotFoundError: No module named 'django'`

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Doctor login: “Invalid credentials”

1. Run `python3 manage.py seed_demo` or create a doctor in Super Admin → **Doctors**.
2. Log in with **username** (e.g. `doctor`) or **email**, not a wrong field.
3. Restart the backend after code changes.

### Doctor login: “not registered as a doctor”

The user exists but has no `Doctor` record. Create the account under Super Admin → **Doctors**, not only Patients.

### CORS errors in browser

- `frontend/.env` must say `VITE_API_BASE_URL=/api` (so calls go through the Vite proxy).
- Backend must be running on port **8555**.

### Sensor data not showing

See the troubleshooting tables in [DEMO.md](DEMO.md) and [`hub/README.md`](hub/README.md).

### API calls fail (network error)

- Confirm backend: `curl http://127.0.0.1:8555/api/config/`
- Confirm `frontend/.env` has `VITE_API_BASE_URL=/api`
- Restart frontend after editing `.env`.

### Port already in use

```bash
# Find process on 5555 or 8555 (macOS/Linux)
lsof -i :5555
lsof -i :8555
```

Stop the old process or pick another port and update `.env` / `runserver` accordingly.

---

## Real sensor data (hub)

Summary (details in [`hub/README.md`](hub/README.md), demo steps in [DEMO.md](DEMO.md)):

- The hub reads the ESP32 over USB, computes heart rate checks, posture, activity, falls and
  "no movement", streams the live ECG to the app and sends a summary per second + alerts to
  Django. The raw ECG waveform is never stored.
- Pages with live data: Command Center, Live Consultation (doctor), Waiting Room (staff).
  Status badges show live / hub offline / sensor disconnected / electrodes off / ECG signal
  poor / data old; `hub.py replay` shows **REPLAY** instead of live.
- SpO2 and temperature have no sensor yet: they stay dummy values, labelled SIMULATED.
- One-time: create a Medical Staff account for the hub in Super Admin and put its login in
  `hub/.env` (copy `hub/.env.example`).

## License and credits

Prototype for tactical / high-altitude telemedicine scenarios.  
**IIT Jodhpur** — Department of Computer Science and Engineering.

For backend-only notes, see `backend/README.md`.  
For frontend assets and branding, see `frontend/README.md`.
