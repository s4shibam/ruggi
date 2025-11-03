from django.apps import AppConfig


class DocumentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "document"

    def ready(self):
        import document.signals  # noqa: F401

        try:
            from document.beat import ensure_periodic_enqueue_task

            ensure_periodic_enqueue_task()
        except Exception:
            pass
