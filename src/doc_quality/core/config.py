"""Application configuration using Pydantic Settings."""
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    app_name: str = "Doc Quality Compliance Check"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api/v1"

    # Security
    secret_key: str = "change-me-in-production"
    allowed_file_types: list[str] = [".pdf", ".docx", ".md", ".txt"]
    max_file_size_mb: int = 10
    session_cookie_name: str = "dq_session"
    session_cookie_secure: bool = False
    session_ttl_minutes: int = 480
    auth_mvp_email: str = "demo@quality-station.ai"
    auth_mvp_password: str = "change-me"
    auth_mvp_roles: str = "qm_lead"
    auth_mvp_org: str = "QM-CORE-STATION"
    auth_auto_provision_mvp_user: bool = True
    auth_recovery_ttl_minutes: int = 15
    auth_recovery_rate_limit_count: int = 5
    auth_recovery_rate_limit_window_minutes: int = 15
    auth_recovery_debug_expose_token: bool = True

    # AI / Anthropic
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"

    # AI / Perplexity (used for regulatory research tasks)
    perplexity_api_key: str = ""
    perplexity_model: str = "sonar-pro"
    perplexity_api_base_url: str = "https://api.perplexity.ai"

    # Logging
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "console"

    # Templates directory
    templates_dir: str = "templates"
    reports_output_dir: str = "reports"

    # Database (PostgreSQL for HITL persistence)
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/doc_quality"
    database_echo: bool = False


def get_settings() -> Settings:
    """Return application settings singleton."""
    return Settings()
