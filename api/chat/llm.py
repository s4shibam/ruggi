from __future__ import annotations

import logging
from typing import Any

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from common.constants import (
    EMBEDDING_MODEL_NAME,
    LLM_MAX_TOOL_CALLS,
    LLM_MODEL_NAME,
    LLM_TEMPERATURE,
    OPENAI_EMBEDDING_DIMENSION,
    TITLE_MAX_TOKENS,
    TITLE_TEMPERATURE,
)
from config.settings import OPENAI_API_KEY

from .prompts import build_title_messages
from .tools import create_tools

logger = logging.getLogger(__name__)


def _coerce_message_content(content: Any) -> str:
    """Coerce message content to string."""
    if content is None:
        return ""

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text") or ""
                parts.append(str(text))
            elif isinstance(item, str):
                parts.append(item)
        return "".join(parts).strip()

    return str(content).strip()


def get_chat_model(temperature: float = LLM_TEMPERATURE) -> ChatOpenAI:
    """Get configured ChatOpenAI model instance."""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured")

    return ChatOpenAI(
        model=LLM_MODEL_NAME,
        temperature=temperature,
        openai_api_key=OPENAI_API_KEY,
    )


def get_embeddings_model() -> OpenAIEmbeddings:
    """Get configured OpenAI embeddings model instance."""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured")

    return OpenAIEmbeddings(
        model=EMBEDDING_MODEL_NAME,
        dimensions=OPENAI_EMBEDDING_DIMENSION,
        openai_api_key=OPENAI_API_KEY,
    )


def _fallback_title(content: str) -> str:
    """Generate fallback title from content."""
    words = content.strip().split()
    if not words:
        return "New chat"
    return " ".join(words[:7])


def _normalize_title(raw_title: str, fallback: str) -> str:
    """Normalize generated title."""
    cleaned = " ".join(raw_title.replace("\n", " ").split())
    if not cleaned:
        cleaned = fallback

    if cleaned and cleaned[-1] in {".", "!", "?"}:
        cleaned = cleaned[:-1]

    words = cleaned.split()
    if len(words) > 7:
        cleaned = " ".join(words[:7])
    elif len(words) < 4 and fallback:
        fallback_words = fallback.split()
        needed = 4 - len(words)
        cleaned = " ".join(words + fallback_words[:needed])

    return cleaned.strip()


def generate_title(content: str) -> str:
    """Generate chat title using LangChain ChatOpenAI model.

    Args:
        content: The content to generate title from.

    Returns:
        Generated title string.
    """
    fallback = _fallback_title(content)
    try:
        model = get_chat_model(temperature=TITLE_TEMPERATURE)

        # Convert message dicts to LangChain message objects
        title_messages = build_title_messages(content)
        langchain_messages: list[BaseMessage] = []
        for msg in title_messages:
            if msg["role"] == "system":
                langchain_messages.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))

        response = model.invoke(
            langchain_messages,
            max_tokens=TITLE_MAX_TOKENS,
        )
        raw_title = _coerce_message_content(response.content)
        return _normalize_title(raw_title, fallback)
    except Exception as e:
        logger.exception("Failed to generate title via LLM: %s", e)
        return fallback


def _convert_messages_to_langchain(messages: list[dict[str, Any]]) -> list[BaseMessage]:
    """Convert message dictionaries to LangChain message objects."""
    langchain_messages: list[BaseMessage] = []

    for msg in messages:
        role = msg.get("role")
        content = msg.get("content", "")

        if role == "system":
            langchain_messages.append(SystemMessage(content=content))
        elif role == "user":
            langchain_messages.append(HumanMessage(content=content))
        elif role == "assistant":
            tool_calls = msg.get("tool_calls")
            if tool_calls:
                # Convert tool_calls format if needed
                langchain_messages.append(
                    AIMessage(content=content, additional_kwargs={"tool_calls": tool_calls})
                )
            else:
                langchain_messages.append(AIMessage(content=content))
        elif role == "tool":
            tool_call_id = msg.get("tool_call_id", "")
            langchain_messages.append(ToolMessage(content=content, tool_call_id=tool_call_id))

    return langchain_messages


