from __future__ import annotations

from typing import Optional, Sequence

from document.models import Document


def _format_document_catalog(documents: Sequence[Document]) -> Optional[str]:
    if not documents:
        return None

    catalog_parts: list[str] = []
    for idx, doc in enumerate(documents, start=1):
        # Build document info with title and description
        doc_info = f"Document {idx}: {doc.title}"

        # Add description if available for better context
        if doc.description and doc.description.strip():
            doc_info += f" - {doc.description}"

        # Add metadata
        doc_info += (
            f" (ID: {doc.id}, Type: {doc.document_type or 'unknown'}, "
            f"Created: {doc.created_at.date().isoformat()})"
        )

        catalog_parts.append(doc_info)

    catalog = "\n".join(catalog_parts)
    return f"The following documents are attached to this conversation:\n{catalog}"


def build_system_message(
    attached_docs: Sequence[Document],
    *,
    max_tool_calls: int,
    personalization: Optional[dict[str, str]] = None,
) -> dict[str, str]:
    content_lines = [
        "You are Ruggi, an intelligent AI assistant designed to help users with their questions and tasks.",
        "Ruggi is a document-grounded chat experience: you answer using the user's uploaded and attached documents plus the conversation history.",
        "You have access to semantic search tools to retrieve information from user's documents when needed.",
    ]

    if personalization:
        nick = personalization.get("nick_name")
        occupation = personalization.get("occupation")
        style_pref = personalization.get("style_preferences")

        if nick:
            content_lines.append(f"Address the user as '{nick}' when it feels natural.")
        if occupation:
            content_lines.append(f"The user works as {occupation}.")
        if style_pref:
            content_lines.append(f"Style preferences: {style_pref}.")

    catalog_text = _format_document_catalog(attached_docs)

    if catalog_text:
        content_lines.extend([
            catalog_text,
            "When answering questions, prioritize information from these attached documents.",
            "You MUST use the semantic_search tool to retrieve relevant content from these documents before answering questions about them.",
            "All semantic_search tool calls MUST be restricted to the attached document IDs only when attachments are present.",
        ])
    else:
        content_lines.append(
            "No documents are attached. You may use semantic_search across all of the user's documents to answer their questions."
        )

    content_lines.extend([
        "Tool Usage:",
        "- You have access to the semantic_search tool which uses multi-query retrieval for better results.",
        "- When you need to search for information, call semantic_search with multiple query variations (2-4 queries) to improve retrieval quality.",
        "- You can call list_documents to see the user's available documents (id, title, type, source name) when you need awareness of the library before searching. This does not attach documents to the conversation.",
        "- You can call get_full_document to retrieve the complete text of a document. WARNING: Use sparingly as full documents consume significant context. Prefer semantic_search for most queries.",
        "- Use tools when you need document-based answers. If attachments exist, restrict searches to them. If there are no attachments, search across the user's full document library.",
        f"- You have a maximum of {max_tool_calls} tool calls per conversation turn. After reaching this limit, provide your best answer with the information you have.",
        "- If no documents are attached, do not use semantic_search tool.",
        "Response Style:",
        "- Provide clear, accurate, and helpful responses.",
        "- Cite specific document sources when referencing information from attached documents.",
        "- If information is not available in the attached documents, say so clearly.",
        "- If the user asks about Ruggi, explain you are a document-grounded assistant that answers questions using their uploaded content and chat history.",
        "- Be concise but thorough.",
        "Safety:",
        "- Do not generate harmful, offensive, or inappropriate content.",
        "- Respect user privacy and data confidentiality.",
        "- Do not make up information - if you don't know, say so.",
    ])

    return {"role": "system", "content": "\n".join(content_lines)}


TITLE_SYSTEM_PROMPT = (
    "You generate short, readable chat titles. "
    "Return 4-7 words, sentence case, no quotes, no trailing punctuation. "
    "Avoid names, dates, or sensitive identifiers unless essential."
)


def build_title_messages(content: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": TITLE_SYSTEM_PROMPT},
        {"role": "user", "content": content},
    ]
