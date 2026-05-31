import asyncio
import json
import logging
import queue
import threading
import uuid
from typing import Any, Optional

from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db import close_old_connections, transaction
from django.db.models import Count
from django.http import JsonResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from langchain_core.callbacks import BaseCallbackHandler
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
    ERROR_LIMIT_EXCEEDED_CHATS,
    ERROR_NOT_AUTHORIZED,
    MAX_PAGE_SIZE,
    MAX_TITLE_LENGTH,
    SUCCESS_DELETED,
    SUCCESS_RETRIEVED,
    SUCCESS_UPDATED,
)
from common.types import AuthenticatedHttpRequest
from document.models import Document
from plan.helpers import can_add_chat, deduct_chat
from plan.models import Plan
from plan.views import check_and_reset_if_needed

from .context import trim_chat_history
from .llm import LLM_MAX_TOOL_CALLS, LLM_TEMPERATURE, generate_title, run_chat_with_tools
from .models import ChatMessage, ChatSession
from .prompts import build_system_message
from .tools import TOOL_LOADING_MESSAGES

logger = logging.getLogger(__name__)

SseQueueItem = tuple[str, dict[str, Any]] | None


class ChatStreamingCallbackHandler(BaseCallbackHandler):
    def __init__(self, event_queue: "queue.Queue[SseQueueItem]"):
        self.event_queue = event_queue

    def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        if token:
            self.event_queue.put(("chunk", {"content": token}))

    def on_tool_start(
        self,
        serialized: dict[str, Any],
        input_str: str,
        **kwargs: Any,
    ) -> None:
        tool_name = str(kwargs.get("name") or serialized.get("name") or "tool")
        self.event_queue.put((
            "tool_start",
            {
                "tool_name": tool_name,
                "message": TOOL_LOADING_MESSAGES.get(tool_name, f"Using {tool_name}..."),
            },
        ))


