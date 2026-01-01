import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Built-in beat scheduler
app.conf.beat_scheduler = "celery.beat:PersistentScheduler"

# Configure beat schedule
app.conf.beat_schedule = {
    "process-queued-documents": {
        "task": "document.enqueue_unprocessed_documents",
        "schedule": 120.0,  # Every 2 minutes
    },
}

__all__ = ("app",)
