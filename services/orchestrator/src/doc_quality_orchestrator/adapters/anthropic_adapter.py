"""Anthropic adapter scaffold for orchestrator workflows."""
from ..models import GenerateOptions, ModelCapabilities, ModelMessage, ModelResponse
from .base import ModelAdapter
from .scaffold_utils import build_scaffold_json_response


class AnthropicAdapter(ModelAdapter):
    """Minimal Anthropic adapter scaffold.

    This intentionally returns a deterministic scaffold response until the full
    provider integration is wired for production.
    """

    provider_id = "anthropic"
    capabilities = ModelCapabilities(tool_calls=False, json_schema=True, streaming=False)

    def __init__(self, model_id: str) -> None:
        self.model_id = model_id

    async def generate(
        self,
        messages: list[ModelMessage],
        options: GenerateOptions,
    ) -> ModelResponse:
        prompt_preview = messages[-1].content[:280] if messages else ""
        json_payload = build_scaffold_json_response(messages, options)
        content = (
            "AnthropicAdapter scaffold response. "
            "Replace this deterministic output with a real provider call once credentials and prompt files are wired. "
            f"Prompt preview: {prompt_preview}"
        )
        return ModelResponse(
            content=content,
            json=json_payload or ({"summary": content} if options.response_schema is not None else None),
            tool_calls=[],
            usage={"input_messages": len(messages)},
            model_id=self.model_id,
            provider_id=self.provider_id,
        )
