FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/pyproject.toml .
RUN pip install --no-cache-dir .

COPY apps/api /app/apps/api

ENV PYTHONPATH=/app/apps/api/src

EXPOSE 8000

CMD ["sh", "-c", "alembic -c /app/apps/api/alembic.ini upgrade head && uvicorn placement_api.main:app --host 0.0.0.0 --port 8000"]
