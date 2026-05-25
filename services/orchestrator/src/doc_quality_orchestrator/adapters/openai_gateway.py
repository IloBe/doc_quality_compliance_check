"""OpenAI-compatible chat completion gateway client for on-prem model execution.

The client centralizes low-level HTTP request/response handling for providers
that expose an OpenAI-style chat-completions API. This keeps provider adapters
small and makes the runtime boundary explicit.
"""
from __future__ import annotations

import json
import re
from collections.abc import Sequence
from typing import Any

import httpx
import structlog

from ..models import GenerateOptions, ModelMessage, ModelResponse

logger = structlog.get_logger(__name__)

_JSON_BLOCK_PATTERN = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)


class ModelGatewayConfigurationError(RuntimeError):
    """Raised when a gateway client is missing required configuration."""


class ModelGatewayResponseError(RuntimeError):
    """Raised when a gateway response cannot be normalized safely."""


class OpenAIChatCompletionGateway:
    """Call an OpenAI-compatible chat-completions endpoint.

    The gateway is intentionally generic so both on-prem and gateway-backed
    deployments can reuse the same transport and response normalization logic.
    """

    def __init__(
        self,
        *,
        base_url: str,
        model_id: str,
        api_key: str | None = None,
        timeout_seconds: float = 60.0,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        if not base_url.strip():
            raise ModelGatewayConfigurationError("base_url is required for on-prem model execution")

        self._base_url = base_url.rstrip("/")
        self._model_id = model_id
        self._api_key = api_key
        self._timeout_seconds = timeout_seconds
        self._client = client

    def _build_endpoint_url(self) -> str:
        """Return the chat-completions endpoint URL."""
        if self._base_url.endswith("/v1"):
            return f"{self._base_url}/chat/completions"
        if self._base_url.endswith("/chat/completions"):
            return self._base_url
        return f"{self._base_url}/v1/chat/completions"

    def _build_headers(self) -> dict[str, str]:
        """Return request headers for the gateway call."""
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    @staticmethod
    def _message_payload(messages: Sequence[ModelMessage]) -> list[dict[str, str]]:
        """Convert internal message models to the gateway payload shape."""
        return [{"role": message.role, "content": message.content} for message in messages]

    @staticmethod
    def _extract_text(response_data: dict[str, Any]) -> str:
        """Extract assistant text from the most common OpenAI-style response shape."""
        choices = response_data.get("choices")
        if not isinstance(choices, list) or not choices:
            raise ModelGatewayResponseError("gateway response did not include any choices")

        first_choice = choices[0]
        if not isinstance(first_choice, dict):
            raise ModelGatewayResponseError("gateway response choice is not a JSON object")

        message = first_choice.get("message")
        if not isinstance(message, dict):
            raise ModelGatewayResponseError("gateway response choice is missing message content")

        content = message.get("content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            text_chunks = [str(chunk.get("text", "")) for chunk in content if isinstance(chunk, dict)]
            return "".join(text_chunks)
        if content is None:
            return ""
        return str(content)

    @staticmethod
    def _candidate_json_blocks(text: str) -> list[str]:
        """Return likely JSON fragments embedded in assistant text."""
        candidates: list[str] = []

        fenced_match = _JSON_BLOCK_PATTERN.search(text)
        if fenced_match:
            candidates.append(fenced_match.group(1).strip())

        object_start = text.find("{")
        object_end = text.rfind("}")
        if object_start >= 0 and object_end > object_start:
            candidates.append(text[object_start : object_end + 1].strip())

        array_start = text.find("[")
        array_end = text.rfind("]")
        if array_start >= 0 and array_end > array_start:
            candidates.append(text[array_start : array_end + 1].strip())

        return candidates

    @classmethod
    def _extract_json_payload(cls, text: str) -> dict[str, Any] | None:
        """Parse structured content from a model response when possible."""
        stripped = text.strip()
        if not stripped:
            return None

        for candidate in (stripped, *cls._candidate_json_blocks(stripped)):
            try:
                parsed = json.loads(candidate)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                return parsed
            return {"items": parsed}
        return None

    async def generate(
        self,
        *,
        messages: list[ModelMessage],
        options: GenerateOptions,
    ) -> ModelResponse:
        """Send a chat-completion request and return a normalized provider response."""
        payload: dict[str, Any] = {
            "model": self._model_id,
            "messages": self._message_payload(messages),
            "temperature": options.temperature,
        }
        if options.max_tokens is not None:
            payload["max_tokens"] = options.max_tokens

        endpoint_url = self._build_endpoint_url()
        logger.debug(
            "gateway_request_start",
            endpoint_url=endpoint_url,
            model_id=self._model_id,
            message_count=len(messages),
            structured_output=options.response_schema is not None,
        )

        if self._client is not None:
            response = await self._client.post(
                endpoint_url,
                headers=self._build_headers(),
                json=payload,
            )
        else:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(
                    endpoint_url,
                    headers=self._build_headers(),
                    json=payload,
                )

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error(
                "gateway_request_failed",
                endpoint_url=endpoint_url,
                status_code=exc.response.status_code,
            )
            raise ModelGatewayResponseError(
                f"gateway returned HTTP {exc.response.status_code}"
            ) from exc

        try:
            response_data = response.json()
        except ValueError as exc:
            raise ModelGatewayResponseError("gateway response was not valid JSON") from exc

        content = self._extract_text(response_data)
        json_payload = self._extract_json_payload(content)
        if options.response_schema is not None and json_payload is None:
            raise ModelGatewayResponseError(
                "gateway response did not contain JSON content for a structured-output request"
            )

        usage = response_data.get("usage")
        if not isinstance(usage, dict):
            usage = {}

        return ModelResponse(
            content=content,
            json=json_payload,
            tool_calls=[],
            usage=usage,
            model_id=self._model_id,
            provider_id="nemotron",
        )