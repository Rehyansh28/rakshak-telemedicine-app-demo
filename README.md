# Rakshak Telemedicine App

Tactical telemedicine platform for high-altitude soldier health monitoring, doctor command center, patient bio-suit flows, and super-admin data management. Built as a **React (Vite)** frontend and **Django REST** backend with **SQLite**.

Developed in collaboration with **IIT Jodhpur**, Department of Computer Science and Engineering.

---

## Table of contents

- [Architecture](#architecture)
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

- **Frontend**: React 19, React Router, Tailwind CSS 4, Three.js (AR body), Recharts (vitals).
- **Backend**: Django 6, Django REST Framework, Token authentication, CORS for local dev.
- **Database**: SQLite file at `backend/db.sqlite3` (no separate DB server required for development).

---

## Prerequisites

Install these on any machine before cloning:

| Tool | Version | Check |
|------|---------|--------|
| **Node.js** | 18+ (20+ recommended) | `node -v` |
| **npm** | 9+ | `npm -v` |
| **Python** | 3.10+ (3.12+ recommended) | `python3 --version` |
| **pip** | latest | `pip3 --version` |
| **Git** | any | `git --version` |

Optional: `curl` for quick API checks.

---

## Project structure

```
rakshak-telemedicine-app/
├── README.md                 ← this file
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
python3 manage.py seed_demo         # optional: demo users + patients
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

Packages installed:

- `Django==6.0.5`
- `djangorestframework==3.17.1`
- `django-cors-headers==4.9.0`

### 3. Apply database migrations

```bash
python3 manage.py migrate
```

This creates `backend/db.sqlite3` with all tables (users, doctors, patients, alerts, reports, etc.).

### 4. Load demo data (recommended for first run)

```bash
python3 manage.py seed_demo
```

This **clears existing app data** and loads sample patients, vitals, alerts, and default accounts (see [User roles](#user-roles-and-login)).

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
VITE_API_BASE_URL=http://localhost:8555/api
```

Change the host/port if your backend runs elsewhere.

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
| `VITE_API_BASE_URL` | Base URL for all API calls | `http://localhost:8555/api` |

Restart `npm run dev` after changing `.env`.

### Backend

No `.env` file is required for local development. Key settings live in `backend/config/settings.py`:

- `DEBUG = True`
- `ALLOWED_HOSTS = ['localhost', '127.0.0.1']`
- `CORS_ALLOWED_ORIGINS` includes `http://localhost:5555` and `http://127.0.0.1:5555`
- Database: SQLite at `backend/db.sqlite3`

---

## Ports and URLs

| Service | URL | Notes |
|---------|-----|--------|
| Frontend (Vite) | http://127.0.0.1:5555 | Use this URL in the browser |
| Backend API | http://127.0.0.1:8555/api/ | REST JSON API |
| Django admin | http://127.0.0.1:8555/admin/ | After `createsuperuser` |

Custom backend port:

```bash
python3 manage.py runserver 9000
```

Update `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:9000/api
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
| Reset + demo | `python3 manage.py seed_demo` (clears app data first) |

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

- Frontend must be on `http://localhost:5555` or `http://127.0.0.1:5555`.
- Backend must be running on port **8555**.
- Check `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py`.

### API calls fail (network error)

- Confirm backend: `curl http://127.0.0.1:8555/api/config/`
- Confirm `frontend/.env` has `VITE_API_BASE_URL=http://localhost:8555/api`
- Restart frontend after editing `.env`.

### Port already in use

```bash
# Find process on 5555 or 8555 (macOS/Linux)
lsof -i :5555
lsof -i :8555
```

Stop the old process or pick another port and update `.env` / `runserver` accordingly.

---

## License and credits

Prototype for tactical / high-altitude telemedicine scenarios.  
**IIT Jodhpur** — Department of Computer Science and Engineering.

For backend-only notes, see `backend/README.md`.  
For frontend assets and branding, see `frontend/README.md`.
