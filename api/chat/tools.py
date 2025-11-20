from __future__ import annotations

import logging
from typing import Any, Optional

from common.constants import (
    DOC_STATUS_COMPLETED,
    MAX_FULL_DOCUMENT_CHARS,
    WARN_FULL_DOCUMENT_CHARS,
)
from document.models import Document

logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 5
CHUNK_SNIPPET_LENGTH = 500
MAX_QUERY_VARIATIONS = 4


def truncate_chunk_text(text: str, limit: int = CHUNK_SNIPPET_LENGTH) -> str:
    """Truncate chunk text to a maximum length."""
    if len(text) <= limit:
        return text
    return text[:limit] + "..."


def create_tools(
    user,
):
    """Create tools with injected dependencies."""

    def list_documents(
        status: Optional[str] = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        """List the user's documents with high-level metadata.

        Args:
            status: Optional document status filter (queued, processing, completed, failed)
            limit: Maximum documents to return (1-50, default 20)

        Returns:
            Dictionary containing list of documents with their metadata.
        """
        limit = max(1, min(int(limit or 20), 50))

        qs = Document.objects.filter(owner=user).order_by("-created_at")
        if status:
            qs = qs.filter(status=status)

        docs = qs[:limit]
        return {
            "documents": [
                {
                    "id": str(doc.id),
                    "title": doc.title,
                    "document_type": doc.document_type,
                    "status": doc.status,
                    "source_name": doc.source_name,
                    "created_at": doc.created_at.isoformat(),
                }
                for doc in docs
            ]
        }

    def get_full_document(document_id: str) -> dict[str, Any]:
        """Retrieve the complete text content of a specific document.

        Use this when you need to read the entire document, not just search results.
        This reconstructs the full text from document chunks.

        Args:
            document_id: The UUID of the document to retrieve

        Returns:
            Dictionary containing document metadata, full text, and size warnings.
        """
        try:
            # Validate document access
            document = (
                Document.objects
                .filter(
                    id=document_id,
                    owner=user,
                    status=DOC_STATUS_COMPLETED,
                )
                .prefetch_related("chunks")
                .first()
            )

            if not document:
                return {
                    "error": "Document not found, not completed, or you don't have access to it",
                    "document_id": document_id,
                }

            # Get all chunks in order and reconstruct full text
            chunks = document.chunks.order_by("order").values_list("text", flat=True)
            full_text = "\n\n".join(chunks)
            text_length = len(full_text)

            # Safety check for document size
            if text_length > MAX_FULL_DOCUMENT_CHARS:
                return {
                    "document_id": str(document.id),
                    "title": document.title,
                    "document_type": document.document_type,
                    "error": "Document too large to retrieve in full",
                    "recommendation": "Use semantic_search with specific queries instead",
                    "summary": document.summary,
                }

            # Build response with appropriate warnings
            response = {
                "document_id": str(document.id),
                "title": document.title,
                "document_type": document.document_type,
                "full_text": full_text,
            }

            # Add warning for large documents
            if text_length > WARN_FULL_DOCUMENT_CHARS:
                response["warning"] = (
                    "This is a large document that will consume significant context. "
                    "Consider using semantic_search for specific information instead."
                )

            return response

        except Exception as e:
            logger.error(f"Error retrieving full document {document_id}: {e}")
            return {
                "error": f"Failed to retrieve document: {str(e)}",
                "document_id": document_id,
            }

    return [list_documents, get_full_document]
