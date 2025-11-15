from __future__ import annotations

import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from common.constants import DOC_STATUS_QUEUED
from document.models import Document
from document.tasks import process_document_task

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Document)
def enqueue_document_processing(sender, instance: Document, created: bool, **kwargs) -> None:
    if not created:
        return

    if instance.status != DOC_STATUS_QUEUED:
        return

    if not instance.storage_url:
        logger.warning("Document %s created without storage_url; skipping processing", instance.id)
        return

    document_id = str(instance.id)

    def _enqueue_task():
        try:
            process_document_task.delay(document_id)
        except Exception:
            logger.exception("Failed to enqueue document %s for processing", document_id)

    transaction.on_commit(_enqueue_task)
