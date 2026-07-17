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
git clone https://github.com/your-username/placement-assistant.git
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
