"""Unit tests for bridge runtime topology orchestration proof."""
from src.doc_quality.core.config import Settings
from src.doc_quality.services.bridge_orchestrator_service import build_runtime_topology_assessment
from src.doc_quality.services.bridge_privacy_service import BridgeAgentId, SandboxStepResult


def _build_sandbox_steps() -> list[SandboxStepResult]:
    return [
        SandboxStepResult(
            step_id="bridge_step_1",
            agent_id=BridgeAgentId.INSPECTION,
            sandbox_id="bridge-inspection-sandbox",
            model_provider="ollama",
            model_id="llama3.1:8b",
            sandbox_mode="local_isolated",
            egress_policy="deny_external",
            processed_locally=True,
        ),
        SandboxStepResult(
            step_id="bridge_step_2",
            agent_id=BridgeAgentId.COMPLIANCE,
            sandbox_id="bridge-compliance-sandbox",
            model_provider="ollama",
            model_id="llama3.1:8b",
            sandbox_mode="local_isolated",
            egress_policy="deny_external",
            processed_locally=True,
        ),
        SandboxStepResult(
            step_id="bridge_step_3",
            agent_id=BridgeAgentId.RESEARCH,
            sandbox_id="bridge-research-sandbox",
            model_provider="ollama",
            model_id="llama3.1:8b",
            sandbox_mode="local_isolated",
            egress_policy="deny_external",
            processed_locally=True,
        ),
        SandboxStepResult(
            step_id="bridge_step_4",
            agent_id=BridgeAgentId.QUALITY_GATE,
            sandbox_id="bridge-quality-gate-sandbox",
            model_provider="ollama",
            model_id="llama3.1:8b",
            sandbox_mode="local_isolated",
            egress_policy="deny_external",
            processed_locally=True,
        ),
    ]


def test_runtime_topology_strict_docker_inspect_blocks_on_probe_failure(monkeypatch) -> None:
    def _inspect_fail(*, runtime_bin: str, container_name: str):
        return False, {}

    monkeypatch.setattr(
        "src.doc_quality.services.bridge_orchestrator_service._inspect_container_via_runtime",
        _inspect_fail,
    )

    settings = Settings(
        bridge_runtime_topology_source="docker_inspect",
        bridge_runtime_topology_allow_metadata_fallback=False,
        bridge_topology_proof_required=True,
    )

    assessment = build_runtime_topology_assessment(
        settings=settings,
        sandbox_steps=_build_sandbox_steps(),
    )

    assert assessment.explicitly_proven is False
    assert assessment.all_agents_healthy is False
    assert len(assessment.agents) == 4
    assert all(item.proof_source == "docker_inspect" for item in assessment.agents)
    assert any("strict docker_inspect proof required" in issue for issue in assessment.issues)


def test_runtime_topology_docker_inspect_can_fallback_when_explicitly_enabled(monkeypatch) -> None:
    def _inspect_fail(*, runtime_bin: str, container_name: str):
        return False, {}

    monkeypatch.setattr(
        "src.doc_quality.services.bridge_orchestrator_service._inspect_container_via_runtime",
        _inspect_fail,
    )

    settings = Settings(
        bridge_runtime_topology_source="docker_inspect",
        bridge_runtime_topology_allow_metadata_fallback=True,
        bridge_topology_proof_required=True,
    )

    assessment = build_runtime_topology_assessment(
        settings=settings,
        sandbox_steps=_build_sandbox_steps(),
    )

    assert assessment.explicitly_proven is True
    assert assessment.isolated_deployments is True
    assert all(item.proof_source == "metadata" for item in assessment.agents)
    assert assessment.issues == []
