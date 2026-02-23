"""Unit tests for the Perplexity research service (all HTTP calls mocked)."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.doc_quality.models.research import ResearchRequest, ResearchResult
from src.doc_quality.services.research_service import (
    _build_research_prompt,
    _extract_frameworks,
    _static_fallback,
    research_regulations,
)


@pytest.fixture
def medical_request() -> ResearchRequest:
    return ResearchRequest(
        domain="medical devices",
        description="AI-powered radiology diagnostic tool",
        target_market="EU",
    )


@pytest.fixture
def finance_request() -> ResearchRequest:
    return ResearchRequest(
        domain="finance",
        description="Automated credit scoring system",
        target_market="EU",
    )


# ── static fallback ──────────────────────────────────────────────────────────

def test_static_fallback_medical(medical_request: ResearchRequest) -> None:
    result = _static_fallback(medical_request)
    assert result.provider == "static_fallback"
    assert any("MDR" in f for f in result.applicable_frameworks)
    assert any("EU AI Act" in f for f in result.applicable_frameworks)
    assert result.model_used is None


def test_static_fallback_finance(finance_request: ResearchRequest) -> None:
    result = _static_fallback(finance_request)
    assert result.provider == "static_fallback"
    assert any("GDPR" in f for f in result.applicable_frameworks)


def test_static_fallback_unknown_domain() -> None:
    req = ResearchRequest(domain="robotics", description="Industrial robot controller", target_market="EU")
    result = _static_fallback(req)
    assert result.provider == "static_fallback"
    assert len(result.applicable_frameworks) > 0
    assert any("EU AI Act" in f for f in result.applicable_frameworks)


# ── prompt builder ────────────────────────────────────────────────────────────

def test_build_research_prompt_default(medical_request: ResearchRequest) -> None:
    prompt = _build_research_prompt(medical_request)
    assert "medical devices" in prompt
    assert "EU AI Act" in prompt
    assert "EU" in prompt


def test_build_research_prompt_custom() -> None:
    req = ResearchRequest(
        domain="finance",
        description="Credit scoring",
        target_market="DE",
        custom_query="What are BSI requirements?",
    )
    prompt = _build_research_prompt(req)
    assert "BSI requirements" in prompt


# ── framework extractor ───────────────────────────────────────────────────────

def test_extract_frameworks_finds_known_regs() -> None:
    text = "The EU AI Act and GDPR both apply. ISO 27001 is recommended."
    found = _extract_frameworks(text)
    assert "EU AI Act" in found
    assert "GDPR" in found
    assert "ISO 27001" in found


def test_extract_frameworks_empty_text() -> None:
    assert _extract_frameworks("") == []


# ── no API key → static fallback ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_research_regulations_no_api_key(medical_request: ResearchRequest) -> None:
    result = await research_regulations(medical_request, api_key="")
    assert result.provider == "static_fallback"
    assert result.domain == "medical devices"


# ── successful Perplexity call ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_research_regulations_success(medical_request: ResearchRequest) -> None:
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "The EU AI Act and MDR apply to medical AI."}}],
        "citations": [{"url": "https://example.com/eu-ai-act", "title": "EU AI Act"}],
    }

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("src.doc_quality.services.research_service.httpx.AsyncClient", return_value=mock_client):
        result = await research_regulations(medical_request, api_key="test-key", model="sonar-pro")

    assert result.provider == "perplexity"
    assert result.model_used == "sonar-pro"
    assert "EU AI Act" in result.applicable_frameworks
    assert "MDR" in result.applicable_frameworks
    assert len(result.citations) == 1
    assert result.citations[0].url == "https://example.com/eu-ai-act"


# ── HTTP error → graceful fallback ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_research_regulations_http_error(medical_request: ResearchRequest) -> None:
    import httpx

    mock_response = MagicMock()
    mock_response.status_code = 401
    error = httpx.HTTPStatusError("Unauthorized", request=MagicMock(), response=mock_response)

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(side_effect=error)

    with patch("src.doc_quality.services.research_service.httpx.AsyncClient", return_value=mock_client):
        result = await research_regulations(medical_request, api_key="bad-key")

    assert result.provider == "static_fallback"
    assert "401" in result.answer


# ── connection error → graceful fallback ─────────────────────────────────────

@pytest.mark.asyncio
async def test_research_regulations_connection_error(medical_request: ResearchRequest) -> None:
    import httpx

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(side_effect=httpx.RequestError("timeout"))

    with patch("src.doc_quality.services.research_service.httpx.AsyncClient", return_value=mock_client):
        result = await research_regulations(medical_request, api_key="test-key")

    assert result.provider == "static_fallback"
    assert "connection error" in result.answer.lower()
