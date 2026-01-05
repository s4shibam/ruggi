import json
import logging
import uuid
from typing import Any, Optional, Union, cast

from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from rest_framework import status

from common.constants import (
    CHUNK_PREVIEW_LENGTH,
    DEFAULT_PAGE_NUMBER,
    DEFAULT_PAGE_SIZE,
    DOC_SOURCE_UPLOAD,
    DOC_STATUS_COMPLETED,
    DOC_STATUS_FAILED,
    DOC_STATUS_PROCESSING,
    DOC_STATUS_QUEUED,
    DOC_TYPE_HTML,
    DOC_TYPE_MD,
    DOC_TYPE_PDF,
    DOC_TYPE_TXT,
    DOCUMENT_TYPE_MAP,
    ERROR_FIELD_EMPTY,
    ERROR_FIELD_INVALID_TYPE,
    ERROR_FIELD_TOO_LONG,
    ERROR_FILE_TOO_LARGE,
    ERROR_FILE_TYPE_NOT_SUPPORTED,
    ERROR_INVALID_JSON,
    ERROR_INVALID_UUID,
    ERROR_PROCESSING_FAILED,
    MAX_FILE_SIZE_BYTES,
    MAX_FILE_SIZE_MB,
    MAX_PAGE_SIZE,
    MAX_TITLE_LENGTH,
    SUCCESS_DELETED,
    SUCCESS_RETRIEVED,
    SUCCESS_UPDATED,
    SUCCESS_UPLOADED_AND_PROCESSED,
    SUPPORTED_DOCUMENT_TYPES,
)
from common.s3 import delete_file, generate_presigned_upload_url, get_storage_url
from common.types import AuthenticatedHttpRequest

from .models import Document

logger = logging.getLogger(__name__)


def _serialize_document(document: Document, include_chunks: bool = False) -> dict[str, Any]:
    # Use annotated chunk_count if available (from list queries), otherwise count
    chunk_count = getattr(document, "chunk_count", None)
    if chunk_count is None:
        chunk_count = document.chunks.count()

    data: dict[str, Any] = {
        "id": str(document.id),
        "title": document.title,
        "source": document.source,
        "source_name": document.source_name,
        "description": document.description,
        "storage_url": document.storage_url,
        "document_type": document.document_type,
        "size_kb": document.size_kb,
        "status": document.status,
        "summary": document.summary,
        "created_at": document.created_at.isoformat(),
        "updated_at": document.updated_at.isoformat(),
        "chunk_count": chunk_count,
    }

    if include_chunks:
        chunks = document.chunks.all().order_by("order")
        data["chunks"] = [
            {
                "id": str(chunk.id),
                "order": chunk.order,
                "text": chunk.text[:CHUNK_PREVIEW_LENGTH] + "..."
                if len(chunk.text) > CHUNK_PREVIEW_LENGTH
                else chunk.text,
            }
            for chunk in chunks
        ]

    return data


@login_required
@require_GET
def list_documents(request: AuthenticatedHttpRequest) -> JsonResponse:
    page_number: int = int(request.GET.get("page", DEFAULT_PAGE_NUMBER))
    page_size: int = min(int(request.GET.get("page_size", DEFAULT_PAGE_SIZE)), MAX_PAGE_SIZE)

    status_filter: Optional[str] = request.GET.get("status")
    search_query: Optional[str] = request.GET.get("search")

    documents = Document.objects.filter(owner=request.user)

    if status_filter and status_filter in [
        DOC_STATUS_QUEUED,
        DOC_STATUS_PROCESSING,
        DOC_STATUS_COMPLETED,
        DOC_STATUS_FAILED,
    ]:
        documents = documents.filter(status=status_filter)

    if search_query:
        documents = documents.filter(title__icontains=search_query)

    documents = documents.annotate(chunk_count=Count("chunks")).order_by("-updated_at")

    paginator: Paginator = Paginator(documents, page_size)
    page_obj = paginator.get_page(page_number)

    documents_data: list[dict[str, Any]] = []
    for doc in page_obj:
        doc_data: dict[str, Any] = _serialize_document(doc)
        documents_data.append(doc_data)

    return JsonResponse(
        {
            "message": SUCCESS_RETRIEVED.format("Documents"),
            "data": documents_data,
            "pagination": {
                "page": page_obj.number,
                "page_size": page_size,
                "total_pages": paginator.num_pages,
                "total_items": paginator.count,
            },
        },
        status=status.HTTP_200_OK,
    )


