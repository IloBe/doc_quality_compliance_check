"""Application configuration using Pydantic Settings."""
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

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
    max_file_size_mb: int = 50

    # AI / Anthropic
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"

    # Logging
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "console"

    # Templates directory
    templates_dir: str = "templates"
    reports_output_dir: str = "reports"


def get_settings() -> Settings:
    """Return application settings singleton."""
    return Settings()
