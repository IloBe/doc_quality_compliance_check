"""API tests for regulatory research routes."""
from __future__ import annotations

from src.doc_quality.agents.research_agent import ResearchAgent
from src.doc_quality.models.orm import QualityObservationORM
from src.doc_quality.models.research import ResearchCitation, ResearchResult


async def _mock_perplexity_research(self, request):
    return ResearchResult(
        domain=request.domain,
        query="mocked research query",
        answer="The EU AI Act and MDR apply to this medical product.",
        citations=[ResearchCitation(url="https://example.com/eu-ai-act", title="EU AI Act")],
        applicable_frameworks=["EU AI Act", "MDR"],
        provider="perplexity",
        model_used="sonar-pro",
    )


async def _mock_static_fallback_research(self, request):
    return ResearchResult(
        domain=request.domain,
        query="mocked fallback query",
        answer="Static regulation lookup for the requested domain.",
        citations=[],
        applicable_frameworks=["EU AI Act", "GDPR"],
        provider="static_fallback",
        model_used=None,
    )


def test_research_regulations_positive_path_returns_frameworks_and_logs_observation(
    client, test_db_session, monkeypatch
) -> None:
    monkeypatch.setattr(ResearchAgent, "research", _mock_perplexity_research)

    response = client.post(
        "/api/v1/research/regulations",
        json={
            "domain": "medical devices",
            "description": "AI-powered radiology support",
            "target_market": "EU",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "perplexity"
    assert payload["model_used"] == "sonar-pro"
    assert "EU AI Act" in payload["applicable_frameworks"]
    assert payload["citations"][0]["url"] == "https://example.com/eu-ai-act"

    rows = test_db_session.query(QualityObservationORM).filter(
        QualityObservationORM.source_component == "research_agent",
        QualityObservationORM.subject_id == "medical devices",
    ).all()
    assert len(rows) == 1
    assert rows[0].payload["provider"] == "perplexity"
    assert "EU AI Act" in rows[0].payload["frameworks"]


def test_research_regulations_fallback_path_returns_frameworks_without_observation(
    client, test_db_session, monkeypatch
) -> None:
    monkeypatch.setattr(ResearchAgent, "research", _mock_static_fallback_research)

    response = client.post(
        "/api/v1/research/regulations",
        json={
            "domain": "finance",
            "description": "Automated scoring workflow",
            "target_market": "EU",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "static_fallback"
    assert payload["model_used"] is None
    assert "GDPR" in payload["applicable_frameworks"]

    rows = test_db_session.query(QualityObservationORM).filter(
        QualityObservationORM.source_component == "research_agent",
        QualityObservationORM.subject_id == "finance",
    ).all()
    assert rows == []