@login_required
@csrf_exempt
@require_POST
def generate_document_upload_url(request: AuthenticatedHttpRequest) -> JsonResponse:
    try:
        data: dict[str, Any] = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"message": ERROR_INVALID_JSON}, status=status.HTTP_400_BAD_REQUEST)

    file_name: str = str(data.get("file_name") or "").strip()
    file_type: str = str(data.get("file_type") or "application/octet-stream")
    raw_file_size = data.get("file_size")

    if not file_name:
        return JsonResponse(
            {"message": ERROR_FIELD_EMPTY.format("File name")}, status=status.HTTP_400_BAD_REQUEST
        )

    if raw_file_size is None:
        return JsonResponse(
            {"message": ERROR_FIELD_INVALID_TYPE.format("File size", "positive integer")},
            status=status.HTTP_400_BAD_REQUEST,
        )

    file_size_input = cast(Union[int, float, str], raw_file_size)

    try:
        file_size: int = int(file_size_input)
    except (TypeError, ValueError):
        return JsonResponse(
            {"message": ERROR_FIELD_INVALID_TYPE.format("File size", "positive integer")},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if file_size <= 0:
        return JsonResponse(
            {"message": ERROR_FIELD_INVALID_TYPE.format("File size", "positive integer")},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        return JsonResponse(
            {"message": ERROR_FILE_TOO_LARGE.format(MAX_FILE_SIZE_MB)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    sanitized_file_name = file_name.split("/")[-1].split("\\")[-1]
    file_extension: str = (
        sanitized_file_name.split(".")[-1].lower() if "." in sanitized_file_name else "other"
    )
    document_type: str = DOCUMENT_TYPE_MAP.get(file_extension, "other")

    if document_type not in SUPPORTED_DOCUMENT_TYPES:
        return JsonResponse(
            {"message": ERROR_FILE_TYPE_NOT_SUPPORTED.format("PDF, TXT, MD, and HTML")},
            status=status.HTTP_400_BAD_REQUEST,
        )

    upload_key = f"documents/{uuid.uuid4()}.{file_extension}"
    content_type_map = {
        DOC_TYPE_PDF: "application/pdf",
        DOC_TYPE_TXT: "text/plain",
        DOC_TYPE_MD: "text/markdown",
        DOC_TYPE_HTML: "text/html",
    }
    content_type = content_type_map.get(document_type, file_type or "application/octet-stream")

    try:
        upload_url = generate_presigned_upload_url(upload_key, content_type)
        storage_url = get_storage_url(upload_key)
    except ValueError as e:
        logger.error(f"Failed to generate presigned URL: {e}", exc_info=True)
        return JsonResponse(
            {"message": ERROR_PROCESSING_FAILED.format("Presigned URL generation", str(e))},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return JsonResponse(
        {
            "message": SUCCESS_RETRIEVED.format("Upload URL"),
            "data": {
                "upload_url": upload_url,
                "storage_url": storage_url,
                "key": upload_key,
                "content_type": content_type,
            },
        },
        status=status.HTTP_200_OK,
    )


@login_required
@csrf_exempt
@require_POST
def complete_document_upload(request: AuthenticatedHttpRequest) -> JsonResponse:
    try:
        data: dict[str, Any] = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"message": ERROR_INVALID_JSON}, status=status.HTTP_400_BAD_REQUEST)

    file_name: str = str(data.get("file_name") or "").strip()
    storage_url: str = str(data.get("storage_url") or "").strip()
    raw_file_size = data.get("file_size")

    if not file_name:
        return JsonResponse(
            {"message": ERROR_FIELD_EMPTY.format("File name")}, status=status.HTTP_400_BAD_REQUEST
        )

    if not storage_url or not storage_url.startswith("https://"):
        return JsonResponse(
            {"message": ERROR_FIELD_EMPTY.format("Storage URL")}, status=status.HTTP_400_BAD_REQUEST
        )

    if raw_file_size is None:
        return JsonResponse(
            {"message": ERROR_FIELD_INVALID_TYPE.format("File size", "positive integer")},
            status=status.HTTP_400_BAD_REQUEST,
        )

    file_size_input = cast(Union[int, float, str], raw_file_size)

    try:
        file_size: int = int(file_size_input)
    except (TypeError, ValueError):
        return JsonResponse(
            {"message": ERROR_FIELD_INVALID_TYPE.format("File size", "positive integer")},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if file_size <= 0:
        return JsonResponse(
            {"message": ERROR_FIELD_INVALID_TYPE.format("File size", "positive integer")},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        return JsonResponse(
            {"message": ERROR_FILE_TOO_LARGE.format(MAX_FILE_SIZE_MB)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    sanitized_file_name = file_name.split("/")[-1].split("\\")[-1]
    file_extension: str = (
        sanitized_file_name.split(".")[-1].lower() if "." in sanitized_file_name else "other"
    )
    document_type: str = DOCUMENT_TYPE_MAP.get(file_extension, "other")

    if document_type not in SUPPORTED_DOCUMENT_TYPES:
        return JsonResponse(
            {"message": ERROR_FILE_TYPE_NOT_SUPPORTED.format("PDF, TXT, MD, and HTML")},
            status=status.HTTP_400_BAD_REQUEST,
        )

    document: Optional[Document] = None

    try:
        with transaction.atomic():
            document = Document.objects.create(
                owner=request.user,
                title=sanitized_file_name,
                source=DOC_SOURCE_UPLOAD,
                source_name=sanitized_file_name,
                storage_url=storage_url,
                document_type=document_type,
                size_kb=file_size // 1024,
                status=DOC_STATUS_QUEUED,
            )

            return JsonResponse(
                {
                    "message": SUCCESS_UPLOADED_AND_PROCESSED.format("Document"),
                    "data": _serialize_document(document),
                },
                status=status.HTTP_201_CREATED,
            )

    except Exception as e:
        logger.error(f"Document upload completion failed: {e}", exc_info=True)

        if document:
            document.status = DOC_STATUS_FAILED
            document.save()

        return JsonResponse(
            {
                "message": ERROR_PROCESSING_FAILED.format("Document", str(e)),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@login_required
@require_GET
def get_document_detail(request: AuthenticatedHttpRequest, document_id: uuid.UUID) -> JsonResponse:
    try:
        document_uuid: uuid.UUID = uuid.UUID(str(document_id))
    except ValueError:
        return JsonResponse(
            {"message": ERROR_INVALID_UUID.format("document")}, status=status.HTTP_400_BAD_REQUEST
        )

    document: Document = get_object_or_404(Document, id=document_uuid, owner=request.user)

    return JsonResponse(
        {
            "message": SUCCESS_RETRIEVED.format("Document"),
            "data": _serialize_document(document, include_chunks=True),
        },
        status=status.HTTP_200_OK,
    )


@login_required
@csrf_exempt
@require_http_methods(["PUT", "PATCH"])
def update_document(request: AuthenticatedHttpRequest, document_id: uuid.UUID) -> JsonResponse:
    try:
        document_uuid: uuid.UUID = uuid.UUID(str(document_id))
    except ValueError:
        return JsonResponse(
            {"message": ERROR_INVALID_UUID.format("document")}, status=status.HTTP_400_BAD_REQUEST
        )

    document: Document = get_object_or_404(Document, id=document_uuid, owner=request.user)

    try:
        data: dict[str, Any] = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"message": ERROR_INVALID_JSON}, status=status.HTTP_400_BAD_REQUEST)

    if "title" in data:
        title: str = data["title"]
        if not title or not title.strip():
            return JsonResponse(
                {"message": ERROR_FIELD_EMPTY.format("Title")}, status=status.HTTP_400_BAD_REQUEST
            )
        if len(title) > MAX_TITLE_LENGTH:
            return JsonResponse(
                {"message": ERROR_FIELD_TOO_LONG.format("Title", MAX_TITLE_LENGTH)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        document.title = title.strip()

    if "description" in data:
        description: str = data["description"]
        if not description or not description.strip():
            return JsonResponse(
                {"message": ERROR_FIELD_EMPTY.format("Description")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        else:
            document.description = description.strip()

    document.save()

    return JsonResponse(
        {
            "message": SUCCESS_UPDATED.format("Document"),
            "data": _serialize_document(document),
        },
        status=status.HTTP_200_OK,
    )


@login_required
@csrf_exempt
@require_http_methods(["DELETE"])
def delete_document(request: AuthenticatedHttpRequest, document_id: uuid.UUID) -> JsonResponse:
    try:
        document_uuid: uuid.UUID = uuid.UUID(str(document_id))
    except ValueError:
        return JsonResponse(
            {"message": ERROR_INVALID_UUID.format("document")}, status=status.HTTP_400_BAD_REQUEST
        )

    document: Document = get_object_or_404(Document, id=document_uuid, owner=request.user)

    if document.storage_url:
        try:
            delete_file(document.storage_url)
            logger.info(f"Deleted file from S3: {document.storage_url}")
        except ValueError as e:
            logger.warning(f"Failed to delete file from S3 ({document.storage_url}): {e}")

    document.delete()

    return JsonResponse(
        {
            "message": SUCCESS_DELETED.format("Document"),
        },
        status=status.HTTP_200_OK,
    )
