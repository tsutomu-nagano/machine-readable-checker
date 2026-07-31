FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY . .
RUN python -m pip install --no-cache-dir -e ".[test]"

EXPOSE 8000

CMD ["sh", "-c", "uvicorn machine_readable_checker.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
