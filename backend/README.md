# Rakshak Telemedicine — Backend

Django REST API with SQLite for the Rakshak XR frontend.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

API base: `http://localhost:8555/api/`

## Demo login

- **Username:** `doctor`
- **Password:** `rakshak2026`

## Commands

| Command | Description |
|---------|-------------|
| `python manage.py seed_demo` | Reset and load demo data |
| `python manage.py runserver` | Start dev server on port 8555 |
