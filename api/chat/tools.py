from __future__ import annotations

import logging
from typing import Any, Optional

from django.db.models import Value
from langchain.tools import tool
from langchain_core.embeddings import Embeddings
from pgvector.django import CosineDistance

from common.constants import DOC_STATUS_COMPLETED, MAX_FULL_DOCUMENT_CHARS, WARN_FULL_DOCUMENT_CHARS
from document.models import Document, DocumentChunk

logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 5
CHUNK_SNIPPET_LENGTH = 500
MAX_QUERY_VARIATIONS = 4


def truncate_chunk_text(text: str, limit: int = CHUNK_SNIPPET_LENGTH) -> str:
    """Truncate chunk text to a maximum length."""
    if len(text) <= limit:
        return text
    return text[:limit] + "..."


def _execute_semantic_search(
    *,
    embeddings_model: Embeddings,
    queries: list[str],
    attached_document_ids: list[str],
    user,
    allow_all_when_no_attachment: bool = True,
    top_k: int = DEFAULT_TOP_K,
) -> tuple[dict[str, Any], set[str], set[str]]:
    """Internal function to execute semantic search."""
    if not attached_document_ids:
        if not allow_all_when_no_attachment:
            return (
                {
                    "queries_executed": queries,
                    "chunks": [],
                    "message": "No documents are attached to this conversation.",
                    "document_ids_searched": [],
                    "search_scope": "no_documents",
                },
                set(),
                set(),
            )

    if not queries:
        return (
            {
                "queries_executed": [],
                "chunks": [],
                "message": "No queries provided for semantic search.",
                "document_ids_searched": attached_document_ids,
                "search_scope": "attached_documents"
                if attached_document_ids
                else "all_user_documents",
            },
            set(),
            set(),
        )

    # Generate embeddings using LangChain Embeddings
    embeddings = embeddings_model.embed_documents(queries)

    combined_results: dict[str, dict[str, Any]] = {}
    document_ids_used: set[str] = set()

    top_k = max(1, min(int(top_k or DEFAULT_TOP_K), 20))

    if attached_document_ids:
        base_queryset = DocumentChunk.objects.filter(
            document_id__in=attached_document_ids,
            document__status=DOC_STATUS_COMPLETED,
        ).select_related("document")
        search_scope = "attached_documents"
    else:
        base_queryset = (
            DocumentChunk.objects
            .filter(
                document__owner=user,
                document__status=DOC_STATUS_COMPLETED,
            )
            .select_related("document")
            .all()
        )
        search_scope = "all_user_documents"

    for embedding in embeddings:
        chunks = base_queryset.annotate(
            similarity=Value(1.0) - CosineDistance("embedding", embedding)
        ).order_by("-similarity")[:top_k]

        for chunk in chunks:
            chunk_id_str = str(chunk.id)
            if chunk_id_str not in combined_results:
                combined_results[chunk_id_str] = {
                    "chunk_id": chunk_id_str,
                    "document_id": str(chunk.document.id),
                    "document_title": chunk.document.title,
                    "chunk_text": truncate_chunk_text(chunk.text),
                    "chunk_order": chunk.order,
                    "scores": [],
                }
            combined_results[chunk_id_str]["scores"].append(
                float(getattr(chunk, "similarity", 0.0))
            )
            document_ids_used.add(str(chunk.document.id))

    ranked_chunks: list[dict[str, Any]] = []
    for entry in combined_results.values():
        scores = entry.pop("scores", [])
        average_score = sum(scores) / len(scores) if scores else 0.0
        entry["similarity_score"] = round(average_score, 6)
        ranked_chunks.append(entry)

    ranked_chunks.sort(key=lambda item: item["similarity_score"], reverse=True)
    selected_chunks = ranked_chunks[:top_k]

    return (
        {
            "queries_executed": queries,
            "chunks": selected_chunks,
            "document_ids_searched": attached_document_ids
            if attached_document_ids
            else sorted(document_ids_used),
            "search_scope": search_scope,
        },
        {chunk["chunk_id"] for chunk in selected_chunks},
        document_ids_used,
    )


def create_tools(embeddings_model: Embeddings, user, attached_document_ids: list[str]):
    """Create LangChain tools with injected dependencies."""

    @tool
    def semantic_search(
        queries: list[str],
        top_k: int = DEFAULT_TOP_K,
    ) -> dict[str, Any]:
        """Search for relevant content in attached documents using semantic similarity.

        Uses multi-query retrieval for better results.

        Args:
            queries: Multiple query variations to search for (2-4 queries recommended for better retrieval)
            top_k: Number of top results to return per query (default: 5)

        Returns:
            Dictionary containing search results with chunks, document IDs, and search scope.
        """
        result, _, _ = _execute_semantic_search(
            embeddings_model=embeddings_model,
            queries=queries[:MAX_QUERY_VARIATIONS],
            attached_document_ids=attached_document_ids,
            user=user,
            top_k=top_k,
        )
        return result

    @tool
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

    @tool
    def get_full_document(document_id: str) -> dict[str, Any]:
        """Retrieve the complete text content of a specific document.

        Use this when you need to read the entire document, not just search results.
        This reconstructs the full text from document chunks.

        WARNING: Full documents can be very large and consume significant context.
        Use semantic_search for most queries. Only use this when:
        - User explicitly asks to "read the full document"
        - You need complete sequential context (e.g., reading a story, following a procedure)
        - Semantic search doesn't return sufficient information

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

    return [semantic_search, list_documents, get_full_document]
