"""Adapter registry for the orchestrator service."""
from ..config import OrchestratorSettings
from .anthropic_adapter import AnthropicAdapter
from .base import ModelAdapter
from .nemotron_adapter import NemotronAdapter
from .openai_compatible_adapter import OpenAICompatibleAdapter


def get_adapter(provider: str, settings: OrchestratorSettings) -> ModelAdapter:
    """Return a configured provider adapter by id."""
    if provider == "anthropic":
        return AnthropicAdapter(model_id=settings.anthropic_model)
    if provider == "openai_compatible":
        return OpenAICompatibleAdapter(
            model_id=settings.nemotron_model,
            endpoint=settings.nemotron_base_url or None,
        )
    if provider == "nemotron":
        return NemotronAdapter(
            model_id=settings.nemotron_model,
            endpoint=settings.nemotron_base_url or None,
        )
    raise ValueError(f"Unsupported provider: {provider}")
