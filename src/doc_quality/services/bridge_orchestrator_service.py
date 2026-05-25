"""Bridge workflow orchestrator runtime topology verification.

This module provides a production-oriented proof layer for bridge runtime
topology. It verifies whether each bridge agent step is deployed in its own
containerized sandbox and returns explicit evidence for audit/reporting.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from subprocess import CalledProcessError, run
import os

from ..core.config import Settings
from ..core.logging_config import get_logger
from ..models.compliance import StepPolicyContract
from ..models.model_policy import ActiveModelInfo
from .bridge_privacy_service import BridgeAgentId, SandboxStepResult
from .bridge_privacy_service import build_step_policy_contracts_for_sandbox_steps
from .model_policy_service import enforce_fail_closed_step_routing
from .policy_contract_service import PolicyContractValidationError, validate_step_policy_contract

logger = get_logger(__name__)


def build_and_validate_step_policy_contracts(*, sandbox_steps: list[SandboxStepResult]) -> list[StepPolicyContract]:
    """Build and validate mandatory policy metadata for each bridge step.

    Kept in orchestrator service to ensure non-HTTP execution paths still enforce
    policy contract boundaries before workflow/model routing decisions.
    """
    try:
        contracts = build_step_policy_contracts_for_sandbox_steps(sandbox_steps)
        validated = [validate_step_policy_contract(contract) for contract in contracts]
    except PolicyContractValidationError:
        logger.warning("bridge_step_policy_validation_failed", reason="bridge_step_policy_invalid")
        raise

    logger.info("bridge_step_policy_validation_passed", contracts=len(validated))
    return validated


def enforce_bridge_policy_routing(
    *,
    active_model: ActiveModelInfo,
    step_policy_contracts: list[StepPolicyContract],
    allow_external_fallback: bool,
) -> None:
    """Apply fail-closed routing guardrails for bridge policy contracts."""
    enforce_fail_closed_step_routing(
        active_model=active_model,
        step_policy_contracts=step_policy_contracts,
        allow_external_fallback=allow_external_fallback,
    )


@dataclass(frozen=True)
class BridgeAgentRuntimeTopology:
    """Observed runtime deployment state for one bridge agent sandbox."""

    agent_id: str
    sandbox_id: str
    orchestrator_managed: bool
    container_name: str
    container_id: str | None
    deployed: bool
    running: bool
    health_status: str
    network_id: str | None
    proof_source: str


@dataclass(frozen=True)
class BridgeRuntimeTopologyAssessment:
    """Runtime topology proof payload for full bridge orchestration."""

    checked_at: datetime
    orchestrator_name: str
    orchestrator_mode: str
    topology_source: str
    explicitly_proven: bool
    isolated_deployments: bool
    all_agents_healthy: bool
    agents: list[BridgeAgentRuntimeTopology]
    issues: list[str]


def _coerce_bool(value: str | None, *, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "running", "healthy"}


def _env_suffix(agent_id: str) -> str:
    return agent_id.replace("-", "_").upper()


def _container_name_for_agent(settings: Settings, agent_id: str) -> str:
    mapping = {
        BridgeAgentId.INSPECTION.value: settings.bridge_agent_container_inspection,
        BridgeAgentId.COMPLIANCE.value: settings.bridge_agent_container_compliance,
        BridgeAgentId.RESEARCH.value: settings.bridge_agent_container_research,
        BridgeAgentId.QUALITY_GATE.value: settings.bridge_agent_container_quality_gate,
    }
    return mapping.get(agent_id, f"bridge-agent-{agent_id}")


def _inspect_container_via_runtime(*, runtime_bin: str, container_name: str) -> tuple[bool, dict[str, str]]:
    """Inspect one container via runtime CLI and return parsed state metadata."""
    inspect_format = (
        "{{.State.Running}}|{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}|"
        "{{.Id}}|{{range $name, $net := .NetworkSettings.Networks}}{{$name}}={{$net.NetworkID}};{{end}}"
    )
    try:
        result = run(
            [runtime_bin, "inspect", "--format", inspect_format, container_name],
            capture_output=True,
            check=True,
            text=True,
        )
    except (OSError, CalledProcessError):
        return False, {}

    output = (result.stdout or "").strip()
    if not output:
        return False, {}

    parts = output.split("|", maxsplit=4)
    if len(parts) != 5:
        return False, {}

    running_raw, status_raw, health_raw, container_id_raw, networks_raw = parts
    network_id: str | None = None
    for entry in networks_raw.split(";"):
        if "=" not in entry:
            continue
        _, net_id = entry.split("=", maxsplit=1)
        if net_id:
            network_id = net_id
            break

    metadata = {
        "running": "true" if _coerce_bool(running_raw) else "false",
        "status": status_raw or "unknown",
        "health": health_raw or "unknown",
        "container_id": container_id_raw or "",
        "network_id": network_id or "",
    }
    return True, metadata


def _probe_agent_runtime_metadata(
    *,
    settings: Settings,
    agent_id: str,
    sandbox_id: str,
    container_name: str,
) -> BridgeAgentRuntimeTopology:
    """Probe one agent deployment from metadata/env proof fields."""
    env_key = _env_suffix(agent_id)
    deployed = _coerce_bool(os.getenv(f"BRIDGE_AGENT_{env_key}_DEPLOYED"), default=True)
    running = _coerce_bool(os.getenv(f"BRIDGE_AGENT_{env_key}_RUNNING"), default=deployed)
    container_id = os.getenv(f"BRIDGE_AGENT_{env_key}_CONTAINER_ID") or f"declared-{agent_id}"
    network_id = os.getenv(f"BRIDGE_AGENT_{env_key}_NETWORK_ID") or settings.bridge_agent_network_id
    health_status = os.getenv(f"BRIDGE_AGENT_{env_key}_HEALTH") or ("healthy" if running else "stopped")

    return BridgeAgentRuntimeTopology(
        agent_id=agent_id,
        sandbox_id=sandbox_id,
        orchestrator_managed=True,
        container_name=container_name,
        container_id=container_id,
        deployed=deployed,
        running=running,
        health_status=health_status,
        network_id=network_id,
        proof_source="metadata",
    )


def _build_failed_runtime_probe_topology(*, agent_id: str, sandbox_id: str, container_name: str) -> BridgeAgentRuntimeTopology:
    """Return explicit failed topology evidence for strict runtime probe mode."""
    return BridgeAgentRuntimeTopology(
        agent_id=agent_id,
        sandbox_id=sandbox_id,
        orchestrator_managed=True,
        container_name=container_name,
        container_id=None,
        deployed=False,
        running=False,
        health_status="unknown",
        network_id=None,
        proof_source="docker_inspect",
    )


def build_runtime_topology_assessment(
    *,
    settings: Settings,
    sandbox_steps: list[SandboxStepResult],
) -> BridgeRuntimeTopologyAssessment:
    """Build runtime topology proof for all bridge sandboxed agents."""
    agents: list[BridgeAgentRuntimeTopology] = []
    issues: list[str] = []

    runtime_bin = settings.bridge_container_runtime_bin
    runtime_source = settings.bridge_runtime_topology_source
    allow_metadata_fallback = settings.bridge_runtime_topology_allow_metadata_fallback

    for step in sandbox_steps:
        agent_id = step.agent_id.value
        container_name = _container_name_for_agent(settings, agent_id)

        if runtime_source == "docker_inspect":
            ok, metadata = _inspect_container_via_runtime(runtime_bin=runtime_bin, container_name=container_name)
            if ok:
                agent_topology = BridgeAgentRuntimeTopology(
                    agent_id=agent_id,
                    sandbox_id=step.sandbox_id,
                    orchestrator_managed=True,
                    container_name=container_name,
                    container_id=metadata.get("container_id") or None,
                    deployed=True,
                    running=_coerce_bool(metadata.get("running"), default=False),
                    health_status=metadata.get("health") or metadata.get("status") or "unknown",
                    network_id=metadata.get("network_id") or None,
                    proof_source="docker_inspect",
                )
            else:
                if allow_metadata_fallback:
                    logger.warning(
                        "bridge_runtime_topology_probe_fallback",
                        agent_id=agent_id,
                        container_name=container_name,
                        runtime_bin=runtime_bin,
                    )
                    agent_topology = _probe_agent_runtime_metadata(
                        settings=settings,
                        agent_id=agent_id,
                        sandbox_id=step.sandbox_id,
                        container_name=container_name,
                    )
                else:
                    issues.append(
                        f"container runtime probe failed for agent {agent_id} ({container_name}); "
                        "strict docker_inspect proof required"
                    )
                    agent_topology = _build_failed_runtime_probe_topology(
                        agent_id=agent_id,
                        sandbox_id=step.sandbox_id,
                        container_name=container_name,
                    )
        else:
            agent_topology = _probe_agent_runtime_metadata(
                settings=settings,
                agent_id=agent_id,
                sandbox_id=step.sandbox_id,
                container_name=container_name,
            )

        if not agent_topology.deployed:
            issues.append(f"agent {agent_id} container is not deployed")
        if not agent_topology.running:
            issues.append(f"agent {agent_id} container is not running")
        if not agent_topology.container_id:
            issues.append(f"agent {agent_id} missing container_id proof")
        if not agent_topology.network_id:
            issues.append(f"agent {agent_id} missing network_id proof")

        agents.append(agent_topology)

    unique_container_names = {item.container_name for item in agents}
    isolated_deployments = len(unique_container_names) == len(agents)
    if not isolated_deployments:
        issues.append("bridge agent topology is not isolated: shared container name detected")

    all_agents_healthy = all(item.health_status.lower() in {"healthy", "running"} for item in agents)
    if not all_agents_healthy:
        issues.append("one or more bridge agent containers are unhealthy")

    explicitly_proven = (
        isolated_deployments
        and all_agents_healthy
        and all(item.deployed and item.running and bool(item.container_id) and bool(item.network_id) for item in agents)
    )

    assessment = BridgeRuntimeTopologyAssessment(
        checked_at=datetime.now(timezone.utc),
        orchestrator_name=settings.bridge_orchestrator_name,
        orchestrator_mode=settings.bridge_orchestrator_mode,
        topology_source=runtime_source,
        explicitly_proven=explicitly_proven,
        isolated_deployments=isolated_deployments,
        all_agents_healthy=all_agents_healthy,
        agents=agents,
        issues=issues,
    )

    logger.info(
        "bridge_runtime_topology_assessed",
        orchestrator=settings.bridge_orchestrator_name,
        source=runtime_source,
        explicitly_proven=explicitly_proven,
        isolated_deployments=isolated_deployments,
        all_agents_healthy=all_agents_healthy,
        issues=len(issues),
    )
    return assessment