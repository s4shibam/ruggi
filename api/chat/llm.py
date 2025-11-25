from __future__ import annotations

import logging
from typing import Any

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from common.constants import (
    EMBEDDING_MODEL_NAME,
    LLM_MODEL_NAME,
    LLM_TEMPERATURE,
    OPENAI_EMBEDDING_DIMENSION,
    TITLE_MAX_TOKENS,
    TITLE_TEMPERATURE,
)
from config.settings import OPENAI_API_KEY

from .prompts import build_title_messages

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
