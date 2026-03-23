"""Provider adapter abstractions for the orchestration layer."""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from ..models import GenerateOptions, ModelCapabilities, ModelMessage, ModelResponse


class ModelAdapter(ABC):
    """Provider-neutral interface used by orchestration workflows."""

    provider_id: str
    capabilities: ModelCapabilities

    @abstractmethod
    async def generate(
        self,
        messages: list[ModelMessage],
        options: GenerateOptions,
    ) -> ModelResponse:
        """Generate a provider-normalized response."""

    async def stream(
        self,
        messages: list[ModelMessage],
        options: GenerateOptions,
    ) -> AsyncIterator[ModelResponse]:
        """Optional streaming implementation."""
        raise NotImplementedError("Streaming is not implemented for this adapter")
