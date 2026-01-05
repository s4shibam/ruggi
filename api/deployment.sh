#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"
export REDIS_URL="redis://127.0.0.1:6379/0"

echo "Starting Redis..."
redis-server \
  --bind 127.0.0.1 \
  --protected-mode yes \
  --save "" \
  --appendonly no &
REDIS_PID=$!

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Starting Celery worker..."
celery -A config worker -l info &
WORKER_PID=$!

echo "Starting Celery beat..."
celery -A config beat -l info &
BEAT_PID=$!

echo "Starting API on port ${PORT}..."
uvicorn config.asgi:application --host 0.0.0.0 --port "$PORT" &
API_PID=$!

wait -n "$API_PID"
EXIT_CODE=$?

echo "API exited, shutting down..."
kill -TERM "$WORKER_PID" "$BEAT_PID" "$REDIS_PID" 2>/dev/null || true
wait || true
exit "$EXIT_CODE"
