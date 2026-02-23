"""Pytest configuration and shared fixtures."""
import pytest
from fastapi.testclient import TestClient

from src.doc_quality.api.main import app


@pytest.fixture
def client() -> TestClient:
    """Return a FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def sample_arc42_content() -> str:
    return """
# Architecture Documentation (arc42)

## Introduction and Goals
This document describes the architecture.

## Constraints
Technical constraints apply.

## Context and Scope
System context is defined here.

## Solution Strategy
The solution strategy involves microservices.

## Building Block View
Components are described here.

## Runtime View
Runtime scenarios are documented.

## Deployment View
Deployment is done via containers.

## Concepts
Cross-cutting concepts include logging and security.

## Architecture Decisions
Key decisions are recorded here.

## Quality Requirements
Quality goals: performance, security, maintainability.

## Risks and Technical Debt
Known risks are listed here.

## Glossary
| Term | Definition |
|------|-----------|
| API  | Application Programming Interface |

### System Context Diagram
```
[User] -> [System] -> [Database]
```

### Component Diagram
```
[API Layer] -> [Service Layer] -> [Data Layer]
```

### Sequence Diagram
```
User -> API: Request
API -> Service: Process
Service -> DB: Query
```
"""


@pytest.fixture
def sample_model_card_content() -> str:
    return """
# Model Card

## Model Details
Name: MyModel v1.0

## Intended Use
Primary use: document classification

## Factors
Key factors: text length, language

## Metrics
Accuracy: 0.92

## Evaluation Data
Test set of 1000 documents

## Training Data
50000 labeled documents

## Quantitative Analyses
Performance breakdown by category

## Ethical Considerations
Bias assessment completed

## Caveats and Recommendations
Recommended for English documents only
"""
