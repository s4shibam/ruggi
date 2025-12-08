#!/usr/bin/env bash

set -euo pipefail

PORT="${PORT:-8000}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379/0}"

echo "Starting Redis..."
redis-server --save "" --appendonly no &
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

wait -n "$API_PID" "$WORKER_PID" "$BEAT_PID" "$REDIS_PID"
EXIT_CODE=$?

echo "Process exited with code ${EXIT_CODE}. Shutting down..."
kill -TERM "$API_PID" "$WORKER_PID" "$BEAT_PID" "$REDIS_PID" 2>/dev/null || true
wait || true
exit "$EXIT_CODE"
