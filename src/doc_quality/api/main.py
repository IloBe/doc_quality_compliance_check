"""FastAPI application entry point."""
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from ..core.config import get_settings
from ..core.logging_config import configure_logging
from .routes import compliance, documents, reports, research, templates

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan: startup and shutdown tasks."""
    settings = get_settings()
    configure_logging(settings.log_level, settings.log_format)
    logger.info("application_starting", version=settings.app_version, env=settings.environment)
    yield
    logger.info("application_stopping")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Document Quality & Compliance Check System",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:8000"],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def log_requests(request: Request, call_next):  # type: ignore[no-untyped-def]
        start = time.time()
        response = await call_next(request)
        duration = time.time() - start
        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=round(duration * 1000, 1),
        )
        return response

    prefix = settings.api_prefix
    app.include_router(documents.router, prefix=prefix)
    app.include_router(compliance.router, prefix=prefix)
    app.include_router(reports.router, prefix=prefix)
    app.include_router(templates.router, prefix=prefix)
    app.include_router(research.router, prefix=prefix)

    @app.get("/health")
    async def health_check() -> dict:
        return {"status": "healthy", "version": settings.app_version}

    # Serve frontend static files if available
    try:
        app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
    except RuntimeError:
        pass  # Frontend directory not found; skip static serving

    return app


app = create_app()
