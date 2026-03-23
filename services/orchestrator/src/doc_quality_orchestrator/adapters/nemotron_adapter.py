"""Nemotron adapter scaffold for orchestrator workflows."""
from ..models import GenerateOptions, ModelCapabilities, ModelMessage, ModelResponse
from .base import ModelAdapter
from .scaffold_utils import build_scaffold_json_response


class NemotronAdapter(ModelAdapter):
    """Minimal Nemotron adapter scaffold.

    The target assumption is an OpenAI-compatible or gateway-backed endpoint,
    but this scaffold keeps the contract stable before the provider is enabled.
    """

    provider_id = "nemotron"
    capabilities = ModelCapabilities(tool_calls=False, json_schema=True, streaming=False)

    def __init__(self, model_id: str, endpoint: str | None = None) -> None:
        self.model_id = model_id
        self.endpoint = endpoint

    async def generate(
        self,
        messages: list[ModelMessage],
        options: GenerateOptions,
    ) -> ModelResponse:
        prompt_preview = messages[-1].content[:280] if messages else ""
        json_payload = build_scaffold_json_response(messages, options)
        content = (
            "NemotronAdapter scaffold response. "
            "Provider support is available via this adapter contract; wire the concrete endpoint when the runtime is enabled. "
            f"Prompt preview: {prompt_preview}"
        )
        return ModelResponse(
            content=content,
            json=json_payload or ({"summary": content} if options.response_schema is not None else None),
            tool_calls=[],
            usage={"input_messages": len(messages), "endpoint_configured": bool(self.endpoint)},
            model_id=self.model_id,
            provider_id=self.provider_id,
        )
