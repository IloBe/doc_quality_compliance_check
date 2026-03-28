"""Application configuration using Pydantic Settings."""
from typing import Literal
from pydantic import model_validator
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
    # Global request rate limiting
    global_rate_limit_enabled: bool = True
    global_rate_limit_requests: int = 240
    global_rate_limit_window_seconds: int = 60
    # Session TTL policy
    # - remember_me = false -> short session
    # - remember_me = true  -> persistent session
    session_ttl_short_minutes: int = 120
    session_ttl_remember_me_minutes: int = 7200
    # Override via AUTH_MVP_EMAIL env var or .env file — never commit real values  # noqa: S105
    auth_mvp_email: str = "mvp-user@example.invalid"  # nosec B105 — placeholder, not a real credential
    auth_mvp_password: str = "CHANGE_ME_BEFORE_USE"  # nosec B105 — placeholder, not a real credential
    auth_mvp_roles: str = "qm_lead"
    auth_mvp_org: str = "QM-CORE-STATION"
    auth_auto_provision_mvp_user: bool = True
    auth_recovery_ttl_minutes: int = 15
    auth_recovery_rate_limit_count: int = 5
    auth_recovery_rate_limit_window_minutes: int = 15
    auth_recovery_debug_expose_token: bool = False
    # Login abuse protection
    auth_login_rate_limit_count: int = 8
    auth_login_rate_limit_window_seconds: int = 300
    auth_login_lockout_seconds: int = 600

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

    # Database — set DATABASE_URL in your .env file; never commit real credentials  # noqa: S105
    # Example: postgresql+psycopg2://dbuser:CHANGE_ME@localhost:5432/doc_quality
    # Example (smoke tests): sqlite:///./doc_quality.db
    database_url: str = "postgresql+psycopg2://dbuser:CHANGE_ME@localhost:5432/doc_quality"  # nosec B105
    database_echo: bool = False

    @model_validator(mode="after")
    def validate_security_defaults(self) -> "Settings":
        """Enforce secure defaults and fail-fast production validation."""
        if self.environment != "development":
            self.session_cookie_secure = True

        if self.environment == "production" and self.secret_key.strip() == "change-me-in-production":
            raise ValueError("SECRET_KEY must be explicitly configured in production")

        return self


def get_settings() -> Settings:
    """Return application settings singleton."""
    return Settings()
