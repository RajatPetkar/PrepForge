# Database Design

## PostgreSQL Source of Truth

PostgreSQL stores application state, user data, document metadata, chunk metadata, conversations, analytics, and evaluation records.

The implemented Module 2 schema lives in `apps/api/src/placement_api/models` with Alembic migrations in `apps/api/migrations`.

Note: PostgreSQL columns named `metadata` are exposed in SQLAlchemy models as `metadata_` because `metadata` is reserved by SQLAlchemy's Declarative API. The database column name still remains `metadata`.

## Initial Entity Relationship Diagram

```mermaid
erDiagram
  users ||--o{ documents : uploads
  users ||--o{ conversations : owns
  users ||--o{ resume_reports : owns
  users ||--o{ study_plans : owns
  users ||--o{ mock_interviews : owns
  documents ||--o{ document_versions : has
  document_versions ||--o{ chunks : contains
  conversations ||--o{ messages : contains
  messages ||--o{ message_citations : cites
  chunks ||--o{ message_citations : referenced_by
  companies ||--o{ company_topics : has
  companies ||--o{ interview_experiences : has
  mock_interviews ||--o{ mock_interview_turns : contains

  users {
    uuid id PK
    string email UK
    string password_hash
    string full_name
    string role
    timestamp created_at
    timestamp updated_at
  }

  documents {
    uuid id PK
    uuid uploaded_by FK
    string title
    string source_type
    string storage_path
    string status
    jsonb metadata
    timestamp created_at
  }

  document_versions {
    uuid id PK
    uuid document_id FK
    int version
    string checksum
    string parser_version
    string embedding_model
    timestamp created_at
  }

  chunks {
    uuid id PK
    uuid document_version_id FK
    string qdrant_point_id UK
    int chunk_index
    text content
    jsonb metadata
    timestamp created_at
  }

  conversations {
    uuid id PK
    uuid user_id FK
    string title
    jsonb metadata
    timestamp created_at
  }

  messages {
    uuid id PK
    uuid conversation_id FK
    string role
    text content
    float confidence_score
    jsonb metadata
    timestamp created_at
  }

  message_citations {
    uuid id PK
    uuid message_id FK
    uuid chunk_id FK
    int citation_index
    float relevance_score
  }
```

## Important Indexes

- `users.email` unique index
- `documents.uploaded_by`
- `documents.status`
- `documents.metadata` GIN index
- `chunks.document_version_id`
- `chunks.qdrant_point_id` unique index
- `chunks.metadata` GIN index
- `conversations.user_id`
- `messages.conversation_id`
- `message_citations.message_id`
- `message_citations.chunk_id`

## Qdrant Collection Design

Collection: `placement_chunks_v1`

Vector:

- Size: depends on `BAAI/bge-large-en-v1.5`
- Distance: cosine

Payload fields:

- `chunk_id`
- `document_id`
- `document_version_id`
- `title`
- `topic`
- `difficulty`
- `company`
- `tags`
- `source`
- `upload_date`
- `author`
- `content_hash`
- `embedding_model`

Payload indexes:

- `topic`
- `difficulty`
- `company`
- `tags`
- `source`
- `upload_date`
- `author`

## Why Duplicate Metadata in PostgreSQL and Qdrant

PostgreSQL remains authoritative and supports relational workflows. Qdrant payloads enable fast vector search filtering without joining back to PostgreSQL during candidate retrieval.
