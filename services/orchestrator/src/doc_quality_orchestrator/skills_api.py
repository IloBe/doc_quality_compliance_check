"""HTTP client for the backend Skills API boundary."""
from __future__ import annotations

from typing import Any

import httpx


class SkillsApiClient:
    """Minimal client used by the orchestrator to call backend capabilities."""

    def __init__(self, base_url: str, timeout: float = 10.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base_url}{path}", json=payload)
            response.raise_for_status()
        return dict(response.json())

    async def health_check(self) -> dict[str, object]:
        """Check backend availability using the shared health endpoint."""
        health_url = self.base_url.removesuffix("/api/v1") + "/health"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(health_url)
            response.raise_for_status()
        return dict(response.json())

    async def get_document(self, document_id: str) -> dict[str, Any]:
        """Retrieve a stored document through the backend Skills API."""
        return await self._post("/skills/get_document", {"document_id": document_id})

    async def search_documents(
        self,
        query: str,
        document_type: str | None = None,
        limit: int = 10,
    ) -> dict[str, Any]:
        """Search documents through the backend Skills API."""
        payload: dict[str, Any] = {"query": query, "limit": limit}
        if document_type is not None:
            payload["document_type"] = document_type
        return await self._post("/skills/search_documents", payload)

    async def extract_text(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Extract text through the backend Skills API."""
        return await self._post("/skills/extract_text", payload)

    async def write_finding(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Persist a finding through the backend Skills API."""
        return await self._post("/skills/write_finding", payload)

    async def log_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Persist an audit event through the backend Skills API."""
        return await self._post("/skills/log_event", payload)
