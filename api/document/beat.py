from __future__ import annotations

import asyncio
import logging
import threading

from django.db.utils import OperationalError, ProgrammingError
from django_celery_beat.models import IntervalSchedule, PeriodicTask

logger = logging.getLogger(__name__)


def _ensure_periodic_enqueue_task_sync() -> None:
    """
    Synchronous implementation of ensure_periodic_enqueue_task.
    Ensure a periodic Celery beat task exists to enqueue stale queued documents every 2 minutes.
    A document is considered stale if it's still queued and hasn't been updated for >1 minute.
    """
    try:
        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=2,
            period=IntervalSchedule.MINUTES,
        )
        PeriodicTask.objects.update_or_create(
            name="process-queued-documents",
            defaults={
                "interval": schedule,
                "task": "document.enqueue_unprocessed_documents",
                "enabled": True,
            },
        )
    except (OperationalError, ProgrammingError):
        logger.warning("Skipping beat task setup; database tables not ready yet")
    except Exception:
        logger.exception("Failed to ensure periodic enqueue task")


def ensure_periodic_enqueue_task() -> None:
    """
    Ensure a periodic Celery beat task exists to enqueue stale queued documents every 2 minutes.
    A document is considered stale if it's still queued and hasn't been updated for >1 minute.

    This function handles both sync and async contexts. When called from an async context,
    it runs the sync operation in a separate thread to avoid SynchronousOnlyOperation errors.
    """

    try:
        # Check if we're in an async context
        asyncio.get_running_loop()
        # We're in an async context, run sync code in a thread
        thread = threading.Thread(target=_ensure_periodic_enqueue_task_sync, daemon=True)
        thread.start()
    except RuntimeError:
        # No running event loop, we're in sync context - call directly
        _ensure_periodic_enqueue_task_sync()
