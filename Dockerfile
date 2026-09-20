FROM node:22-alpine AS frontend-builder

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
RUN cd frontend && npm run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY . .
COPY --from=frontend-builder /app/backend/src/machine_readable_checker/static ./backend/src/machine_readable_checker/static
WORKDIR /app/backend
RUN python -m pip install --no-cache-dir -e ".[test]"

EXPOSE 8000

CMD ["sh", "-c", "uvicorn machine_readable_checker.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
