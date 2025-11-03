import uuid

from django.conf import settings
from django.db import models
from django.db.models import Manager
from pgvector.django import VectorField

from common.constants import (
    DOC_SOURCE_UPLOAD,
    DOC_STATUS_QUEUED,
    DOCUMENT_SOURCE_CHOICES,
    DOCUMENT_STATUS_CHOICES,
    DOCUMENT_TYPE_CHOICES,
    MAX_STORAGE_URL_LENGTH,
    MAX_TITLE_LENGTH,
    OPENAI_EMBEDDING_DIMENSION,
)


class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document",
    )
    title = models.CharField(max_length=MAX_TITLE_LENGTH)
    source = models.CharField(
        max_length=64, choices=DOCUMENT_SOURCE_CHOICES, default=DOC_SOURCE_UPLOAD
    )
    source_name = models.CharField(
        max_length=MAX_TITLE_LENGTH,
        null=True,
        blank=True,
        default=None,
    )
    description = models.TextField(
        null=True,
        blank=True,
        default=None,
    )
    storage_url = models.CharField(
        max_length=MAX_STORAGE_URL_LENGTH,
        null=True,
        blank=True,
        default=None,
    )
    document_type = models.CharField(
        max_length=32,
        choices=DOCUMENT_TYPE_CHOICES,
        null=True,
        blank=True,
        default=None,
    )
    size_kb = models.IntegerField(
        null=True,
        blank=True,
        default=None,
    )
    status = models.CharField(
        max_length=32, choices=DOCUMENT_STATUS_CHOICES, default=DOC_STATUS_QUEUED
    )
    summary = models.TextField(
        null=True,
        blank=True,
        default=None,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    chunks: "Manager[DocumentChunk]"

    class Meta:
        db_table = "document"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class DocumentChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="chunks")
    order = models.IntegerField()
    text = models.TextField()
    embedding = VectorField(dimensions=OPENAI_EMBEDDING_DIMENSION)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "document_chunks"
        unique_together = [["document", "order"]]
        ordering = ["document", "order"]
        indexes = [
            models.Index(fields=["document", "order"]),
        ]

    def __str__(self):
        return f"Chunk {self.order} of {self.document.title}"
