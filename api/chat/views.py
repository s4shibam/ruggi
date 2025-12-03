import json
import logging
import uuid
from typing import Any, Optional

from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from rest_framework import status

from common.constants import (
    CHAT_ROLE_ASSISTANT,
    CHAT_ROLE_USER,
    DEFAULT_PAGE_NUMBER,
    DEFAULT_PAGE_SIZE,
    DOC_STATUS_COMPLETED,
    ERROR_FIELD_INVALID_TYPE,
    ERROR_FIELD_REQUIRED,
    ERROR_FIELD_TOO_LONG,
    ERROR_INVALID_JSON,
    ERROR_INVALID_UUID,
    ERROR_NOT_AUTHORIZED,
    MAX_PAGE_SIZE,
    MAX_TITLE_LENGTH,
    SUCCESS_DELETED,
    SUCCESS_RETRIEVED,
    SUCCESS_UPDATED,
)
from document.models import Document

from .context import trim_chat_history
from .llm import (
    LLM_MAX_TOOL_CALLS,
    LLM_TEMPERATURE,
    generate_title,
    run_chat_with_tools,
)
from .models import ChatMessage, ChatSession
from .prompts import build_system_message

logger = logging.getLogger(__name__)


def _serialize_message(message: ChatMessage) -> dict[str, Any]:
    return {
        "id": str(message.id),
        "role": message.role,
        "content": message.content,
        "metadata": message.metadata,
        "created_at": message.created_at.isoformat(),
    }


def _serialize_session(session: ChatSession, include_messages: bool = False) -> dict[str, Any]:

    message_count = getattr(session, "message_count", None)
    if message_count is None:
        message_count = session.messages.count()

    data: dict[str, Any] = {
        "id": str(session.id),
        "title": session.title,
        "is_starred": session.is_starred,
        "attached_documents": [
            {
                "id": str(doc.id),
                "title": doc.title,
                "description": doc.description,
            }
            for doc in session.attached_documents.all()
        ],
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
        "last_message_at": session.last_message_at.isoformat() if session.last_message_at else None,
        "message_count": message_count,
    }

    if include_messages:
        messages = session.messages.all()
        data["messages"] = [_serialize_message(msg) for msg in messages]

    return data


def _validate_and_set_attached_documents(
    *,
    session: ChatSession,
    document_ids: Optional[list[str]],
    user,
) -> list[Document]:
    if document_ids is None:
        return list(session.attached_documents.filter(status=DOC_STATUS_COMPLETED))

    valid_documents: list[Document] = []
    for doc_id in document_ids:
        try:
            doc_uuid = uuid.UUID(str(doc_id))
        except (TypeError, ValueError):
            logger.warning("Skipping invalid document_id '%s' for user %s", doc_id, user.id)
            continue

        document = Document.objects.filter(id=doc_uuid).first()
        if document is None:
            logger.warning("Document %s does not exist for user %s", doc_uuid, user.id)
            continue

        if document.owner != user:
            logger.warning(
                "User %s attempted to attach unauthorized document %s", user.id, doc_uuid
            )
            continue

        if document.status != DOC_STATUS_COMPLETED:
            logger.warning(
                "Document %s is not completed (status=%s); skipping attachment",
                doc_uuid,
                document.status,
            )
            continue

        valid_documents.append(document)

    session.attached_documents.set(valid_documents)
    return valid_documents


def _get_or_create_session(session_id: Optional[str], user) -> ChatSession:
    if session_id:
        try:
            session_uuid = uuid.UUID(str(session_id))
        except ValueError:
            raise ValueError(ERROR_INVALID_UUID.format("session"))

        session = ChatSession.objects.select_for_update().filter(id=session_uuid).first()
        if session:
            if session.user != user:
                raise PermissionError(ERROR_NOT_AUTHORIZED.format("chat session"))
            return session

        return ChatSession.objects.create(id=session_uuid, user=user)

    return ChatSession.objects.create(user=user)


def _get_user_personalization(user) -> dict[str, str]:
    try:
        personalization = user.personalization
    except Exception:
        return {}

    return {
        "nick_name": personalization.nick_name or "",
        "occupation": personalization.occupation or "",
        "style_preferences": personalization.style_preferences or "",
    }


