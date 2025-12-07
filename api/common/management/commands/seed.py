from __future__ import annotations

import random
from typing import Iterable

from django.core.management.base import BaseCommand
from django.db import transaction

from chat.models import ChatMessage, ChatSession
from common.constants import (
    CHAT_ROLE_ASSISTANT,
    CHAT_ROLE_USER,
    DOC_SOURCE_INTERNAL,
    DOC_SOURCE_UPLOAD,
    DOC_STATUS_COMPLETED,
    DOC_STATUS_FAILED,
    DOC_STATUS_PROCESSING,
    DOC_STATUS_QUEUED,
    DOC_TYPE_MD,
    DOC_TYPE_PDF,
    DOC_TYPE_TXT,
    OPENAI_EMBEDDING_DIMENSION,
)
from document.models import Document, DocumentChunk
from user.models import User, UserPersonalization


class Command(BaseCommand):
    help = "Seed the database with a user, documents, and chats for UI edge cases."

    def add_arguments(self, parser):
        parser.add_argument(
            "--name",
            "--full-name",
            dest="full_name",
            help="Full name for the seed user.",
        )
        parser.add_argument("--email", dest="email", help="Email for the seed user.")

    def handle(self, *args, **options):
        full_name = (options.get("full_name") or "").strip()
        email = (options.get("email") or "").strip()

        while not full_name:
            full_name = input("Enter full name for seed user: ").strip()
        while not email:
            email = input("Enter email for seed user: ").strip()

        with transaction.atomic():
            self._clean_all_data()
            user = self._ensure_user(full_name=full_name, email=email)
            docs = self._seed_documents(user=user)
            self._seed_chats(user=user, docs=docs)

        self.stdout.write(self.style.SUCCESS("Seed data created."))
        self.stdout.write(f"User: {user.full_name} <{user.email}>")

    def _ensure_user(self, *, full_name: str, email: str) -> User:
        user, created = User.objects.get_or_create(email=email, defaults={"full_name": full_name})
        if not created and user.full_name != full_name:
            user.full_name = full_name
            user.save(update_fields=["full_name"])

        nickname = full_name.split(" ", 1)[0]
        UserPersonalization.objects.update_or_create(
            user=user,
            defaults={
                "style_preferences": "Use a professional and concise tone. Prioritize clarity and actionable insights. Format responses with bullet points when listing multiple items.",
                "occupation": "Software Engineer",
                "nick_name": nickname,
            },
        )

        return user

    def _clean_all_data(self):
        """Wipe all user-related data to ensure seeding starts from a blank state."""
        self.stdout.write(self.style.WARNING("Clearing existing app data..."))
        ChatMessage.objects.all().delete()
        ChatSession.objects.all().delete()
        DocumentChunk.objects.all().delete()
        Document.objects.all().delete()
        UserPersonalization.objects.all().delete()
        User.objects.all().delete()

    def _seed_documents(self, *, user: User):
        zero_vector = [0.0] * OPENAI_EMBEDDING_DIMENSION

        doc_specs = [
            {
                "title": "System Architecture Overview",
                "status": DOC_STATUS_QUEUED,
                "source": DOC_SOURCE_UPLOAD,
                "document_type": DOC_TYPE_PDF,
                "storage_url": None,
                "size_kb": 1240,
                "source_name": "system-architecture-overview.pdf",
                "description": "High-level overview of system components, architecture patterns, and infrastructure design decisions.",
                "summary": None,
                "chunks": [],
            },
            {
                "title": "Development Setup Guide",
                "status": DOC_STATUS_PROCESSING,
                "source": DOC_SOURCE_UPLOAD,
                "document_type": DOC_TYPE_MD,
                "storage_url": "https://mock-bucket.s3.amazonaws.com/uploads/development-setup-guide.md",
                "size_kb": 456,
                "source_name": "development-setup-guide.md",
                "description": "Step-by-step instructions for setting up the development environment, dependencies, and local configuration.",
                "summary": None,
                "chunks": [],
            },
            {
                "title": "API Documentation Reference",
                "status": DOC_STATUS_COMPLETED,
                "source": DOC_SOURCE_INTERNAL,
                "document_type": DOC_TYPE_PDF,
                "storage_url": "https://mock-bucket.s3.amazonaws.com/docs/api-documentation-reference.pdf",
                "size_kb": 2847,
                "source_name": "api-documentation-reference.pdf",
                "description": "Comprehensive API reference covering authentication, rate limits, error handling, and all available REST endpoints for the platform.",
                "summary": "**REST API Documentation** for developers building integrations. Covers authentication with Bearer tokens, request/response formats using JSON, versioned endpoints under `/api/v1/`, and comprehensive error handling with standard HTTP status codes. Includes **rate limiting** (1000 requests/hour), token expiration policies (24 hours), and best practices for API consumption.",
                "chunks": [
                    {
                        "order": 0,
                        "text": "REST API Overview: Our API follows RESTful principles and uses JSON for request and response payloads. All endpoints are versioned under /api/v1/. The base URL is https://api.example.com. Authentication is required for all endpoints except public documentation.",
                        "embedding": self._random_vector(),
                    },
                    {
                        "order": 1,
                        "text": "Authentication: All requests require a Bearer token in the Authorization header. Tokens expire after 24 hours. To obtain a token, POST to /api/v1/auth/login with your credentials. Rate limits: 1000 requests per hour per API key. Exceeding limits returns HTTP 429.",
                        "embedding": self._random_vector(),
                    },
                    {
                        "order": 2,
                        "text": "Error Handling: The API uses standard HTTP status codes. 4xx errors indicate client issues (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found). 5xx errors indicate server issues. All error responses include a JSON body with 'error' and 'message' fields.",
                        "embedding": self._random_vector(),
                    },
                ],
            },
            {
                "title": "Code Review Notes",
                "status": DOC_STATUS_FAILED,
                "source": DOC_SOURCE_UPLOAD,
                "document_type": DOC_TYPE_TXT,
                "storage_url": None,
                "size_kb": None,
                "source_name": "code-review-notes.txt",
                "description": None,
                "summary": None,
                "chunks": [],
            },
            {
                "title": "Database Schema Reference",
                "status": DOC_STATUS_COMPLETED,
                "source": DOC_SOURCE_UPLOAD,
                "document_type": DOC_TYPE_TXT,
                "storage_url": "https://mock-bucket.s3.amazonaws.com/docs/database-schema-reference.txt",
                "size_kb": 92,
                "source_name": "database-schema-reference.txt",
                "description": "Technical documentation of the database schema including table structures, relationships, and indexing strategies.",
                "summary": "**Database Schema Documentation** outlining the core tables: users, documents, chat_sessions, and chat_messages. The **users table** handles authentication and profiles, the **documents table** tracks uploaded files with status tracking (queued, processing, completed, failed), and **chat sessions** link to users containing role-based messages for conversation history.",
                "chunks": [
                    {
                        "order": 0,
                        "text": "Database Schema: The main tables are users, documents, chat_sessions, and chat_messages. Users table stores authentication and profile data. Documents table tracks uploaded files with status (queued, processing, completed, failed). Chat sessions link to users and contain messages with role-based content.",
                        "embedding": zero_vector,
                    },
                ],
            },
            {
                "title": "Analytics Event Catalog",
                "status": DOC_STATUS_COMPLETED,
                "source": DOC_SOURCE_UPLOAD,
                "document_type": DOC_TYPE_MD,
                "storage_url": "https://mock-bucket.s3.amazonaws.com/docs/analytics-event-catalog.md",
                "size_kb": 178,
                "source_name": "analytics-event-catalog.md",
                "description": "Complete catalog of analytics events tracked across the platform including event schemas, naming conventions, and governance policies.",
                "summary": "**Analytics Event Tracking Guide** covering key events: page_view, signup_submitted, workspace_created, subscription_upgraded, and error_notification. Each event captures **user_id, session_id, timestamp**, source page, and optional experiment_variant. Emphasizes **governance**: use snake_case naming, avoid PII, include request_id for log correlation, and implement retry logic (3 attempts with exponential backoff) for critical events.",
                "chunks": [
                    {
                        "order": 0,
                        "text": "Analytics Event Catalog: Track page_view, signup_submitted, workspace_created, subscription_upgraded, and error_notification events. Each event includes user_id, session_id, timestamp, source page, and optional experiment_variant fields for downstream analysis.",
                        "embedding": zero_vector,
                    },
                    {
                        "order": 1,
                        "text": "Event Governance: Use consistent snake_case naming, avoid PII in event payloads, and include a request_id to correlate client and server logs. Critical events should be retried up to 3 times with exponential backoff before surfacing an error to the user.",
                        "embedding": zero_vector,
                    },
                ],
            },
        ]

        seeded = {}
        for spec in doc_specs:
            doc, _ = Document.objects.update_or_create(
                owner=user,
                title=spec["title"],
                defaults={
                    "status": spec["status"],
                    "source": spec["source"],
                    "document_type": spec["document_type"],
                    "storage_url": spec["storage_url"],
                    "size_kb": spec["size_kb"],
                    "source_name": spec["source_name"],
                    "description": spec["description"],
                    "summary": spec["summary"],
                },
            )

            doc.chunks.all().delete()
            for chunk in spec["chunks"]:
                DocumentChunk.objects.create(
                    document=doc,
                    order=chunk["order"],
                    text=chunk["text"],
                    embedding=chunk["embedding"],
                )
            seeded[spec["title"]] = doc
        return seeded

    def _seed_chats(self, *, user: User, docs: dict[str, Document]):
        api_doc = docs.get("API Documentation Reference")
        schema_doc = docs.get("Database Schema Reference")
        analytics_doc = docs.get("Analytics Event Catalog")

        long_session, _ = ChatSession.objects.update_or_create(
            user=user,
            title="Roadmap alignment for Q3 launch",
            defaults={"is_starred": True},
        )
        long_session.messages.all().delete()

        self._create_messages(
            session=long_session,
            messages=[
                {
                    "role": CHAT_ROLE_USER,
                    "content": "Let's outline the Q3 search revamp: we need better relevance, fresher indexing, and instrumentation for conversion tracking.",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": "I'd frame the streams as:\n- Relevance: semantic ranking, click feedback loops, quality benchmarks\n- Freshness: faster ingest, partial re-indexes, SLA alerts\n- Instrumentation: end-to-end funnel, dashboards, and rollout guardrails",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_USER,
                    "content": "Main risks? I'm worried about downtime during the index migration.",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": "- Index swap overruns: use blue/green indices and shadow reads\n- Relevance regressions: side-by-side eval sets with sign-off gates\n- Cache churn: segmented cache roll + circuit breakers on cache misses",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_USER,
                    "content": "We want a beta by mid-July. Can you sketch a timeline?",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": "Draft timeline:\n\n| Week | Focus |\n| --- | --- |\n| 1 | Schema, ingest adapters, evaluation harness |\n| 2 | Ranking signals + semantic tuning; golden datasets |\n| 3 | Cache strategy, shadow traffic, rollback drills |\n| 4 | Beta behind feature flag; feedback loop |\n| 5 | Hardening, dashboards, GA checklist |\n\n*Guardrails*: keep dogfooding at ~10% traffic and gate GA on relevance win-rate + error budget.",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_USER,
                    "content": "Instrumentation plan? Need clear signals for search to conversion.",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": "One-view funnel:\n\n```mermaid\nsequenceDiagram\n\n    autonumber\n\n    participant User\n    participant App\n    participant Logs\n\n    User ->> App: Page load\n    App ->> Logs: page_view(request_id)\n    User ->> App: Search\n    App ->> Logs: search_performed(query_hash, filters, request_id)\n    App ->> Logs: results_viewed(request_id)\n    User ->> App: Click result\n    App ->> Logs: result_clicked(rank, request_id)\n    User ->> App: Submit signup\n    App ->> Logs: signup_submitted(request_id)\n    App ->> Logs: workspace_created(request_id)\n```\n\nInclude `request_id`, query hash, filters, result rank, and `experiment_variant` so we can join analytics with server logs.",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_USER,
                    "content": "How do we keep stakeholders updated weekly?",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": "Send a Friday update covering:\n- Progress vs plan (traffic lights per stream)\n- Relevance metrics snapshot and notable regressions\n- Risks/blockers with owners\n- Next week's focus and rollout readiness",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_USER,
                    "content": "Give me a quick recap of who owns what.",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": "**Recap**:\n- You: roadmap owner, stakeholder comms, launch criteria\n- Search: relevance tuning, evaluation sets, cache strategy\n- Data: instrumentation, dashboards, alerting\n- Infra: blue/green indexing, rollout/rollback playbooks\n\nI'll draft the milestone doc for sign-off.",
                    "attach": [],
                },
            ],
        )

        two_doc_session, _ = ChatSession.objects.update_or_create(
            user=user,
            title="Analytics instrumentation handoff",
            defaults={"is_starred": False},
        )
        two_doc_session.messages.all().delete()

        self._create_messages(
            session=two_doc_session,
            messages=[
                {
                    "role": CHAT_ROLE_USER,
                    "content": "Attaching the API reference and the analytics catalog. I need the payload shape for workspace_created and how to guard against rate limits.",
                    "attach": [doc for doc in [api_doc, analytics_doc] if doc],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": 'Use the auth header from the [API reference](https://mock-bucket.s3.amazonaws.com/docs/api-documentation-reference.pdf): `Authorization: Bearer <token>` with JSON payload `{ "event": "workspace_created", "user_id": "", "plan": "", "request_id": "" }`. Include `experiment_variant` when present and send from a _background worker_ to avoid blocking the user flow.',
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_USER,
                    "content": "What do we return if the analytics endpoint responds with 429?",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": "Follow the API guidance: back off with jitter, retry up to 3 times, then drop the event into a dead-letter queue with the error body for replay. **Always** log `request_id` and `session_id` so we can correlate failures later.",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_USER,
                    "content": "Drop a minimal payload example that marks optional fields; I want to share it with the mobile team.",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": 'Example (optional fields noted):\n\n```json\n{\n  "event": "workspace_created",\n  "user_id": "u_123",\n  "plan": "pro",\n  "request_id": "req_789",\n  "experiment_variant": "search_tuned_v2"\n}\n```\n\n`request_id` and `experiment_variant` are optional but recommended. If you send from mobile, include a short `device` field (e.g., `"ios-17.5"`) for debugging.',
                    "attach": [],
                },
            ],
        )

        one_doc_session, _ = ChatSession.objects.update_or_create(
            user=user,
            title="Schema migration questions",
            defaults={"is_starred": False},
        )
        one_doc_session.messages.all().delete()

        self._create_messages(
            session=one_doc_session,
            messages=[
                {
                    "role": CHAT_ROLE_USER,
                    "content": "I'm reviewing the schema doc (_attached_). How do chat messages link to the documents they reference?",
                    "attach": [schema_doc] if schema_doc else [],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": "Each `chat_message` row can map to multiple documents through the `chat_message_documents` join table. We also store session-level attachments so recurring context doesn't need to be re-sent with every message.",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_USER,
                    "content": "Do we need additional indexes before the next migration?",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": "Add an index on `(session_id, created_at)` for ordering and another on the join table's `document_id` to speed up re-fetching context. No new foreign keys are required for the upcoming change.",
                    "attach": [],
                },
            ],
        )

        no_doc_session, _ = ChatSession.objects.update_or_create(
            user=user,
            title="Offsite agenda ideas",
            defaults={"is_starred": False},
        )
        no_doc_session.messages.all().delete()

        self._create_messages(
            session=no_doc_session,
            messages=[
                {
                    "role": CHAT_ROLE_USER,
                    "content": "Need three breakout topics for the team offsite.",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": "How about:\n\n1) Demo-driven roadmap reviews,\n2) Reliability runbooks and on-call drills,\n3) Customer journey mapping with live usability tests.",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_USER,
                    "content": "Add a closing session idea too.",
                    "attach": [],
                },
                {
                    "role": CHAT_ROLE_ASSISTANT,
                    "content": "Close with a lightning talk block and an AMA with leadership so people can surface risks while energy is still high. Let's also end with a brief retro so takeaways are captured while they're fresh.",
                    "attach": [],
                },
            ],
        )

    def _create_messages(self, *, session: ChatSession, messages: Iterable[dict]):
        attachments_by_id = {}
        for payload in messages:
            for doc in payload.get("attach", []):
                if doc:
                    attachments_by_id[doc.id] = doc

        if attachments_by_id:
            session.attached_documents.set(list(attachments_by_id.values()))
        else:
            session.attached_documents.clear()

        last_message = None
        for payload in messages:
            message = ChatMessage.objects.create(
                session=session,
                role=payload["role"],
                content=payload["content"],
                metadata={"seed": True},
            )
            last_message = message

        if last_message:
            session.last_message_at = last_message.created_at
            session.save(update_fields=["last_message_at"])

    def _random_vector(self):
        rng = random.Random(42)
        return [round(rng.uniform(-0.5, 0.5), 6) for _ in range(OPENAI_EMBEDDING_DIMENSION)]
