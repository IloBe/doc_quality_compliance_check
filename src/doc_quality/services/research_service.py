"""Perplexity-powered regulatory research service.

Uses the Perplexity Sonar API (OpenAI-compatible) to research applicable
regulations and standards for a given product domain.  Gracefully falls back
to a static regulation map when no API key is configured.

Perplexity API reference: https://docs.perplexity.ai/api-reference/chat-completions
"""
import re
from typing import Any

import httpx

from ..core.logging_config import get_logger
from ..models.research import ResearchCitation, ResearchRequest, ResearchResult

logger = get_logger(__name__)

# Static fallback: domain keyword → known regulation names
_STATIC_FALLBACK: dict[str, list[str]] = {
    "medical": [
        "EU AI Act (Regulation (EU) 2024/1689)",
        "MDR – Medical Device Regulation (EU) 2017/745",
        "IVDR – In Vitro Diagnostic Regulation (EU) 2017/746",
        "ISO 13485 – Medical devices QMS",
        "IEC 62304 – Medical device software lifecycle",
    ],
    "finance": [
        "EU AI Act (Regulation (EU) 2024/1689)",
        "GDPR (Regulation (EU) 2016/679)",
        "MiFID II (Directive 2014/65/EU)",
        "DORA – Digital Operational Resilience Act (EU) 2022/2554",
        "PSD2 – Payment Services Directive (EU) 2015/2366",
    ],
    "hr": [
        "EU AI Act (Regulation (EU) 2024/1689) – Annex III employment use case",
        "GDPR (Regulation (EU) 2016/679)",
        "AGG – Allgemeines Gleichbehandlungsgesetz (Germany)",
    ],
    "default": [
        "EU AI Act (Regulation (EU) 2024/1689)",
        "GDPR (Regulation (EU) 2016/679)",
        "ISO 27001 – Information security management",
        "BSI Grundschutz – IT-Grundschutz (Germany)",
        "ISO 9001 – Quality management systems",
    ],
}

# Known regulation names used for extraction from free-form Perplexity answers
_KNOWN_REGULATIONS = [
    "EU AI Act",
    "GDPR",
    "MDR",
    "IVDR",
    "DORA",
    "MiFID",
    "PSD2",
    "ISO 13485",
    "ISO 27001",
    "ISO 9001",
    "IEC 62304",
    "BSI Grundschutz",
    "NIS2",
    "CRA",
    "AGG",
]

_PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"


def _build_research_prompt(request: ResearchRequest) -> str:
    """Build a focused research prompt for Perplexity."""
    base = (
        f"I am developing a software product in the domain of '{request.domain}'. "
        f"Product description: {request.description}. "
        f"Target market: {request.target_market}. "
    )
    if request.custom_query:
        return base + request.custom_query

    return (
        base
        + "What are all applicable EU and German regulations, standards, and compliance "
        "requirements for this type of product? Focus especially on: "
        "1) AI-specific regulations (EU AI Act), "
        "2) domain-specific EU regulations, "
        "3) German national regulations (BSI, BfArM, etc.), "
        "4) relevant ISO/IEC standards. "
        "List each regulation with its official name, number, and a brief explanation "
        "of why it applies. Include citations."
    )


def _extract_frameworks(answer: str) -> list[str]:
    """Extract known regulation names mentioned in a Perplexity answer."""
    found: list[str] = []
    answer_upper = answer.upper()
    for reg in _KNOWN_REGULATIONS:
        if reg.upper() in answer_upper:
            found.append(reg)
    return found


def _static_fallback(request: ResearchRequest) -> ResearchResult:
    """Return a static regulation list when no API key is configured."""
    domain_lower = request.domain.lower()
    frameworks: list[str] = []
    for key, regs in _STATIC_FALLBACK.items():
        if key != "default" and key in domain_lower:
            frameworks = regs
            break
    if not frameworks:
        frameworks = _STATIC_FALLBACK["default"]

    answer = (
        f"Static regulation lookup for domain '{request.domain}' "
        f"(Perplexity API key not configured):\n\n"
        + "\n".join(f"- {r}" for r in frameworks)
    )
    logger.info("research_static_fallback", domain=request.domain)
    return ResearchResult(
        domain=request.domain,
        query=_build_research_prompt(request),
        answer=answer,
        citations=[],
        applicable_frameworks=frameworks,
        provider="static_fallback",
        model_used=None,
    )


async def research_regulations(
    request: ResearchRequest,
    api_key: str,
    model: str = "sonar-pro",
    api_base_url: str = _PERPLEXITY_API_URL,
    timeout: float = 30.0,
) -> ResearchResult:
    """Query Perplexity Sonar for applicable regulations.

    Falls back to a static lookup if *api_key* is empty.

    Args:
        request: Domain info and optional custom query.
        api_key: Perplexity API key (from settings).
        model: Perplexity model name (default: ``sonar-pro``).
        api_base_url: Perplexity chat-completions endpoint.
        timeout: HTTP request timeout in seconds.

    Returns:
        :class:`ResearchResult` with answer text, citations, and extracted
        regulation names.
    """
    if not api_key:
        return _static_fallback(request)

    prompt = _build_research_prompt(request)
    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a European regulatory compliance expert specialising in "
                    "AI governance, product safety law, and German/EU standards. "
                    "Always cite your sources with URLs."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "return_citations": True,
        "temperature": 0.1,
    }

    logger.info("perplexity_research_start", domain=request.domain, model=model)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                api_base_url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error(
            "perplexity_http_error",
            status=exc.response.status_code,
            domain=request.domain,
        )
        # Graceful degradation
        fallback = _static_fallback(request)
        fallback.answer = f"Perplexity API error ({exc.response.status_code}). {fallback.answer}"
        return fallback
    except httpx.RequestError as exc:
        logger.error("perplexity_request_error", error=str(exc), domain=request.domain)
        fallback = _static_fallback(request)
        fallback.answer = f"Perplexity connection error. {fallback.answer}"
        return fallback

    data = response.json()
    answer_text: str = (
        data.get("choices", [{}])[0].get("message", {}).get("content", "")
    )

    # Extract inline citations returned by Perplexity
    raw_citations: list[dict[str, Any]] = data.get("citations", [])
    citations = [
        ResearchCitation(url=c.get("url", ""), title=c.get("title"))
        for c in raw_citations
        if c.get("url")
    ]

    frameworks = _extract_frameworks(answer_text)

    logger.info(
        "perplexity_research_complete",
        domain=request.domain,
        model=model,
        citations=len(citations),
        frameworks=len(frameworks),
    )

    return ResearchResult(
        domain=request.domain,
        query=prompt,
        answer=answer_text,
        citations=citations,
        applicable_frameworks=frameworks,
        provider="perplexity",
        model_used=model,
    )
