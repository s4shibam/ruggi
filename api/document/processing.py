from __future__ import annotations

import logging
from html.parser import HTMLParser
from io import BytesIO

from django.db import transaction
from django.utils import timezone
from pydantic import BaseModel, Field
from pypdf import PdfReader

from common.constants import (
    DOC_STATUS_COMPLETED,
    DOC_TYPE_HTML,
    DOC_TYPE_MD,
    DOC_TYPE_PDF,
    DOC_TYPE_TXT,
)
from common.s3 import download_file
from document.models import Document, DocumentChunk

logger = logging.getLogger(__name__)


class DocumentMetadata(BaseModel):
    """Structured schema for document metadata extracted by LLM."""

    title: str = Field(
        description="A clear, descriptive title for the document (max 200 characters)"
    )
    description: str = Field(
        description="A brief 2-3 sentence description capturing what the document is about"
    )
    summary: str = Field(
        description="A comprehensive 120-150 word summary with markdown formatting including key topics, findings, and conclusions"
    )


class _HTMLTextExtractor(HTMLParser):
    """Lightweight HTML-to-text extractor to avoid extra dependencies."""

    def __init__(self):
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        if data and data.strip():
            self._parts.append(data.strip())

    def get_text(self) -> str:
        return " ".join(self._parts)


class DocumentProcessor:
    """Encapsulates end-to-end document processing."""

    def _download_bytes(self, document: Document) -> bytes:
        return download_file(document.storage_url)

    def _extract_text(self, *, document: Document, file_bytes: bytes) -> str:
        doc_type = (document.document_type or "").lower()

        if doc_type == DOC_TYPE_PDF:
            reader = PdfReader(BytesIO(file_bytes))
            text_parts: list[str] = []
            for page in reader.pages:
                extracted = page.extract_text() or ""
                if extracted:
                    text_parts.append(extracted)
            text = "\n".join(text_parts)
        elif doc_type in (DOC_TYPE_TXT, DOC_TYPE_MD):
            text = file_bytes.decode("utf-8", errors="ignore")
        elif doc_type == DOC_TYPE_HTML:
            parser = _HTMLTextExtractor()
            parser.feed(file_bytes.decode("utf-8", errors="ignore"))
            text = parser.get_text()
        else:
            raise ValueError(f"Unsupported document type: {document.document_type}")

        cleaned = text.strip()
        if not cleaned:
            raise ValueError("Document text is empty after extraction")

        return cleaned

    def _persist_chunks(
        self,
        *,
        document: Document,
        chunks: list[str],
        embeddings: list[list[float]],
        metadata: DocumentMetadata,
    ) -> None:
        with transaction.atomic():
            DocumentChunk.objects.filter(document=document).delete()

            DocumentChunk.objects.bulk_create(
                [
                    DocumentChunk(
                        document=document,
                        order=order,
                        text=chunk,
                        embedding=embeddings[order],
                    )
                    for order, chunk in enumerate(chunks)
                ],
                batch_size=100,
            )

            # Update document with extracted metadata
            Document.objects.filter(id=document.id).update(
                status=DOC_STATUS_COMPLETED,
                title=metadata.title[:200],  # Ensure max length
                description=metadata.description,
                summary=metadata.summary,
                updated_at=timezone.now(),
            )
