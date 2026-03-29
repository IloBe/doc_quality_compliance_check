"""FastAPI application entry point."""
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from ..core.config import get_settings
from ..core.logging_config import configure_logging
from ..core.rate_limit import api_global_limiter
from ..core.session_auth import require_authenticated_user
from .routes import auth, bridge, compliance, dashboard, documents, reports, research, skills, templates

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
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://0.0.0.0:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://0.0.0.0:8000",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def log_requests(request: Request, call_next):  # type: ignore[no-untyped-def]
        settings = get_settings()
        if request.url.path.startswith(f"{settings.api_prefix}/") and settings.global_rate_limit_enabled:
            client_ip = request.client.host if request.client else "unknown"
            decision = api_global_limiter.check(
                key=f"api:{client_ip}",
                max_requests=settings.global_rate_limit_requests,
                window_seconds=settings.global_rate_limit_window_seconds,
            )
            if not decision.allowed:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": {
                            "code": "rate_limited",
                            "message": "Too many requests. Please retry later.",
                        }
                    },
                    headers={"Retry-After": str(decision.retry_after_seconds)},
                )

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

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException):
        code = "authentication_required" if exc.status_code == 401 else "request_error"
        if exc.status_code == 403:
            code = "forbidden"
        elif exc.status_code == 404:
            code = "not_found"
        elif exc.status_code == 422:
            code = "validation_error"
        elif exc.status_code == 429:
            code = "rate_limited"

        headers = exc.headers or {}
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": code,
                    "message": str(exc.detail),
                }
            },
            headers=headers,
        )

    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_exception_handler(_: Request, exc: StarletteHTTPException):
        code = "not_found" if exc.status_code == 404 else "request_error"
        if exc.status_code == 405:
            code = "method_not_allowed"
        elif exc.status_code == 401:
            code = "authentication_required"
        elif exc.status_code == 403:
            code = "forbidden"

        headers = exc.headers or {}
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": code,
                    "message": str(exc.detail),
                }
            },
            headers=headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, __: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Request validation failed",
                }
            },
        )

    @app.exception_handler(OperationalError)
    async def database_operational_error_handler(_: Request, exc: OperationalError):
        logger.exception("database_unavailable", error_type=type(exc).__name__)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": {
                    "code": "database_unavailable",
                    "message": "Database unavailable. Start PostgreSQL and retry.",
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception):
        logger.exception("unhandled_exception", error_type=type(exc).__name__)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "internal_error",
                    "message": "Internal server error",
                }
            },
        )

    prefix = settings.api_prefix
    auth_dependencies = [Depends(require_authenticated_user)]
    app.include_router(auth.router, prefix=prefix)
    app.include_router(documents.router, prefix=prefix, dependencies=auth_dependencies)
    app.include_router(compliance.router, prefix=prefix, dependencies=auth_dependencies)
    app.include_router(bridge.router, prefix=prefix, dependencies=auth_dependencies)
    app.include_router(reports.router, prefix=prefix, dependencies=auth_dependencies)
    app.include_router(templates.router, prefix=prefix, dependencies=auth_dependencies)
    app.include_router(research.router, prefix=prefix, dependencies=auth_dependencies)
    app.include_router(skills.router, prefix=prefix, dependencies=auth_dependencies)
    app.include_router(dashboard.router, prefix=prefix, dependencies=auth_dependencies)

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
