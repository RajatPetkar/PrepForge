# API Design

Base path: `/api/v1`

## Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/google/start`
- `GET /auth/google/callback`

## Users

- `GET /users/me`
- `PATCH /users/me`
- `GET /users/{user_id}` admin
- `PATCH /users/{user_id}/role` admin

## Documents

- `POST /documents`
- `GET /documents`
- `GET /documents/{document_id}`
- `DELETE /documents/{document_id}`
- `POST /documents/{document_id}/reindex`
- `GET /documents/{document_id}/chunks`

## Search

- `POST /search`
- `POST /search/hybrid`
- `GET /search/suggestions`

## Chat

- `POST /chat/conversations`
- `GET /chat/conversations`
- `GET /chat/conversations/{conversation_id}`
- `POST /chat/conversations/{conversation_id}/messages`
- `POST /chat/conversations/{conversation_id}/stream`
- `POST /chat/messages/{message_id}/feedback`
- `POST /chat/messages/{message_id}/regenerate`

## Resume

- `POST /resume/upload`
- `POST /resume/analyze`
- `GET /resume/reports`
- `GET /resume/reports/{report_id}`
- `POST /resume/optimize/company`

## Companies

- `GET /companies`
- `GET /companies/{slug}`
- `GET /companies/{slug}/roadmap`
- `GET /companies/{slug}/questions`
- `GET /companies/{slug}/experiences`

## Study Planner

- `POST /study-plans`
- `GET /study-plans`
- `GET /study-plans/{plan_id}`
- `PATCH /study-plans/{plan_id}/progress`

## Mock Interview

- `POST /mock-interviews`
- `GET /mock-interviews`
- `GET /mock-interviews/{interview_id}`
- `POST /mock-interviews/{interview_id}/answer`
- `POST /mock-interviews/{interview_id}/evaluate`

## Dashboard

- `GET /dashboard/summary`
- `GET /dashboard/recent-searches`
- `GET /dashboard/weak-areas`
- `GET /dashboard/daily-goals`
- `GET /dashboard/recommendations`

## Admin

- `GET /admin/stats`
- `GET /admin/indexing/jobs`
- `GET /admin/indexing/failures`
- `POST /admin/indexing/retry`
- `GET /admin/analytics/users`
- `GET /admin/analytics/retrieval`

## API Principles

- Authenticated endpoints require bearer JWTs.
- Admin endpoints require `admin` role.
- Chat streaming should use Server-Sent Events initially.
- Request and response schemas should be versioned through Pydantic models.
- RAG endpoints must return citations when generated answers use retrieved context.

