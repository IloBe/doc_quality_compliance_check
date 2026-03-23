"""Configuration for the standalone orchestrator service."""
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class OrchestratorSettings(BaseSettings):
    """Service-local settings for orchestration and provider targets."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Doc Quality Orchestrator"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"

    api_host: str = "0.0.0.0"
    api_port: int = 8010

    backend_base_url: str = "http://localhost:8000/api/v1"
    default_workflow_id: str = "document_compliance_check"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"

    nemotron_base_url: str = ""
    nemotron_api_key: str = ""
    nemotron_model: str = "nemotron-parse"

    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "console"

    # API auth
    api_secret_key: str = "change-me-in-production"

    # --- Runtime safety limits (hard limits, DoD §) ---
    max_steps: int = 20
    max_retries_per_step: int = 3
    max_token_budget_per_run: int = 100_000
    step_timeout_seconds: float = 60.0
    global_run_timeout_seconds: float = 300.0

    # --- Feature flags / routing kill switch ---
    crewai_workflow_enabled: bool = True
    model_validator_enabled: bool = True
    model_validator_max_tokens: int = 600


def get_settings() -> OrchestratorSettings:
    """Return settings instance."""
    return OrchestratorSettings()
