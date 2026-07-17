# AI Placement Assistant

Production-oriented Retrieval-Augmented Generation platform for placement preparation, interview practice, resume feedback, and company-wise preparation.
This project is intentionally built module by module. Each module must include:

1. Concept explanation
2. Reason for inclusion
3. Alternatives
4. Trade-offs
5. Production-quality code
6. Code explanation
7. Improvement suggestions
8. Confirmation before moving to the next module

## Current Status

Module 2 is complete: PostgreSQL schema, SQLAlchemy models, async database session setup, and Alembic migration baseline.

## Core Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- Backend: FastAPI, SQLAlchemy, JWT auth
- Database: PostgreSQL
- Vector database: Qdrant
- Cache and queues: Redis
- RAG: LlamaIndex, LangGraph, BAAI/bge-large-en-v1.5, BAAI/bge-reranker-large
- LLM: Groq API
- Infrastructure: Docker Compose locally, Vercel frontend, Railway/Render/AWS backend

## Repository Layout

```text
ai-placement-assistant/
  apps/
    api/                 FastAPI backend
    web/                 Next.js frontend
  packages/
    rag/                 Retrieval, ingestion, reranking, prompt orchestration
    shared/              Shared contracts and generated types
  workers/
    ingestion/           Background document indexing workers
  infra/
    docker/              Dockerfiles and compose overrides
    postgres/            PostgreSQL init and migrations support
    qdrant/              Qdrant configuration
    redis/               Redis configuration
  docs/
    architecture/        System design, diagrams, decisions
    api/                 REST API specifications
    database/            PostgreSQL and Qdrant schemas
    deployment/          Deployment guides
  scripts/               Developer and operational scripts
  storage/
    uploads/             Local uploaded raw files
    processed/           Local processed extraction artifacts
  tests/
    backend/             Backend tests
    frontend/            Frontend tests
    rag/                 Retrieval and generation evaluation tests
```

## Module Roadmap

1. Module 1: Backend foundation with FastAPI settings, health checks, logging, error handling, Docker wiring. Complete.
2. Module 2: PostgreSQL schema, SQLAlchemy models, Alembic migrations. Complete.
3. Module 3: JWT authentication and role-based access. Next.
4. Module 4: Document ingestion service
5. Module 5: Qdrant vector schema and dense retrieval
6. Module 6: Hybrid search with BM25 plus dense retrieval
7. Module 7: Reranking, context compression, citation generation
8. Module 8: Gemini/LangGraph chat orchestration with streaming
9. Module 9: Frontend shell, dashboard, auth screens
10. Module 10: AI chat UI with citations and streaming
11. Module 11: Resume analyzer
12. Module 12: Company preparation pages
13. Module 13: Study planner
14. Module 14: Mock interview engine
15. Module 15: Admin panel
16. Module 16: Evaluation, observability, analytics, deployment hardening

## Local Development Target

The first runnable milestone exposes:

- `GET /health`
- PostgreSQL
- Redis
- Qdrant
- API configuration loaded from environment
- Structured logs

## Resume Point

Read [PROJECT_PROGRESS.md](./PROJECT_PROGRESS.md) before continuing work. It records the last completed module and the next module to start.
