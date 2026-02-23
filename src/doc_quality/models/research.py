"""Pydantic models for Perplexity-powered regulatory research results."""
from typing import Literal, Optional
from pydantic import BaseModel, Field


class ResearchRequest(BaseModel):
    """Input for a regulatory research query."""

    domain: str = Field(..., description="Product domain, e.g. 'medical devices', 'finance'")
    description: str = Field(..., description="Short product description for context")
    target_market: str = Field(default="EU", description="Target market / jurisdiction")
    custom_query: Optional[str] = Field(
        default=None,
        description="Optional free-form research question to ask Perplexity",
    )


class ResearchCitation(BaseModel):
    """A cited source returned by Perplexity."""

    url: str
    title: Optional[str] = None


class ResearchResult(BaseModel):
    """Structured result from a Perplexity research query."""

    domain: str
    query: str
    answer: str = Field(..., description="Perplexity answer text")
    citations: list[ResearchCitation] = Field(default_factory=list)
    applicable_frameworks: list[str] = Field(
        default_factory=list,
        description="Regulation/standard names extracted from the answer",
    )
    provider: Literal["perplexity", "static_fallback"] = "perplexity"
    model_used: Optional[str] = None
