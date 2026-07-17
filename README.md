# PrepForge - AI Placement Assistant

A RAG-powered AI platform for interview preparation. Users upload resumes, chat with an AI tutor, generate study plans, solve coding problems, and track progress.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Compose                            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐   ┌───────────┐   │
│  │ Next.js   │───▶│ FastAPI  │───▶│PostgreSQL│   │  Qdrant   │   │
│  │ (Web UI)  │    │ (API)    │    │(Database)│   │(Vectors)  │   │
│  └──────────┘    └────┬─────┘    └──────────┘   └───────────┘   │
│                       │                                           │
│                       │    ┌──────────┐   ┌───────────────────┐  │
│                       ├───▶│  Redis   │   │   Groq API (LLM)  │  │
│                       │    │ (Cache)  │   │   (external)      │  │
│                       │    └──────────┘   └───────────────────┘  │
│                       │                                           │
│                       │    ┌──────────────────┐                   │
│                       └───▶│ FastEmbed (local)│                   │
│                            │ Embedding Models │                   │
│                            └──────────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
```

**Three tiers:**
- **Frontend:** Next.js 16 (App Router) — dark-themed SPA with shadcn/ui
- **Backend:** FastAPI + SQLAlchemy async ORM — REST API with 20+ endpoints
- **Infrastructure:** PostgreSQL (data), Qdrant (vectors), Redis (cache), Groq (LLM)

---

## 2. Why Each Technology

### Backend Stack

| Technology | Why |
|---|---|
| **FastAPI** | Async-native, automatic OpenAPI docs, Pydantic validation, dependency injection — fastest Python framework for APIs |
| **SQLAlchemy 2.0 (async)** | Full-featured async ORM with type-safe queries, migrations, and PostgreSQL-specific features |
| **Alembic** | Database migration management — tracks schema changes in versioned files |
| **PostgreSQL 16** | Reliable ACID-compliant DB with JSONB, full-text search, and strong async driver support |
| **Pydantic v2** | Type-safe data validation for request/response models; `from_attributes` maps ORM models to schemas |
| **asyncpg** | Fastest async PostgreSQL driver for Python |
| **Qdrant** | Vector database for semantic search — stores document chunk embeddings for RAG |
| **FastEmbed** | Local embedding models — `BAAI/bge-large-en-v1.5` (dense) + `Splade_PP_en_v1` (sparse) — no external API needed |
| **Groq API** | Ultra-fast LLM inference — Llama 3.1-8B for chat, Llama 3.3-70B for planning/evaluation |
| **LangGraph** | State-machine workflow for the RAG agent — retrieves context → generates answer with citations |
| **langchain-groq** | LangChain integration for Groq's LLM API |
| **PyMuPDF** | PDF text extraction for resume parsing |
| **PyJWT** | JWT token creation/validation for auth |
| **pwdlib (Argon2)** | Industry-standard password hashing |
| **Uvicorn** | Fast ASGI server for running FastAPI |
| **Redis** | Configured for future caching/queues; currently LangGraph uses in-memory checkpointing |

### Frontend Stack

| Technology | Why |
|---|---|
| **Next.js 16** | React framework with App Router, SSR/SSG, file-based routing |
| **TypeScript** | Type safety across the entire frontend |
| **Tailwind CSS v4** | Utility-first CSS with OKLCH color space, dark mode, rapid development |
| **shadcn/ui** | Copy-paste React components built on Radix UI primitives — customizable, accessible |
| **Radix UI / Base UI** | Headless, accessible UI primitives (progress, dialog, dropdown, sidebar) |
| **Lucide React** | Consistent, lightweight icon library |
| **Sonner** | Toast notification system |
| **react-markdown + rehype + remark** | Renders AI chat responses with Markdown formatting and syntax highlighting |
| **Monaco Editor** | VS Code-based code editor for the workspace/coding page |
| **class-variance-authority** | Component variant management (button styles, badge styles) |
| **tw-animate-css** | CSS animations |

---

## 3. Database Models (12 Tables)

All models use UUID primary keys and automatic `created_at`/`updated_at` timestamps.

| Model | Table | Purpose | Key Fields |
|---|---|---|---|
| **User** | `users` | User accounts | email, username, password_hash, full_name, role, college, degree, graduation_year, target_company, current_cgpa |
| **Document** | `documents` | Uploaded files metadata | uploaded_by_id, title, source_type, storage_path, status |
| **DocumentVersion** | `document_versions` | Version tracking for documents | document_id, version, checksum, parser_version |
| **Chunk** | `chunks` | Text chunks from documents (Qdrant points) | document_version_id, qdrant_point_id, chunk_index, content, content_hash |
| **Conversation** | `conversations` | Chat sessions | user_id, title, metadata |
| **Message** | `messages` | Individual chat messages | conversation_id, role (user/assistant/system), content, confidence_score |
| **MessageCitation** | `message_citations` | Source citations for AI answers | message_id, chunk_id, citation_index, relevance_score |
| **Company** | `companies` | Company reference data | slug, name, description |
| **ResumeReport** | `resume_reports` | ATS analysis results | user_id, resume_document_id, ats_score, target_company, report (JSONB) |
| **StudyPlan** | `study_plans` | AI-generated study plans | user_id, target_company, available_days, skill_level, plan (JSONB), progress (JSONB) |
| **MockInterview** | `mock_interviews` | Mock interview sessions | user_id, interview_type, target_company, status, score |
| **MockInterviewTurn** | `mock_interview_turns` | Individual interview Q&A turns | mock_interview_id, turn_index, question, answer, evaluation (JSONB) |

---

## 4. API Routes (20+ Endpoints)

All under `/api/v1`.

### Auth (`routes/auth.py`)
| Method | Path | What it does |
|---|---|---|
| POST | `/auth/register` | Create account (email, password, profile fields) |
| POST | `/auth/login` | Login → returns JWT access + refresh tokens |
| POST | `/auth/refresh` | Refresh expired access token |
| GET | `/auth/me` | Get current user's profile (requires auth) |

### Documents (`routes/documents.py`)
| Method | Path | What it does |
|---|---|---|
| POST | `/documents/upload` | Upload a file (resume, notes, etc.) |
| GET | `/documents/` | List user's documents |
| POST | `/documents/{id}/index` | Chunk + embed + index document in Qdrant |

### Search (`routes/search.py`)
| Method | Path | What it does |
|---|---|---|
| POST | `/search/` | Hybrid search (semantic + keyword) across user's indexed documents |

### Chat (`routes/chat.py`)
| Method | Path | What it does |
|---|---|---|
| POST | `/chat/stream` | SSE-streaming RAG chat (ask questions, get cited answers) |
| GET | `/chat/conversations` | List all conversations |
| DELETE | `/chat/conversations/{id}` | Delete a conversation |
| GET | `/chat/history` | Get message history for a conversation |
| POST | `/chat/upload-pdf` | Upload PDF for context extraction (chat-with-PDF) |

### Resume (`routes/resume.py`)
| Method | Path | What it does |
|---|---|---|
| POST | `/resume/analyze` | Analyze resume PDF → ATS score + suggestions |

### Study Planner (`routes/planner.py`)
| Method | Path | What it does |
|---|---|---|
| POST | `/planner/generate` | Generate AI study plan for a target company |
| GET | `/planner/` | List all study plans |
| PUT | `/planner/{id}/progress` | Update progress on a plan |
| DELETE | `/planner/{id}` | Delete a study plan |
| POST | `/planner/evaluate` | Evaluate a code solution |

### Admin (`routes/admin.py`)
| Method | Path | What it does |
|---|---|---|
| GET | `/admin/stats` | System statistics (users, docs, plans) — admin only |

### Profile (`routes/profile.py`)
| Method | Path | What it does |
|---|---|---|
| GET | `/profile/{identifier}` | Get public user profile by UUID or username |

### Health (`routes/health.py`)
| Method | Path | What it does |
|---|---|---|
| GET | `/health` | Health check (name, version, env, timestamp) |

---

## 5. Services Layer

All business logic lives in `apps/api/src/placement_api/services/`.

| Service | What It Does | How |
|---|---|---|
| **user.py** | User CRUD | Creates users (with Argon2 hashing), looks up by email/ID/username |
| **document.py** | File management | Saves uploaded files to disk, creates DB records |
| **embedding.py** | Text → Vectors | Chunks text → embeds with BGE (dense) + Splade (sparse) → upserts to Qdrant |
| **search.py** | Hybrid search | Embeds query → Qdrant `prefetch` (dense + sparse) → RRF fusion → top K results |
| **chat.py** | RAG Agent | LangGraph: retrieve context → generate answer via Groq → stream SSE → save citations |
| **resume.py** | ATS Analysis | PyMuPDF extracts text → Groq analyzes against job description → structured score |
| **planner.py** | Study Plans | Groq generates structured study plan → saved to DB → progress tracking |

---

## 6. Core Infrastructure

| Module | File | What It Does |
|---|---|---|
| **config.py** | `core/config.py` | Pydantic `Settings` — loads from `.env` / env vars. Provides async/sync/psycopg DB URLs. Cached via `@lru_cache` |
| **security.py** | `core/security.py` | Argon2 password hashing, JWT creation (`HS256`), 30-min access / 7-day refresh tokens |
| **middleware.py** | `core/middleware.py` | CORS configuration — allows localhost:3000/3001 + configured origins |
| **logging.py** | `core/logging.py` | JSON structured logging via `pythonjsonlogger` |
| **errors.py** | `core/errors.py` | Global exception handlers — HTTP errors, validation errors, generic 500 — all return structured JSON |
| **qdrant.py** | `core/qdrant.py` | `AsyncQdrantClient` singleton — creates `document_chunks` collection with dense (1024) + sparse vectors + payload indexes |

---

## 7. Frontend Pages

| Route | Page | What It Shows |
|---|---|---|
| `/` | Landing | Hero section, features grid, stats counter, CTA to register |
| `/auth/login` | Login | Email + password form, link to register |
| `/auth/register` | Register | Full registration with username, email, password, academic info |
| `/dashboard` | Dashboard Home | Welcome message, quick actions (chat, resume, planner), recent activity tips |
| `/dashboard/chat` | AI Chat | Streaming chat interface with conversation history, PDF upload, citation display |
| `/dashboard/resume` | Resume Analyzer | Upload resume → ATS score breakdown + suggestions |
| `/dashboard/planner` | Study Planner | Generate study plans, view progress, track milestones |
| `/dashboard/workspace` | Code Workspace | Monaco code editor with AI evaluation + follow-up chat |
| `/dashboard/admin` | Admin Panel | System stats — user count, document count, plan count, health status |
| `/user/[username]` | Public Profile | User's public profile with stats, about card, study plans |

---

## 8. Authentication Flow

```
Register ──▶ POST /auth/register ──▶ User created in DB
                                         │
