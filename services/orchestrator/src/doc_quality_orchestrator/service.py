# -*- coding: utf-8 -*-
"""Orchestrator service: thin wrapper around DocumentReviewFlow orchestration.

Best practice pattern: Service instantiates and delegates to Flow.
Flow owns all orchestration logic, routing decisions, and state management.
"""
from __future__ import annotations

import structlog

from .config import OrchestratorSettings
from .flows import DocumentReviewFlow
from .models import WorkflowRunRequest, WorkflowRunResponse

logger = structlog.get_logger(__name__)


class OrchestratorService:
    """Thin service wrapper that instantiates and delegates to DocumentReviewFlow.

    Responsibilities:
    - Accept HTTP requests (routing via FastAPI controller)
    - Instantiate DocumentReviewFlow with current settings
    - Delegate workflow execution to Flow
    - Return structured response

    All orchestration logic (routing, state, business logic) is in DocumentReviewFlow.
    """

    def __init__(self, settings: OrchestratorSettings) -> None:
        self.settings = settings

    async def run_workflow(self, request: WorkflowRunRequest) -> WorkflowRunResponse:
        """Execute workflow by delegating to DocumentReviewFlow.

        Flow handles:
        - Routing decision (single-agent vs crew)
        - State management (run_id, trace_id)
        - Execution dispatch
        - Global timeout enforcement
        - Audit logging

        Args:
            request: Workflow execution request

        Returns:
            Structured response from Flow
        """
        flow = DocumentReviewFlow(self.settings)
        return await flow.execute_workflow(request)
