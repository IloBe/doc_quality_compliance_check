FROM python:3.12-slim

WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
RUN pip install --no-cache-dir .
EXPOSE 8010
CMD ["uvicorn", "doc_quality_orchestrator.main:app", "--host", "0.0.0.0", "--port", "8010"]
