"""Simple context window management for chat conversations."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

import tiktoken

from common.constants import MAX_CONTEXT_TOKENS, MODEL_NAME_FOR_TOKENS

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_encoding() -> tiktoken.Encoding:
    """Get and cache the tiktoken encoding for the model.

    Returns:
        tiktoken.Encoding instance for the configured model
    """
    return tiktoken.encoding_for_model(MODEL_NAME_FOR_TOKENS)


def count_tokens(text: str) -> int:
    """Count actual tokens using tiktoken.

    Args:
        text: Text to count tokens for

    Returns:
        Actual token count
    """
    if not text:
        return 0
    encoding = _get_encoding()
    return len(encoding.encode(text))


def trim_chat_history(
    messages: list[dict[str, Any]],
    max_tokens: int = MAX_CONTEXT_TOKENS,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Simple trimming: If over limit, drop old messages from the start.

    Strategy: Keep system message, drop oldest user/assistant messages until under budget.

    Args:
        messages: List of message dicts
        max_tokens: Maximum tokens allowed (default: 50k)

    Returns:
        Tuple of (trimmed_messages, metadata)
    """
    if not messages:
        return [], {"trimmed": False, "original_count": 0, "final_count": 0}

    total_tokens = 0
    for msg in messages:
        content = str(msg.get("content", ""))
        total_tokens += count_tokens(content)

    # If under budget, return as-is
    if total_tokens <= max_tokens:
        return messages, {
            "trimmed": False,
            "original_count": len(messages),
            "final_count": len(messages),
            "original_tokens": total_tokens,
            "final_tokens": total_tokens,
        }

    logger.info(f"Chat exceeds {max_tokens} tokens ({total_tokens}). Trimming...")

    # Keep system message, drop from oldest
    system_msg = None
    conversation_msgs = []

    for msg in messages:
        if msg.get("role") == "system" and system_msg is None:
            system_msg = msg
        else:
            conversation_msgs.append(msg)

    # Build result starting with system message
    result = [system_msg] if system_msg else []
    current_tokens = count_tokens(str(system_msg.get("content", ""))) if system_msg else 0

    # Add messages from the END (most recent first) until we hit budget
    for msg in reversed(conversation_msgs):
        msg_tokens = count_tokens(str(msg.get("content", "")))
        if current_tokens + msg_tokens <= max_tokens:
            result.insert(1 if system_msg else 0, msg)  # Insert after system msg
            current_tokens += msg_tokens
        else:
            break

    final_tokens = sum(count_tokens(str(msg.get("content", ""))) for msg in result)

    logger.info(
        f"Trimmed: {len(messages)} -> {len(result)} messages, "
        f"{total_tokens} -> {final_tokens} tokens"
    )

    return result, {
        "trimmed": True,
        "original_count": len(messages),
        "final_count": len(result),
        "original_tokens": total_tokens,
        "final_tokens": final_tokens,
        "removed_count": len(messages) - len(result),
    }
