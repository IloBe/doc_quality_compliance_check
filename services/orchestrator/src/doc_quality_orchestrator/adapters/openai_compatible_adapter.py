"""Generic OpenAI-compatible adapter scaffold."""
from ..models import GenerateOptions, ModelCapabilities, ModelMessage, ModelResponse
from .base import ModelAdapter
from .scaffold_utils import build_scaffold_json_response


class OpenAICompatibleAdapter(ModelAdapter):
    """Generic adapter for OpenAI-compatible gateways and hosted backends."""

    provider_id = "openai_compatible"
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
            "OpenAICompatibleAdapter scaffold response. "
            "Use this adapter for compatible provider gateways without changing workflow logic. "
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
