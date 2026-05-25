from __future__ import annotations

import json

import httpx
import pytest

from doc_quality_orchestrator.adapters.nemotron_adapter import NemotronAdapter
from doc_quality_orchestrator.adapters.openai_gateway import (
    ModelGatewayConfigurationError,
    OpenAIChatCompletionGateway,
)
from doc_quality_orchestrator.models import GenerateOptions, ModelMessage


@pytest.mark.asyncio
async def test_nemotron_adapter_calls_openai_compatible_gateway() -> None:
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["method"] = request.method
        seen["url"] = str(request.url)
        seen["authorization"] = request.headers.get("authorization")
        body = json.loads(request.content.decode("utf-8"))
        seen["body"] = body
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "summary": "on-prem ok",
                                    "status": "healthy",
                                }
                            )
                        }
                    }
                ],
                "usage": {"prompt_tokens": 12, "completion_tokens": 7},
            },
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    gateway = OpenAIChatCompletionGateway(
        base_url="http://onprem-gateway.local",
        model_id="nemotron-parse",
        api_key="secret-token",
        client=client,
    )
    adapter = NemotronAdapter(model_id="nemotron-parse", endpoint="http://onprem-gateway.local", api_key="secret-token")
    adapter._gateway = gateway

    response = await adapter.generate(
        [
            ModelMessage(role="system", content="Return JSON only."),
            ModelMessage(role="user", content="Summarize the run."),
        ],
        GenerateOptions(response_schema={"type": "object"}, max_tokens=32),
    )

    await client.aclose()

    assert seen["method"] == "POST"
    assert seen["url"] == "http://onprem-gateway.local/v1/chat/completions"
    assert seen["authorization"] == "Bearer secret-token"
    assert seen["body"]["model"] == "nemotron-parse"
    assert response.provider_id == "nemotron"
    assert response.model_id == "nemotron-parse"
    assert response.json_payload == {"summary": "on-prem ok", "status": "healthy"}
    assert response.content == '{"summary": "on-prem ok", "status": "healthy"}'


def test_openai_gateway_requires_base_url() -> None:
    with pytest.raises(ModelGatewayConfigurationError):
        OpenAIChatCompletionGateway(base_url="", model_id="nemotron-parse")