def _sse_event(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _sse_response(streaming_content: Any) -> StreamingHttpResponse:
    response = StreamingHttpResponse(streaming_content, content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


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


def _build_completion_inputs(
    *,
    session: ChatSession,
    attached_documents: list[Document],
    user,
) -> tuple[list[dict[str, Any]], list[str], dict[str, Any]]:
    attached_document_ids = [str(doc.id) for doc in attached_documents]

    past_messages = session.messages.all().order_by("created_at")
    chat_history = [{"role": msg.role, "content": msg.content} for msg in past_messages]

    system_message = build_system_message(
        attached_docs=attached_documents,
        max_tool_calls=LLM_MAX_TOOL_CALLS,
        personalization=_get_user_personalization(user),
    )

    messages_payload = [system_message, *chat_history]
    trimmed_messages, trim_metadata = trim_chat_history(messages_payload)

    return trimmed_messages, attached_document_ids, trim_metadata


def _serialize_attached_documents(documents: list[Document]) -> list[dict[str, Any]]:
    return [
        {
            "id": str(doc.id),
            "title": doc.title,
            "description": doc.description,
        }
        for doc in documents
    ]


def _build_tool_usage(
    llm_result: dict[str, Any], trim_metadata: dict[str, Any]
) -> dict[str, Any] | None:
    if llm_result.get("tool_call_count"):
        return {
            "tool_call_count": llm_result.get("tool_call_count"),
            "documents_searched": list(llm_result.get("document_ids_used", [])),
            "context_trimmed": trim_metadata.get("trimmed", False),
        }

    if trim_metadata.get("trimmed"):
        return {"context_trimmed": trim_metadata.get("trimmed", False)}

    return None


def _create_user_chat_message(
    *,
    session_id: Optional[str],
    content: str,
    document_ids: Optional[list[str]],
    user,
) -> tuple[ChatSession, list[Document]]:
    with transaction.atomic():
        session = _get_or_create_session(session_id, user)
        attached_documents = _validate_and_set_attached_documents(
            session=session, document_ids=document_ids, user=user
        )
        ChatMessage.objects.create(session=session, role=CHAT_ROLE_USER, content=content)

    return session, attached_documents


def _create_limit_exceeded_data(
    *,
    session_id: Optional[str],
    content: str,
    document_ids: Optional[list[str]],
    user,
) -> dict[str, Any]:
    with transaction.atomic():
        session = _get_or_create_session(session_id, user)
        attached_documents = _validate_and_set_attached_documents(
            session=session, document_ids=document_ids, user=user
        )
        ChatMessage.objects.create(session=session, role=CHAT_ROLE_USER, content=content)

        limit_message = ERROR_LIMIT_EXCEEDED_CHATS
        assistant_message = ChatMessage.objects.create(
            session=session,
            role=CHAT_ROLE_ASSISTANT,
            content=limit_message,
            metadata={"limit_exceeded": True},
        )

        session.last_message_at = assistant_message.created_at
        session.save(update_fields=["last_message_at", "updated_at"])

    return {
        "session_id": str(session.id),
        "assistant_message_content": limit_message,
        "attached_documents": _serialize_attached_documents(attached_documents),
        "limit_exceeded": True,
    }


def _assistant_message_metadata(
    llm_result: dict[str, Any],
    attached_document_ids: list[str],
) -> dict[str, Any]:
    return {
        "model_name": llm_result.get("model_name"),
        "temperature": LLM_TEMPERATURE,
        "token_usage": llm_result.get("token_usage"),
        "tool_call_count": llm_result.get("tool_call_count"),
        "tool_calls": llm_result.get("tool_calls"),
        "chunk_ids_used": list(llm_result.get("chunk_ids_used", [])),
        "document_ids_used": list(llm_result.get("document_ids_used", [])),
        "attached_document_ids": attached_document_ids,
    }


def _persist_assistant_completion(
    *,
    session: ChatSession,
    llm_result: dict[str, Any],
    attached_document_ids: list[str],
    user,
) -> ChatMessage:
    assistant_message: ChatMessage = ChatMessage.objects.create(
        session=session,
        role=CHAT_ROLE_ASSISTANT,
        content=llm_result["answer"],
        metadata=_assistant_message_metadata(llm_result, attached_document_ids),
    )

    session.last_message_at = assistant_message.created_at
    session.save(update_fields=["last_message_at", "updated_at"])

    try:
        user_plan = user.plan
        deduct_chat(user_plan)
    except Exception as plan_error:
        logger.error(f"Failed to deduct chat from plan: {plan_error}", exc_info=True)

    return assistant_message


def _completion_data(
    *,
    session_id: uuid.UUID,
    llm_result: dict[str, Any],
    attached_documents: list[Document],
    trim_metadata: dict[str, Any],
) -> dict[str, Any]:
    return {
        "session_id": str(session_id),
        "assistant_message_content": llm_result["answer"],
        "attached_documents": _serialize_attached_documents(attached_documents),
        "tool_usage": _build_tool_usage(llm_result, trim_metadata),
    }


def _stream_limit_exceeded(data: dict[str, Any]) -> StreamingHttpResponse:
    async def event_stream():
        yield _sse_event("chunk", {"content": data["assistant_message_content"]})
        yield _sse_event("complete", data)

    return _sse_response(event_stream())


def _run_streaming_completion(
    *,
    event_queue: "queue.Queue[SseQueueItem]",
    session_id: uuid.UUID,
    attached_documents: list[Document],
    messages: list[dict[str, Any]],
    attached_document_ids: list[str],
    trim_metadata: dict[str, Any],
    user,
) -> None:
    try:
        close_old_connections()
        callback = ChatStreamingCallbackHandler(event_queue)
        llm_result = run_chat_with_tools(
            messages=messages,
            attached_document_ids=attached_document_ids,
            user=user,
            temperature=LLM_TEMPERATURE,
            callbacks=[callback],
        )

        with transaction.atomic():
            session = ChatSession.objects.select_for_update().get(id=session_id, user=user)
            _persist_assistant_completion(
                session=session,
                llm_result=llm_result,
                attached_document_ids=attached_document_ids,
                user=user,
            )

        event_queue.put((
            "complete",
            _completion_data(
                session_id=session_id,
                llm_result=llm_result,
                attached_documents=attached_documents,
                trim_metadata=trim_metadata,
            ),
        ))
    except Exception as e:
        logger.exception("Streaming LLM orchestration failed for session %s", session_id)
        event_queue.put(("error", {"message": f"An error occurred: {str(e)}"}))
    finally:
        close_old_connections()
        event_queue.put(None)


def _make_streaming_response(
    *,
    session_id: uuid.UUID,
    attached_documents: list[Document],
    messages: list[dict[str, Any]],
    attached_document_ids: list[str],
    trim_metadata: dict[str, Any],
    user,
) -> StreamingHttpResponse:
    event_queue: "queue.Queue[SseQueueItem]" = queue.Queue()
    worker = threading.Thread(
        target=_run_streaming_completion,
        kwargs={
            "event_queue": event_queue,
            "session_id": session_id,
            "attached_documents": attached_documents,
            "messages": messages,
            "attached_document_ids": attached_document_ids,
            "trim_metadata": trim_metadata,
            "user": user,
        },
        daemon=True,
    )
    worker.start()

    async def event_stream():
        while True:
            item = await asyncio.to_thread(event_queue.get)
            if item is None:
                break
            event, data = item
            yield _sse_event(event, data)

    return _sse_response(event_stream())


@login_required
@csrf_exempt
@require_POST
def create_chat_message_stream(
    request: AuthenticatedHttpRequest,
) -> StreamingHttpResponse | JsonResponse:
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
        user_plan = request.user.plan
        check_and_reset_if_needed(user_plan)

        if not can_add_chat(user_plan):
            try:
                return _stream_limit_exceeded(
                    _create_limit_exceeded_data(
                        session_id=session_id,
                        content=content,
                        document_ids=document_ids,
                        user=request.user,
                    )
                )
            except Exception:
                logger.exception(
                    "Failed to store limit exceeded message for user %s", request.user.id
                )
                return JsonResponse(
                    {"message": ERROR_LIMIT_EXCEEDED_CHATS},
                    status=status.HTTP_403_FORBIDDEN,
                )
    except Plan.DoesNotExist:
        logger.error(f"No plan found for user {request.user.id}")
        return JsonResponse(
            {"message": "No plan found. Please contact support."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        session, attached_documents = _create_user_chat_message(
            session_id=session_id,
            content=content,
            document_ids=document_ids,
            user=request.user,
        )
    except ValueError as e:
        return JsonResponse({"message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except PermissionError as e:
        return JsonResponse({"message": str(e)}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        user_id = request.user.id if request.user.is_authenticated else "unknown"
        logger.exception("Failed to create chat session/message for user %s", user_id)
        return JsonResponse(
            {"message": f"An error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    trimmed_messages, attached_document_ids, trim_metadata = _build_completion_inputs(
        session=session,
        attached_documents=attached_documents,
        user=request.user,
    )

    return _make_streaming_response(
        session_id=session.id,
        attached_documents=attached_documents,
        messages=trimmed_messages,
        attached_document_ids=attached_document_ids,
        trim_metadata=trim_metadata,
        user=request.user,
    )


@login_required
@csrf_exempt
@require_POST
def create_chat_message(request: AuthenticatedHttpRequest) -> JsonResponse:
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

    # Check user plan limits
    try:
        user_plan = request.user.plan
        # Check and reset limits if needed (for Pro plans)
        check_and_reset_if_needed(user_plan)

        if not can_add_chat(user_plan):
            # User has exceeded chat limit - store this info and return readable message
            try:
                return JsonResponse(
                    {
                        "message": "Chat limit exceeded",
                        "data": _create_limit_exceeded_data(
                            session_id=session_id,
                            content=content,
                            document_ids=document_ids,
                            user=request.user,
                        ),
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            except Exception:
                logger.exception(
                    "Failed to store limit exceeded message for user %s", request.user.id
                )
                return JsonResponse(
                    {"message": ERROR_LIMIT_EXCEEDED_CHATS},
                    status=status.HTTP_403_FORBIDDEN,
                )
    except Plan.DoesNotExist:
        logger.error(f"No plan found for user {request.user.id}")
        return JsonResponse(
            {"message": "No plan found. Please contact support."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        session, attached_documents = _create_user_chat_message(
            session_id=session_id,
            content=content,
            document_ids=document_ids,
            user=request.user,
        )
    except ValueError as e:
        return JsonResponse({"message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except PermissionError as e:
        return JsonResponse({"message": str(e)}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        user_id = request.user.id if request.user.is_authenticated else "unknown"
        logger.exception("Failed to create chat session/message for user %s", user_id)
        return JsonResponse(
            {"message": f"An error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    trimmed_messages, attached_document_ids, trim_metadata = _build_completion_inputs(
        session=session,
        attached_documents=attached_documents,
        user=request.user,
    )

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
            _persist_assistant_completion(
                session=session,
                llm_result=llm_result,
                attached_document_ids=attached_document_ids,
                user=request.user,
            )
    except Exception as e:
        logger.exception("Failed to persist assistant message for session %s", session.id)
        return JsonResponse(
            {"message": f"An error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return JsonResponse(
        {
            "message": "Completion generated successfully",
            "data": _completion_data(
                session_id=session.id,
                llm_result=llm_result,
                attached_documents=attached_documents,
                trim_metadata=trim_metadata,
            ),
        },
        status=status.HTTP_201_CREATED,
    )


@login_required
@require_GET
def get_all_chats(request: AuthenticatedHttpRequest) -> JsonResponse:
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
def get_chat_detail(request: AuthenticatedHttpRequest, chat_id: uuid.UUID) -> JsonResponse:
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
def update_chat(request: AuthenticatedHttpRequest, chat_id: uuid.UUID) -> JsonResponse:
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
def delete_chat(request: AuthenticatedHttpRequest, chat_id: uuid.UUID) -> JsonResponse:
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
def generate_chat_title(request: AuthenticatedHttpRequest, chat_id: uuid.UUID) -> JsonResponse:
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