def _extract_tool_metadata_from_messages(messages: list[BaseMessage]) -> dict[str, Any]:
    """Extract tool call metadata and document IDs from agent messages."""
    tool_calls_metadata: list[dict[str, Any]] = []
    chunk_ids_used: set[str] = set()
    document_ids_used: set[str] = set()
    tool_call_count = 0

    for msg in messages:
        if isinstance(msg, AIMessage) and msg.tool_calls:
            for tool_call in msg.tool_calls:
                tool_call_count += 1
                tool_calls_metadata.append({
                    "id": tool_call.get("id", ""),
                    "name": tool_call.get("name", ""),
                    "arguments": tool_call.get("args", {}),
                })

        # Extract document and chunk IDs from tool messages
        if isinstance(msg, ToolMessage):
            try:
                import json

                content_data = json.loads(msg.content)
                if isinstance(content_data, dict):
                    # Extract chunk IDs
                    chunks = content_data.get("chunks", [])
                    for chunk in chunks:
                        if isinstance(chunk, dict):
                            chunk_id = chunk.get("chunk_id")
                            doc_id = chunk.get("document_id")
                            if chunk_id:
                                chunk_ids_used.add(str(chunk_id))
                            if doc_id:
                                document_ids_used.add(str(doc_id))

                    # Extract document IDs from search results
                    doc_ids_searched = content_data.get("document_ids_searched", [])
                    for doc_id in doc_ids_searched:
                        document_ids_used.add(str(doc_id))
            except (json.JSONDecodeError, AttributeError):
                pass

    return {
        "tool_calls_metadata": tool_calls_metadata,
        "chunk_ids_used": chunk_ids_used,
        "document_ids_used": document_ids_used,
        "tool_call_count": tool_call_count,
    }


def run_chat_with_tools(
    *,
    messages: list[dict[str, Any]],
    attached_document_ids: list[str],
    user,
    temperature: float = LLM_TEMPERATURE,
) -> dict[str, Any]:
    """Run chat with tools using LangChain agents.

    Args:
        messages: List of message dictionaries with role and content.
        attached_document_ids: List of document IDs to search within.
        user: Django user object for authorization.
        temperature: LLM temperature setting.

    Returns:
        Dictionary containing answer, tool usage metadata, and token usage.
    """
    # Initialize models
    llm = get_chat_model(temperature=temperature)
    embeddings = get_embeddings_model()

    # Create tools with injected dependencies
    tools = create_tools(
        embeddings_model=embeddings,
        user=user,
        attached_document_ids=attached_document_ids,
    )

    # Convert messages to LangChain format
    langchain_messages = _convert_messages_to_langchain(messages)

    # Create agent with LangChain
    agent_executor = create_agent(
        llm,
        tools,
    )

    # Run agent
    try:
        result = agent_executor.invoke(
            {"messages": langchain_messages}, config={"recursion_limit": LLM_MAX_TOOL_CALLS}
        )

        # Extract all messages from the result
        all_messages = result.get("messages", [])

        # Extract final answer from the last AI message
        final_answer = ""
        for msg in reversed(all_messages):
            if isinstance(msg, AIMessage) and msg.content:
                final_answer = _coerce_message_content(msg.content)
                break

        # Extract metadata
        metadata = _extract_tool_metadata_from_messages(all_messages)

        # Estimate token usage (LangChain doesn't always provide this easily)
        # For now, we'll return placeholder values
        total_usage = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }

        return {
            "answer": final_answer,
            "tool_call_count": metadata["tool_call_count"],
            "tool_calls": metadata["tool_calls_metadata"],
            "chunk_ids_used": metadata["chunk_ids_used"],
            "document_ids_used": metadata["document_ids_used"],
            "token_usage": total_usage,
            "model_name": LLM_MODEL_NAME,
            "tools": ["semantic_search", "list_documents", "get_full_document"],
        }

    except Exception as e:
        logger.exception("Agent execution failed: %s", e)
        raise
