# Stage 1: build the Next.js frontend
FROM node:20-alpine AS frontend-builder
RUN apk upgrade --no-cache
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime serving both API and static frontend
FROM python:3.12-slim
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install Python dependencies
COPY backend/pyproject.toml ./
RUN uv sync --no-dev

# Copy backend source
COPY backend/main.py backend/chat.py ./

# Copy built frontend into static/
COPY --from=frontend-builder /app/frontend/out ./static

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