@login_required
@csrf_exempt
@require_POST
def create_chat_message(request: HttpRequest) -> JsonResponse:
    try:
        data: dict[str, Any] = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"message": ERROR_INVALID_JSON}, status=status.HTTP_400_BAD_REQUEST)

    session_id: Optional[str] = data.get("session_id")
    content: str = str(data.get("content") or "").strip()
    document_ids: Optional[list[str]] = data.get("document_ids")

    if not content:
        return JsonResponse(
            {"message": ERROR_FIELD_REQUIRED.format("Message content")},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            session = _get_or_create_session(session_id, request.user)
            attached_documents = _validate_and_set_attached_documents(
                session=session, document_ids=document_ids, user=request.user
            )
            ChatMessage.objects.create(session=session, role=CHAT_ROLE_USER, content=content)
    except ValueError as e:
        return JsonResponse({"message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except PermissionError as e:
        return JsonResponse({"message": str(e)}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        logger.exception("Failed to create chat session/message for user %s", request.user.id)
        return JsonResponse(
            {"message": f"An error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    attached_documents = list(session.attached_documents.filter(status=DOC_STATUS_COMPLETED))
    attached_document_ids = [str(doc.id) for doc in attached_documents]

    past_messages = session.messages.all().order_by("created_at")
    chat_history = [{"role": msg.role, "content": msg.content} for msg in past_messages]

    system_message = build_system_message(
        attached_documents,
        max_tool_calls=LLM_MAX_TOOL_CALLS,
        personalization=_get_user_personalization(request.user),
    )

    # Build payload and trim if needed
    messages_payload = [system_message, *chat_history]
    trimmed_messages, trim_metadata = trim_chat_history(messages_payload)

    try:
        llm_result = run_chat_with_tools(
            messages=trimmed_messages,
            attached_document_ids=attached_document_ids,
            user=request.user,
            temperature=LLM_TEMPERATURE,
        )
    except Exception as e:
        logger.exception("LLM orchestration failed for session %s", session.id)
        return JsonResponse(
            {"message": f"An error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        with transaction.atomic():
            assistant_message: ChatMessage = ChatMessage.objects.create(
                session=session,
                role=CHAT_ROLE_ASSISTANT,
                content=llm_result["answer"],
                metadata={
                    "model_name": llm_result.get("model_name"),
                    "temperature": LLM_TEMPERATURE,
                    "token_usage": llm_result.get("token_usage"),
                    "tool_call_count": llm_result.get("tool_call_count"),
                    "tool_calls": llm_result.get("tool_calls"),
                    "chunk_ids_used": list(llm_result.get("chunk_ids_used", [])),
                    "document_ids_used": list(llm_result.get("document_ids_used", [])),
                    "attached_document_ids": attached_document_ids,
                },
            )

            session.last_message_at = assistant_message.created_at
            session.save(update_fields=["last_message_at", "updated_at"])
    except Exception as e:
        logger.exception("Failed to persist assistant message for session %s", session.id)
        return JsonResponse(
            {"message": f"An error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    session_attached_documents = [
        {
            "id": str(doc.id),
            "title": doc.title,
            "description": doc.description,
        }
        for doc in attached_documents
    ]

    tool_usage = (
        {
            "tool_call_count": llm_result.get("tool_call_count"),
            "documents_searched": list(llm_result.get("document_ids_used", [])),
            "context_trimmed": trim_metadata.get("trimmed", False),
        }
        if llm_result.get("tool_call_count")
        else {"context_trimmed": trim_metadata.get("trimmed", False)}
        if trim_metadata.get("trimmed")
        else None
    )

    return JsonResponse(
        {
            "message": "Completion generated successfully",
            "data": {
                "session_id": str(session.id),
                "assistant_message_content": llm_result["answer"],
                "attached_documents": session_attached_documents,
                "tool_usage": tool_usage,
            },
        },
        status=status.HTTP_201_CREATED,
    )


@login_required
@require_GET
def get_all_chats(request: HttpRequest) -> JsonResponse:
    page_number: int = int(request.GET.get("page", DEFAULT_PAGE_NUMBER))
    page_size: int = min(int(request.GET.get("page_size", DEFAULT_PAGE_SIZE)), MAX_PAGE_SIZE)
    search_query: Optional[str] = request.GET.get("search")
    is_starred: Optional[str] = request.GET.get("is_starred")

    sessions = (
        ChatSession.objects
        .filter(user=request.user)
        .annotate(message_count=Count("messages"))
        .prefetch_related("attached_documents")
    )

    if search_query:
        sessions = sessions.filter(title__icontains=search_query)

    if is_starred is not None:
        if is_starred.lower() == "true":
            sessions = sessions.filter(is_starred=True)
        else:
            sessions = sessions.filter(is_starred=False)

    sessions = sessions.order_by("-last_message_at")

    paginator: Paginator = Paginator(sessions, page_size)
    page_obj = paginator.get_page(page_number)

    return JsonResponse(
        {
            "message": SUCCESS_RETRIEVED.format("Chat sessions"),
            "data": [_serialize_session(session) for session in page_obj],
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
@require_GET
def get_chat_detail(request: HttpRequest, chat_id: uuid.UUID) -> JsonResponse:
    try:
        session_uuid: uuid.UUID = uuid.UUID(str(chat_id))
    except ValueError:
        return JsonResponse(
            {"message": ERROR_INVALID_UUID.format("session")}, status=status.HTTP_400_BAD_REQUEST
        )

    session: ChatSession = get_object_or_404(
        ChatSession.objects.prefetch_related("attached_documents", "messages"),
        id=session_uuid,
        user=request.user,
    )

    return JsonResponse(
        {
            "message": SUCCESS_RETRIEVED.format("Chat session"),
            "data": _serialize_session(session, include_messages=True),
        },
        status=status.HTTP_200_OK,
    )


@login_required
@csrf_exempt
@require_http_methods(["PUT", "PATCH"])
def update_chat(request: HttpRequest, chat_id: uuid.UUID) -> JsonResponse:
    try:
        session_uuid: uuid.UUID = uuid.UUID(str(chat_id))
    except ValueError:
        return JsonResponse(
            {"message": ERROR_INVALID_UUID.format("session")}, status=status.HTTP_400_BAD_REQUEST
        )

    session: ChatSession = get_object_or_404(ChatSession, id=session_uuid, user=request.user)

    try:
        data: dict[str, Any] = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"message": ERROR_INVALID_JSON}, status=status.HTTP_400_BAD_REQUEST)

    if "title" in data:
        title: Optional[str] = data["title"]
        if title and len(title) > MAX_TITLE_LENGTH:
            return JsonResponse(
                {"message": ERROR_FIELD_TOO_LONG.format("Title", MAX_TITLE_LENGTH)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        session.title = title or None

    if "is_starred" in data:
        if not isinstance(data["is_starred"], bool):
            return JsonResponse(
                {"message": ERROR_FIELD_INVALID_TYPE.format("is_starred", "boolean")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        session.is_starred = data["is_starred"]

    session.save()

    return JsonResponse(
        {
            "message": SUCCESS_UPDATED.format("Chat session"),
            "data": _serialize_session(session),
        },
        status=status.HTTP_200_OK,
    )


@login_required
@csrf_exempt
@require_http_methods(["DELETE"])
def delete_chat(request: HttpRequest, chat_id: uuid.UUID) -> JsonResponse:
    try:
        session_uuid: uuid.UUID = uuid.UUID(str(chat_id))
    except ValueError:
        return JsonResponse(
            {"message": ERROR_INVALID_UUID.format("session")}, status=status.HTTP_400_BAD_REQUEST
        )

    session: ChatSession = get_object_or_404(ChatSession, id=session_uuid, user=request.user)
    session.delete()

    return JsonResponse(
        {
            "message": SUCCESS_DELETED.format("Chat session"),
        },
        status=status.HTTP_200_OK,
    )


@login_required
@csrf_exempt
@require_POST
def generate_chat_title(request: HttpRequest, chat_id: uuid.UUID) -> JsonResponse:
    try:
        session_uuid: uuid.UUID = uuid.UUID(str(chat_id))
    except ValueError:
        return JsonResponse(
            {"message": ERROR_INVALID_UUID.format("session")}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        data: dict[str, Any] = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"message": ERROR_INVALID_JSON}, status=status.HTTP_400_BAD_REQUEST)

    content: str = data.get("content", "").strip()

    if not content:
        return JsonResponse(
            {"message": ERROR_FIELD_REQUIRED.format("content")},
            status=status.HTTP_400_BAD_REQUEST,
        )

    session: ChatSession = get_object_or_404(ChatSession, id=session_uuid, user=request.user)

    try:
        generated_title = generate_title(content=content)
        generated_title = generated_title[:MAX_TITLE_LENGTH]
    except Exception as e:
        logger.error("Error when generating title: %s", e)
        generated_title = " ".join(content.split()[:7]) or "New chat"

    session.title = generated_title
    session.save()

    return JsonResponse(
        {
            "message": "Title generated successfully",
            "data": {"title": generated_title},
        },
        status=status.HTTP_200_OK,
    )
