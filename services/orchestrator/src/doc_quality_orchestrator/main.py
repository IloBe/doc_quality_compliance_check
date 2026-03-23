"""FastAPI entrypoint for the standalone orchestrator service."""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import Depends, FastAPI, Header, HTTPException, status

from .config import get_settings
from .models import HealthResponse, WorkflowRunRequest, WorkflowRunResponse
from .service import OrchestratorService

logger = structlog.get_logger(__name__)

settings = get_settings()
service = OrchestratorService(settings)


def require_orchestrator_auth(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> None:
    """Enforce API key or bearer token on orchestrator workflow endpoints."""
    expected = settings.api_secret_key
    if not expected:
        return

    bearer_token: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        bearer_token = authorization[7:].strip()

    if (x_api_key or bearer_token) != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Log orchestrator startup/shutdown."""
    logger.info("orchestrator_starting", version=settings.app_version, env=settings.environment)
    yield
    logger.info("orchestrator_stopping")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="CrewAI-based orchestration service",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Return orchestrator health and CrewAI availability."""
    return HealthResponse(version=settings.app_version, crewai_available=service.crewai_available())


@app.post(
    "/workflows/run",
    response_model=WorkflowRunResponse,
    dependencies=[Depends(require_orchestrator_auth)],
)
async def run_workflow(request: WorkflowRunRequest) -> WorkflowRunResponse:
    """Run a minimal scaffold workflow end-to-end."""
    return await service.run_workflow(request)
