from __future__ import annotations

import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from common.constants import (
    DOC_STATUS_COMPLETED,
    DOC_STATUS_FAILED,
    DOC_STATUS_PROCESSING,
    DOC_STATUS_QUEUED,
)
from config.celery import app
from document.models import Document
from document.processing import DocumentProcessor

logger = logging.getLogger(__name__)


@app.task(bind=True, name="document.process_document")
def process_document_task(self, document_id: str) -> None:
    try:
        with transaction.atomic():
            document = Document.objects.select_for_update().get(id=document_id)

            if document.status == DOC_STATUS_COMPLETED:
                logger.info("Document %s already processed; skipping", document_id)
                return

            if document.status == DOC_STATUS_PROCESSING:
                logger.info("Document %s already processing; skipping duplicate task", document_id)
                return

            if document.status != DOC_STATUS_QUEUED:
                logger.info(
                    "Document %s has status %s; only queued documents are processed",
                    document_id,
                    document.status,
                )
                return

            document.status = DOC_STATUS_PROCESSING
            document.save(update_fields=["status", "updated_at"])

    except Document.DoesNotExist:
        logger.warning("Document %s not found; skipping processing", document_id)
        return
    except Exception:
        logger.exception("Failed to prepare document %s for processing", document_id)
        raise

    try:
        processor = DocumentProcessor()
        processor.process(document)
    except Exception:
        logger.exception("Document %s processing failed", document_id)
        Document.objects.filter(id=document_id).update(
            status=DOC_STATUS_FAILED,
            updated_at=timezone.now(),
        )
        raise
    logger.info("Document %s processed successfully", document_id)


@app.task(bind=True, name="document.enqueue_unprocessed_documents")
def enqueue_unprocessed_documents(self) -> None:
    stale_before = timezone.now() - timedelta(minutes=1)
    queued_ids = list(
        Document.objects
        .filter(status=DOC_STATUS_QUEUED, updated_at__lte=stale_before)
        .order_by("created_at")
        .values_list("id", flat=True)[:200]
    )

    if not queued_ids:
        return

    for document_id in queued_ids:
        process_document_task.delay(str(document_id))

    logger.info("Enqueued %s queued documents for processing", len(queued_ids))