Login ────▶ POST /auth/login ──────▶ JWT issued (access + refresh)
                                         │
API calls ──▶ Authorization: Bearer <token>
                                         │
                              ┌──────────┴──────────┐
                              │   get_current_user() │
                              │   (deps.py)          │
                              │   Decodes JWT        │
                              │   Fetches user by ID │
                              │   Returns User model  │
                              └─────────────────────┘
```

- **Access token:** expires in 30 minutes
- **Refresh token:** expires in 7 days
- **Frontend:** stores token in `localStorage`, auto-redirects to login on 401/403

---

## 9. RAG Pipeline

```
User Question
      │
      ▼
┌─────────────────┐
│  retrieve_node   │
│  (LangGraph)     │
│                  │
│  1. Embed query  │──▶ FastEmbed (BGE dense + Splade sparse)
│  2. Search Qdrant│──▶ Hybrid search → RRF fusion → top chunks
│  3. Format docs  │
└────────┬────────┘
         │ context
         ▼
┌─────────────────┐
│  generate_node   │
│  (LangGraph)     │
│                  │
│  1. Build prompt │──▶ System + context + question
│  2. Call Groq    │──▶ Llama 3.1-8B via langchain-groq
│  3. Stream tokens│──▶ SSE to frontend
│  4. Save message │──▶ DB (conversation, message, citations)
└─────────────────┘
         │
         ▼
   Cited Answer
