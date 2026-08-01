#!/bin/sh
set -e

python manage.py migrate --noinput

if [ ! -f db.sqlite3 ]; then
  echo "No database found — loading demo data..."
  python manage.py seed_demo
fi

exec daphne -b 0.0.0.0 -p 8555 config.asgi:application
