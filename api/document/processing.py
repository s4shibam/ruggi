from __future__ import annotations

import logging
from html.parser import HTMLParser

import fitz
from django.db import transaction
from django.utils import timezone
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel, Field, SecretStr

from common.constants import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    DOC_STATUS_COMPLETED,
    DOC_TYPE_HTML,
    DOC_TYPE_MD,
    DOC_TYPE_PDF,
    DOC_TYPE_TXT,
    EMBEDDING_MODEL_NAME,
    LLM_MODEL_NAME,
    OPENAI_EMBEDDING_DIMENSION,
    SUMMARY_CHUNKS_TO_USE,
    SUMMARY_MAX_TOKENS,
    SUMMARY_TEMPERATURE,
)
from common.s3 import download_file
from config.settings import OPENAI_API_KEY
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

    def __init__(self):
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured")

        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=DEFAULT_CHUNK_SIZE,
            chunk_overlap=DEFAULT_CHUNK_OVERLAP,
        )
        self._embeddings_model = OpenAIEmbeddings(
            model=EMBEDDING_MODEL_NAME,
            dimensions=OPENAI_EMBEDDING_DIMENSION,
            api_key=SecretStr(OPENAI_API_KEY),
        )
        self._llm = ChatOpenAI(
            model=LLM_MODEL_NAME,
            temperature=SUMMARY_TEMPERATURE,
            api_key=SecretStr(OPENAI_API_KEY),
        )

    def process(self, document: Document) -> None:
        if not document.storage_url:
            raise ValueError("Document has no storage_url to download")

        file_bytes = self._download_bytes(document)
        text = self._extract_text(document=document, file_bytes=file_bytes)
        chunks = self._chunk_text(text)
        metadata = self._generate_metadata(chunks, document.title)
        embeddings = self._embed_chunks(chunks)
        self._persist_chunks(
            document=document, chunks=chunks, embeddings=embeddings, metadata=metadata
        )

    def _download_bytes(self, document: Document) -> bytes:
        return download_file(document.storage_url)

    def _extract_text(self, *, document: Document, file_bytes: bytes) -> str:
        doc_type = (document.document_type or "").lower()

        if doc_type == DOC_TYPE_PDF:
            pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
            text_parts: list[str] = []
            try:
                for page_num in range(pdf_document.page_count):
                    page = pdf_document[page_num]
                    extracted = page.get_text() or ""
                    if extracted and isinstance(extracted, str):
                        text_parts.append(extracted)
            finally:
                pdf_document.close()
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

    def _chunk_text(self, text: str) -> list[str]:
        raw_chunks = self._splitter.split_text(text)
        chunks = []
        for chunk in raw_chunks:
            if chunk and chunk.strip():
                chunks.append(chunk.strip())
        if not chunks:
            raise ValueError("No text chunks generated from document")

        return chunks

    def _generate_metadata(self, chunks: list[str], current_title: str) -> DocumentMetadata:
        """Generate structured metadata (title, description, summary) using LLM with pydantic validation.

        Strategy: Take first chunks (intro), some middle chunks (body), and last chunks (conclusion)
        to create a representative sample without sending all chunks to the LLM.
        """
        if not chunks:
            return DocumentMetadata(
                title=current_title,
                description="No content available.",
                summary="No content available for summary.",
            )

        total_chunks = len(chunks)
        chunks_to_use = min(SUMMARY_CHUNKS_TO_USE, total_chunks)

        # Smart selection strategy
        if total_chunks <= SUMMARY_CHUNKS_TO_USE:
            # Use all chunks if we have fewer than the limit
            selected_chunks = chunks
        else:
            # Take chunks from beginning, middle, and end
            # 40% from start, 30% from middle, 30% from end
            start_count = max(1, int(chunks_to_use * 0.4))
            middle_count = max(1, int(chunks_to_use * 0.3))
            end_count = chunks_to_use - start_count - middle_count

            start_chunks = chunks[:start_count]
            middle_start = (total_chunks - middle_count) // 2
            middle_chunks = chunks[middle_start : middle_start + middle_count]
            end_chunks = chunks[-end_count:] if end_count > 0 else []

            selected_chunks = start_chunks + middle_chunks + end_chunks

        # Combine selected chunks
        combined_text = "\n\n".join(selected_chunks)

        # Truncate if still too long (safety measure)
        max_chars = 8000  # Roughly 2000 tokens
        if len(combined_text) > max_chars:
            combined_text = combined_text[:max_chars] + "..."

        # Generate structured metadata using OpenAI with pydantic validation
        try:
            # Create a structured output LLM
            structured_llm = self._llm.with_structured_output(DocumentMetadata)

            system_message = SystemMessage(
                content=(
                    "You are a document analysis assistant. Analyze the provided document content "
                    "and extract structured metadata.\n\n"
                    "TITLE REQUIREMENTS:\n"
                    "- Generate a clear, descriptive title (max 200 characters)\n"
                    "- Capture the main topic or purpose of the document\n"
                    "- Make it specific and informative\n\n"
                    "DESCRIPTION REQUIREMENTS:\n"
                    "- Write 2-3 sentences describing what the document is about\n"
                    "- Focus on the document's purpose and scope\n"
                    "- Keep it concise but informative\n\n"
                    "SUMMARY REQUIREMENTS:\n"
                    "- Length: 120-150 words maximum\n"
                    "- Use **bold** for key topics or important terms\n"
                    "- Use bullet points (•) or numbered lists when listing multiple items\n"
                    "- Use headers (##) if the summary has distinct sections\n"
                    "- Keep paragraphs short and scannable\n"
                    "- Focus on main topics, key findings, and conclusions\n\n"
                    "Remember: Be accurate, concise, and well-structured."
                )
            )
            user_message = HumanMessage(
                content=f"Analyze this document and provide title, description, and summary:\n\n{combined_text}"
            )

            metadata: DocumentMetadata = structured_llm.invoke(  # type: ignore
                [system_message, user_message],
                max_tokens=SUMMARY_MAX_TOKENS,
            )

            # Validate that we got reasonable data
            if not metadata.title or not metadata.title.strip():
                metadata.title = current_title
            if not metadata.description or not metadata.description.strip():
                metadata.description = "Description unavailable."
            if not metadata.summary or not metadata.summary.strip():
                metadata.summary = "Summary unavailable."

            return metadata

        except Exception as e:
            logger.error(f"Failed to generate metadata: {e}", exc_info=True)
            # Return fallback metadata
            first_chunk = chunks[0] if chunks else ""
            preview = first_chunk[:300].strip()
            return DocumentMetadata(
                title=current_title,
                description=f"Metadata generation failed. Document preview: {preview[:100]}...",
                summary=(
                    f"Metadata generation failed. Preview: {preview}..."
                    if preview
                    else "Summary unavailable."
                ),
            )

    def _embed_chunks(self, chunks: list[str]) -> list[list[float]]:
        """Generate embeddings for chunks using LangChain OpenAI embeddings."""
        embeddings: list[list[float]] = []
        batch_size = 32

        for start in range(0, len(chunks), batch_size):
            batch = chunks[start : start + batch_size]
            batch_embeddings = self._embeddings_model.embed_documents(batch)
            embeddings.extend(batch_embeddings)

        if len(embeddings) != len(chunks):
            raise ValueError("Embedding count does not match chunk count")

        return embeddings

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
