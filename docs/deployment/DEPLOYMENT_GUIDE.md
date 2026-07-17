# Deployment Guide

## Local

Local development will use Docker Compose for PostgreSQL, Redis, Qdrant, the FastAPI backend, and the ingestion worker. The frontend can run locally with Next.js dev server or inside Docker later.

## Production Target

- Frontend: Vercel
- Backend: Railway, Render, or AWS
- PostgreSQL: managed PostgreSQL
- Redis: managed Redis
- Qdrant: Qdrant Cloud or self-hosted container
- Object storage: S3-compatible storage

## Environment Variables

Required variables will be introduced module by module. Initial expected categories:

- API configuration
- Database URL
- Redis URL
- Qdrant URL/API key
- Gemini API key
- JWT secret
- CORS origins
- Storage backend configuration

## Deployment Principles

- No secrets in source control.
- Health checks required for all runtime services.
- Database migrations must run explicitly.
- Ingestion workers scale independently from API containers.
- Long-running indexing must not block HTTP requests.

