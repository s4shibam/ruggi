# Ruggi (RAG Chat) Backend Architecture

This document describes the backend architecture for the Rag Chat project ("Ruggi"), focusing on data model, API flows, document processing, and chat response orchestration. It is written to support technical interviews and deep dives.

## 1. System Overview

### Core components

- Django API (apps/api) serving REST endpoints for auth, user profile, documents, and chat.
- PostgreSQL database with pgvector for semantic search embeddings.
- Celery workers for background document processing.
- Celery Beat for periodic retries of queued documents.
- AWS S3 for document storage and presigned upload/download.
- OpenAI APIs (LLM and embeddings) via LangChain.

### Request lifecycle (high level)

- Client authenticates via Google OAuth, uses session cookies.
- Documents are uploaded to S3 with a presigned URL and queued for background processing.
- Document processing extracts text, chunks it, embeds each chunk, and stores metadata + embeddings.
- Chat uses a tool-augmented LLM to retrieve context via vector search and respond with grounded answers.

## 2. Data Model (Postgres + pgvector)

```mermaid
erDiagram
    USER {
        uuid id PK
        string email
        string full_name
        string avatar
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    USER_PERSONALIZATION {
        uuid id PK
        uuid user_id FK
        string style_preferences
        string occupation
        string nick_name
        datetime created_at
        datetime updated_at
    }

    DOCUMENT {
        uuid id PK
        uuid owner_id FK
        string title
        string source
        string source_name
        string description
        string storage_url
        string document_type
        int size_kb
        string status
        text summary
        datetime created_at
        datetime updated_at
    }

    DOCUMENT_CHUNK {
        uuid id PK
        uuid document_id FK
        int order
        text text
        vector embedding
        datetime created_at
        datetime updated_at
    }

    CHAT_SESSION {
        uuid id PK
        uuid user_id FK
        string title
        boolean is_starred
        datetime created_at
        datetime updated_at
        datetime last_message_at
    }

    CHAT_MESSAGE {
        uuid id PK
        uuid session_id FK
        string role
        text content
        json metadata
        datetime created_at
        datetime updated_at
    }

    CHAT_SESSION_DOCUMENT {
        uuid id PK
        uuid chat_session_id FK
        uuid document_id FK
    }

    USER ||--|| USER_PERSONALIZATION : has
    USER ||--o{ DOCUMENT : owns
    DOCUMENT ||--o{ DOCUMENT_CHUNK : contains
    USER ||--o{ CHAT_SESSION : owns
    CHAT_SESSION ||--o{ CHAT_MESSAGE : contains
    CHAT_SESSION ||--o{ CHAT_SESSION_DOCUMENT : attaches
    DOCUMENT ||--o{ CHAT_SESSION_DOCUMENT : attached_to
```

Notes:

- `DOCUMENT_CHUNK.embedding` is a pgvector column (256-dim) used for semantic search.
- `CHAT_SESSION_DOCUMENT` is the implicit many-to-many join table created by Django for session attachments.

## 3. API Surface (Key Endpoints)

### Auth

- `POST /auth/google/login-url/` -> returns OAuth URL
- `GET /auth/google/callback/` -> OAuth callback, session login
- `POST /auth/logout/` -> logout

### User

- `GET /user/` -> profile
- `PUT/PATCH /user/update/` -> update profile + personalization
- `DELETE /user/delete/` -> delete account

### Documents

- `GET /document/` -> list documents
- `POST /document/upload/presign/` -> S3 presigned upload URL
- `POST /document/upload/complete/` -> create queued document record
- `GET /document/<id>/` -> document detail with chunk previews
- `PUT/PATCH /document/<id>/update/` -> update title/description
- `DELETE /document/<id>/delete/` -> delete document + S3 object

### Chat

- `POST /chat/message/` -> create user message + run LLM
- `GET /chat/session/` -> list sessions
- `GET /chat/session/<id>/` -> session detail + messages
- `PUT/PATCH /chat/session/<id>/update/` -> update title/starred
- `DELETE /chat/session/<id>/delete/` -> delete session
- `POST /chat/session/<id>/title/` -> generate title

## 4. Document Processing Architecture

### Flow (upload to processed)

```mermaid
flowchart TD
    A[Client] --> B[POST /document/upload/presign/]
    B --> C[Presigned S3 URL + storage_url]
    A --> D[PUT file to S3]
    A --> E[POST /document/upload/complete/]
    E --> F[Document row created: status=queued]
    F --> G[post_save signal -> enqueue Celery task]
    G --> H[Celery worker: process_document_task]
    H --> I[DocumentProcessor]
    I --> J[Download from S3]
    I --> K[Extract text: PDF/TXT/MD/HTML]
    I --> L[Split into chunks]
    I --> M[Generate embeddings]
    I --> N[LLM metadata: title/description/summary]
    I --> O[Persist DocumentChunk + update Document status=completed]
    H --> P[On failure: status=failed]

    Q[Celery Beat] --> R[enqueue_unprocessed_documents]
    R --> G
```

### Processing Design Details

- The upload is a two-step flow to keep large files out of the API server.
- Processing is asynchronous and idempotent. If a document is already processing/completed, duplicate tasks are skipped.
- The processor deletes old chunks before re-writing, ensuring chunk order consistency.
- Errors during processing mark the document as `failed` with logs.
- Celery Beat re-enqueues stale queued documents every 2 minutes (safety net).

## 5. Chat Response Architecture (RAG)

### Flow (message to response)

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB
    participant LLM
    participant Tools
    participant VectorDB

    Client->>API: POST /chat/message/ (content, session_id?, document_ids?)
    API->>DB: Create or load ChatSession
    API->>DB: Attach valid completed documents
    API->>DB: Store user ChatMessage
    API->>API: Build system prompt + chat history
    API->>API: Trim history to token budget
    API->>LLM: run_chat_with_tools (LangChain agent)
    LLM->>Tools: semantic_search / list_documents / get_full_document
    Tools->>VectorDB: pgvector similarity search on DocumentChunk
    VectorDB-->>Tools: top-k chunks + metadata
    Tools-->>LLM: tool results
    LLM-->>API: assistant answer + tool metadata
    API->>DB: Store assistant ChatMessage with metadata
    API-->>Client: response payload
```

### Chat Design Details

- The system prompt includes a document catalog and tool instructions.
- Tooling is constrained to attached documents if any are provided.
- Semantic search uses pgvector cosine similarity on chunk embeddings.
- The response metadata stores tool usage, chunk IDs, and attached document IDs.
- History is trimmed based on actual token counts using `tiktoken`.

## 6. Background Jobs and Scheduling

- `document.process_document` (Celery task): processes a specific document.
- `document.enqueue_unprocessed_documents` (Celery Beat): every 2 minutes, enqueues queued documents older than 1 minute.

## 7. Security and Authorization

- Auth is handled via Google OAuth and Django sessions.
- Document access is always scoped to the authenticated user.
- Chat sessions are user-owned; invalid or unauthorized session access is rejected.

## 8. External Dependencies

- AWS S3: document storage and presigned uploads.
- PostgreSQL + pgvector: persistent storage and vector similarity search.
- OpenAI (via LangChain): chat completion and embeddings.
- Redis: Celery broker and result backend.

## 9. Operational Notes

- If `OPENAI_API_KEY` is missing, document processing and chat will fail fast.
- Document types supported: PDF, TXT, MD, HTML.
- Upload size limit: 10 MB.
- Vector embedding dimension: 256.