```

---

## 10. Embedding & Search

**Embedding models** (via `fastembed`, runs locally):
- **Dense:** `BAAI/bge-large-en-v1.5` — 1024-dim vector for semantic similarity
- **Sparse:** `prithivida/Splade_PP_en_v1` — SPLADE sparse vector for keyword matching

**Indexing flow:**
1. Text is split into chunks (configurable size)
2. Each chunk gets embedded (dense + sparse)
3. Stored in Qdrant's `document_chunks` collection as `PointStruct`
4. Payload includes: `document_id`, `user_id`, `chunk_index`, `text`, `metadata`

**Search flow:**
1. Query is embedded (dense + sparse)
2. Qdrant `prefetch` runs dense search + sparse search in parallel
3. Results fused via `RRF` (Reciprocal Rank Fusion)
4. Top K chunks returned with payload

---

## 11. Project Structure

```
placement-assistant/
├── apps/
│   ├── api/          # FastAPI backend (Python)
│   │   ├── src/placement_api/
│   │   │   ├── api/v1/routes/   # 9 route modules
│   │   │   ├── core/            # 6 infrastructure modules
│   │   │   ├── db/              # Base, enums, session
│   │   │   ├── models/          # 7 ORM model files
│   │   │   ├── schemas/         # 6 Pydantic schema files
│   │   │   └── services/        # 7 service modules
│   │   └── migrations/          # 3 Alembic migrations
│   └── web/          # Next.js frontend (TypeScript)
│       └── src/
│           ├── app/             # 10 pages (App Router)
│           ├── components/      # Sidebar + 18 shadcn/ui components
│           └── lib/             # API client, utils
├── docs/             # Architecture, API, DB design docs
├── tests/            # Backend tests
├── storage/          # Uploaded files
└── docker-compose.yml
```

---

## 12. Key Design Decisions

| Decision | Rationale |
|---|---|
| **UUID primary keys** | No sequential IDs exposed to users; safe for public profile URLs |
| **Async everywhere** | FastAPI + SQLAlchemy async + asyncpg — handles concurrent users efficiently |
| **Local embeddings** | FastEmbed runs models locally — no external API cost, no rate limits, no data leaving the server |
| **Hybrid search** | Dense (semantic meaning) + sparse (exact keywords) with RRF fusion gives best retrieval accuracy |
| **Argon2 hashing** | Industry-standard password hashing (more secure than bcrypt/scrypt) |
| **CORS middleware** | Allows frontend on port 3000 to call API on port 8000 |
| **shadcn/ui** | Copy-paste components — full control over styling, no hidden dependencies |
| **Tailwind v4 + OKLCH** | Modern CSS with perceptually-uniform color space for better dark mode |
| **MemorySaver (in-memory)** | LangGraph checkpointer — simple for now; can swap to Postgres for production |
| **SSE streaming** | Server-Sent Events for real-time chat — simpler than WebSockets, works with HTTP/2 |


# Docker Setup Guide — AI Placement Assistant

Run the entire project on any machine using Docker. No code, no manual setup — just Docker and a free API key.

---

## Prerequisites

- **Docker** (24+) — [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** v2 (included with Docker Desktop / Docker Engine)
- **Groq API key** — Free. Get one at https://console.groq.com

---

## Quick Start (5 minutes)

### 1. Clone or copy the project

If you have the project folder, place it on the target machine. If not, clone it:

```bash
git clone [https://github.com/your-username/placement-assistant.git](https://github.com/RajatPetkar/PrepForge.git)
cd placement-assistant
```

### 2. Configure environment

Copy the example env file and add your Groq API key:

```bash
cp .env.example .env
```

Edit `.env` and set these two values:

```env
GROQ_API_KEY=gsk_your_key_here      # Required for AI features
JWT_SECRET=any-random-secret-string   # Change this
```

> **Only `GROQ_API_KEY` is required.** Everything else has sensible defaults.

### 3. Start everything

```bash
docker compose up -d
```

This starts all 5 services:

| Service | Purpose | Port |
|---|---|---|
| `placement-web` | Next.js frontend | http://localhost:3000 |
| `placement-api` | FastAPI backend | http://localhost:8000 |
| `placement-postgres` | PostgreSQL database | 5432 (internal) |
| `placement-redis` | Redis cache | 6379 (internal) |
| `placement-qdrant` | Qdrant vector database | 6333 (internal) |

### 4. Open the app

Go to **[http://localhost:3000](http://localhost:3000)** in your browser.

1. Click **Get Started** → **Create Account**
2. Register with your email, username, and password
3. Start using the AI Placement Assistant!

> The first run will download embedding models (~2GB) for FastEmbed. This happens once in the background and may take a few minutes.

---

## What Happens on First Run

1. Docker pulls PostgreSQL, Redis, and Qdrant images
2. The API container runs database migrations automatically (Alembic)
3. Qdrant creates the `document_chunks` collection
4. FastEmbed downloads BGE and Splade models (first request only)
5. The frontend is served at port 3000

All data persists in Docker volumes (`postgres_data`, `redis_data`, `qdrant_data`).

---

## Services Overview

```
┌──────────┐    ┌──────────┐    ┌────────────┐
│ Browser  │───▶│  Web     │───▶│   API      │
│ :3000    │    │ :3000    │    │ :8000      │
└──────────┘    └──────────┘    └─────┬──────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                   ▼
             ┌──────────┐     ┌──────────┐     ┌──────────────┐
             │PostgreSQL │     │  Redis   │     │   Qdrant     │
             │ :5432     │     │ :6379    │     │ :6333        │
             └──────────┘     └──────────┘     └──────────────┘
```

---

## Common Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f api
docker compose logs -f web

# Stop all services
docker compose down

# Stop and delete all data
docker compose down -v

# Restart a specific service
docker compose restart api

# Rebuild after code changes
docker compose up -d --build

# Check service health
docker compose ps
```

---

## Configuration

All configuration is done through `.env`. Here are the key variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | **Yes** | — | Groq API key for LLM (chat, resume, planner) |
| `JWT_SECRET` | No | `change-this...` | Secret for JWT token signing |
| `APP_ENV` | No | `production` | Environment name |
| `LOG_LEVEL` | No | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`) |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed origins |

---

## Example .env
APP_ENV=local
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL= your_db_url
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10
REDIS_URL= redis_url
QDRANT_URL= qdrant_url
QDRANT_API_KEY= api_key
GROQ_API_KEY= groq_api_key
JWT_SECRET= change-me-in-local-env
CORS_ORIGINS= ["http://localhost:3000","http://localhost:5173"]

## Accessing Services

| Service | Internal URL (containers) | External URL (your machine) |
|---|---|---|
| Web UI | http://web:3000 | http://localhost:3000 |
| API | http://api:8000 | http://localhost:8000 |
| API Docs | — | http://localhost:8000/docs |
| PostgreSQL | `postgres:5432` | `localhost:5432` |
| Redis | `redis:6379` | `localhost:6379` |
| Qdrant | `http://qdrant:6333` | `http://localhost:6333` |

---

## Port Conflicts

If a port is already in use on your machine, change it in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"   # Change left side to any free port
```

Then update `NEXT_PUBLIC_API_URL` in the web service environment.

---

## Production Notes

For production deployment:

1. **Change all default passwords** in `docker-compose.yml`
2. **Set a strong `JWT_SECRET`** in `.env`
3. **Use `CORS_ORIGINS`** to restrict to your domain
4. **Add SSL** via a reverse proxy (nginx, Caddy, Traefik)

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `column users.username does not exist` | Run `docker compose restart api` (migrations run on startup) |
| `Connection refused` to PostgreSQL | PostgreSQL takes a few seconds to start. Wait and retry |
| Port 3000 already in use | Change `ports: "3000:3000"` to `"3001:3000"` in docker-compose.yml |
| Embedding model download takes long | First run only — models are cached after download |
| API key errors | Make sure `GROQ_API_KEY` is set correctly in `.env` |
| Blank page / CORS errors | Ensure `NEXT_PUBLIC_API_URL` matches the API URL in the browser |
