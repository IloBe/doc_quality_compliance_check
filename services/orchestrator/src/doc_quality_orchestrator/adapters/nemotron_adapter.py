"""Nemotron adapter backed by an on-prem OpenAI-compatible gateway."""
from __future__ import annotations

from ..models import GenerateOptions, ModelCapabilities, ModelMessage, ModelResponse
from .base import ModelAdapter
from .openai_gateway import ModelGatewayConfigurationError, OpenAIChatCompletionGateway


class NemotronAdapter(ModelAdapter):
    """Provider adapter for the on-prem Nemotron runtime."""

    provider_id = "nemotron"
    capabilities = ModelCapabilities(tool_calls=False, json_schema=True, streaming=False)

    def __init__(
        self,
        model_id: str,
        endpoint: str | None = None,
        api_key: str | None = None,
    ) -> None:
        self.model_id = model_id
        self.endpoint = endpoint
        self.api_key = api_key
        self._gateway: OpenAIChatCompletionGateway | None = None

    def _build_gateway(self) -> OpenAIChatCompletionGateway:
        """Create the gateway client lazily so config errors surface on use."""
        if self._gateway is None:
            if not self.endpoint:
                raise ModelGatewayConfigurationError(
                    "nemotron_base_url must be configured for on-prem Nemotron execution"
                )
            self._gateway = OpenAIChatCompletionGateway(
                base_url=self.endpoint,
                model_id=self.model_id,
                api_key=self.api_key,
            )
        return self._gateway

    async def generate(
        self,
        messages: list[ModelMessage],
        options: GenerateOptions,
    ) -> ModelResponse:
        gateway = self._build_gateway()
        return await gateway.generate(messages=messages, options=options)
