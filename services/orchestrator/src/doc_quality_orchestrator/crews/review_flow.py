"""Generate Audit Package crew — flagship CrewAI workflow.

Five agents run sequentially:
    1. Audit Scope Senior Research Specialist
    2. Document Evidence Senior Research Specialist
    3. EU AI Act Critical Reviewer and Risk Analyst
    4. Senior Compliance Instructor for non-technical reviewers
    5. Audit Package Critical Reviewer and Risk Analyst

Agent persona contract (documented in code by design):
    - Role: defines specialist function in the crew
    - Goal: defines outcome-oriented success criteria
    - Backstory: defines experience level, style, and quality standards

All data access goes through the backend Skills API (no direct DB contact).
Agent and task definitions are loaded from YAML configuration
(`config/agents.yaml`, `config/tasks.yaml`) using CrewAI `config=...` convention.
Safety limits (max_retries_per_step) are enforced per-agent via `max_iter`.
The global_run_timeout_seconds limit is enforced by the caller via asyncio.wait_for.
"""
from __future__ import annotations

import json
import inspect
import re
from pathlib import Path
from typing import TYPE_CHECKING, Any
from uuid import UUID

from pydantic import BaseModel, RootModel, ValidationError
import yaml

try:
    import httpx
    from crewai import Agent, Crew, Process, Task  # type: ignore[import-untyped]
    from crewai.tools import BaseTool  # type: ignore[import-untyped]

    _CREWAI_AVAILABLE = True
except ImportError:  # pragma: no cover
    _CREWAI_AVAILABLE = False
    Agent = Crew = Process = Task = BaseTool = None  # type: ignore[assignment,misc]


_CONFIG_DIR = Path(__file__).with_name("config")
_TASKS_CONFIG_PATH = _CONFIG_DIR / "tasks.yaml"
_AGENTS_CONFIG_PATH = _CONFIG_DIR / "agents.yaml"


class IntakeTaskOutput(BaseModel):
    document_id: str
    filename: str
    document_type: str
    content_type: str | None = None
    scope_confirmed: bool


class EvidenceItemOutput(BaseModel):
    text: str
    location: str


class EvidenceTaskOutput(RootModel[list[EvidenceItemOutput]]):
    pass


class ComplianceTaskOutput(RootModel[list[str]]):
    pass


class ScopeSummaryOutput(BaseModel):
    document_id: str
    filename: str
    document_type: str
    scope_confirmed: bool
    content_type: str | None = None


class EvidenceSummaryOutput(BaseModel):
    count: int
    key_items: list[str]


class FindingSummaryOutput(BaseModel):
    finding_id: str
    title: str
    severity: str


class SynthesisTaskOutput(BaseModel):
    scope: ScopeSummaryOutput
    evidence_summary: EvidenceSummaryOutput
    findings_summary: list[FindingSummaryOutput]
    overall_risk: str


_OUTPUT_MODEL_REGISTRY: dict[str, type[BaseModel]] = {
    "intake_output_json": IntakeTaskOutput,
    "evidence_output_json": EvidenceTaskOutput,
    "compliance_output_json": ComplianceTaskOutput,
    "synthesis_output_pydantic": SynthesisTaskOutput,
    "synthesis_output_json": SynthesisTaskOutput,
}


def _extract_task_output_value(output: Any) -> Any:
    """Extract the underlying value from CrewAI task output or raw Python objects."""
    if output is None:
        return output
    if isinstance(output, (dict, list, str)):
        return output
    if isinstance(output, BaseModel):
        return output.model_dump()

    for attr in ("json_dict", "pydantic", "raw", "content", "result"):
        value = getattr(output, attr, None)
        if value is not None:
            if isinstance(value, BaseModel):
                return value.model_dump()
            return value
    return output


def _coerce_json_output(output: Any) -> Any:
    """Coerce task output into JSON-compatible dict/list form when possible."""
    value = _extract_task_output_value(output)
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        return json.loads(value)
    if isinstance(value, BaseModel):
        return value.model_dump()
    raise ValueError("Output is not JSON-compatible")


def _make_validation_result(ok: bool, payload: Any) -> tuple[bool, Any]:
    return ok, payload


def _guardrail_json_object(output: Any) -> tuple[bool, Any]:
    try:
        payload = _coerce_json_output(output)
    except Exception as exc:
        return _make_validation_result(False, f"Guardrail failed: invalid JSON object ({exc})")
    if not isinstance(payload, dict):
        return _make_validation_result(False, "Guardrail failed: expected JSON object")
    return _make_validation_result(True, payload)


def _guardrail_json_array(output: Any) -> tuple[bool, Any]:
    try:
        payload = _coerce_json_output(output)
    except Exception as exc:
        return _make_validation_result(False, f"Guardrail failed: invalid JSON array ({exc})")
    if not isinstance(payload, list):
        return _make_validation_result(False, "Guardrail failed: expected JSON array")
    return _make_validation_result(True, payload)


def _guardrail_no_code_fences(output: Any) -> tuple[bool, Any]:
    value = _extract_task_output_value(output)
    text = value if isinstance(value, str) else json.dumps(value)
    if "```" in text:
        return _make_validation_result(False, "Guardrail failed: code fences are not allowed")
    return _make_validation_result(True, value)


def _make_required_keys_guardrail(required_keys: list[str]):
    def _guardrail(output: Any) -> tuple[bool, Any]:
        try:
            payload = _coerce_json_output(output)
        except Exception as exc:
            return _make_validation_result(False, f"Guardrail failed: invalid JSON payload ({exc})")
        if not isinstance(payload, dict):
            return _make_validation_result(False, "Guardrail failed: expected JSON object for required key check")
        missing = [key for key in required_keys if key not in payload]
        if missing:
            return _make_validation_result(False, f"Guardrail failed: missing keys {missing}")
        return _make_validation_result(True, payload)

    return _guardrail


def _make_list_length_guardrail(min_items: int, max_items: int):
    def _guardrail(output: Any) -> tuple[bool, Any]:
        try:
            payload = _coerce_json_output(output)
        except Exception as exc:
            return _make_validation_result(False, f"Guardrail failed: invalid list payload ({exc})")
        if not isinstance(payload, list):
            return _make_validation_result(False, "Guardrail failed: expected JSON array for length check")
        if not (min_items <= len(payload) <= max_items):
            return _make_validation_result(
                False,
                f"Guardrail failed: expected list length between {min_items} and {max_items}",
            )
        return _make_validation_result(True, payload)

    return _guardrail


def _make_enum_field_guardrail(field_name: str, allowed_values: list[str]):
    def _guardrail(output: Any) -> tuple[bool, Any]:
        try:
            payload = _coerce_json_output(output)
        except Exception as exc:
            return _make_validation_result(False, f"Guardrail failed: invalid enum payload ({exc})")
        if not isinstance(payload, dict):
            return _make_validation_result(False, "Guardrail failed: expected JSON object for enum check")
        if payload.get(field_name) not in allowed_values:
            return _make_validation_result(
                False,
                f"Guardrail failed: field '{field_name}' must be one of {allowed_values}",
            )
        return _make_validation_result(True, payload)

    return _guardrail


def _guardrail_uuid_list(output: Any) -> tuple[bool, Any]:
    try:
        payload = _coerce_json_output(output)
    except Exception as exc:
        return _make_validation_result(False, f"Guardrail failed: invalid UUID list payload ({exc})")
    if not isinstance(payload, list):
        return _make_validation_result(False, "Guardrail failed: expected JSON array of UUID strings")
    try:
        for item in payload:
            UUID(str(item))
    except Exception:
        return _make_validation_result(False, "Guardrail failed: all finding_ids must be valid UUID strings")
    return _make_validation_result(True, payload)


def _guardrail_verification_result(output: Any) -> tuple[bool, Any]:
    value = _extract_task_output_value(output)
    text = value if isinstance(value, str) else str(value)
    if text == "VERIFIED: PASS":
        return _make_validation_result(True, text)
    if re.fullmatch(r"VERIFIED: FAIL — .+", text):
        return _make_validation_result(True, text)
    return _make_validation_result(
        False,
        "Guardrail failed: verification output must exactly match PASS or FAIL format",
    )


def _make_model_guardrail(model_cls: type[BaseModel]):
    def _guardrail(output: Any) -> tuple[bool, Any]:
        try:
            payload = _coerce_json_output(output)
            validated = model_cls.model_validate(payload)
        except (ValueError, ValidationError) as exc:
            return _make_validation_result(False, f"Guardrail failed: schema validation error ({exc})")
        return _make_validation_result(True, validated.model_dump())

    return _guardrail


def _resolve_guardrail_spec(spec: str, model_registry: dict[str, type[BaseModel]]):
    if spec == "json_object":
        return _guardrail_json_object
    if spec == "json_array":
        return _guardrail_json_array
    if spec == "no_code_fences":
        return _guardrail_no_code_fences
    if spec == "uuid_list":
        return _guardrail_uuid_list
    if spec == "verification_result":
        return _guardrail_verification_result
    if spec.startswith("required_keys:"):
        keys = [item.strip() for item in spec.split(":", 1)[1].split(",") if item.strip()]
        return _make_required_keys_guardrail(keys)
    if spec.startswith("list_length_between:"):
        bounds = [item.strip() for item in spec.split(":", 1)[1].split(",")]
        if len(bounds) != 2:
            raise RuntimeError(f"Invalid guardrail spec: {spec}")
        return _make_list_length_guardrail(int(bounds[0]), int(bounds[1]))
    if spec.startswith("enum_field:"):
        field_and_values = spec.split(":", 1)[1]
        field_name, values = field_and_values.split("=", 1)
        allowed_values = [item.strip() for item in values.split("|") if item.strip()]
        return _make_enum_field_guardrail(field_name.strip(), allowed_values)
    if spec.startswith("schema:"):
        model_name = spec.split(":", 1)[1].strip()
        model_cls = model_registry.get(model_name)
        if model_cls is None:
            raise RuntimeError(f"Unknown schema guardrail model: {model_name}")
        return _make_model_guardrail(model_cls)
    raise RuntimeError(f"Unsupported guardrail spec: {spec}")


def _compose_guardrails(
    guardrail_specs: list[str],
    model_registry: dict[str, type[BaseModel]],
):
    guardrail_functions = [_resolve_guardrail_spec(spec, model_registry) for spec in guardrail_specs]

    def _guardrail(output: Any) -> tuple[bool, Any]:
        current = output
        for validator in guardrail_functions:
            ok, next_value = validator(current)
            if not ok:
                return False, next_value
            current = next_value
        return True, current

    return _guardrail


def _load_agents_config() -> dict[str, dict[str, str]]:
    """Load CrewAI agent persona definitions from YAML configuration."""
    if not _AGENTS_CONFIG_PATH.exists():
        raise RuntimeError(f"Agents config file not found: {_AGENTS_CONFIG_PATH}")

    with _AGENTS_CONFIG_PATH.open("r", encoding="utf-8") as handle:
        loaded: dict[str, Any] = yaml.safe_load(handle) or {}

    agents_section = loaded.get("agents")
    if not isinstance(agents_section, dict):
        raise RuntimeError("Invalid agents config: top-level 'agents' mapping is required")

    required_agents = (
        "intake_agent",
        "evidence_agent",
        "compliance_agent",
        "synthesis_agent",
        "verifier_agent",
    )
    for agent_name in required_agents:
        agent_cfg = agents_section.get(agent_name)
        if not isinstance(agent_cfg, dict):
            raise RuntimeError(f"Invalid agents config: missing agent mapping '{agent_name}'")
        for field in ("role", "goal", "backstory"):
            if not isinstance(agent_cfg.get(field), str):
                raise RuntimeError(
                    f"Invalid agents config: '{agent_name}.{field}' must be a string"
                )

    return agents_section  # type: ignore[return-value]


def _load_tasks_config(agents_config: dict[str, dict[str, str]]) -> dict[str, dict[str, Any]]:
    """Load CrewAI task descriptions/outputs from YAML configuration.

    Returns:
        Mapping keyed by task method id (intake_task, evidence_task, compliance_task,
        synthesis_task, verify_task) with required and optional CrewAI task attributes.

    Raises:
        RuntimeError: if configuration file is missing or malformed.
    """
    if not _TASKS_CONFIG_PATH.exists():
        raise RuntimeError(f"Task config file not found: {_TASKS_CONFIG_PATH}")

    with _TASKS_CONFIG_PATH.open("r", encoding="utf-8") as handle:
        loaded: dict[str, Any] = yaml.safe_load(handle) or {}

    tasks_section = loaded.get("tasks")
    if not isinstance(tasks_section, dict):
        raise RuntimeError("Invalid tasks config: top-level 'tasks' mapping is required")

    required_tasks = (
        "intake_task",
        "evidence_task",
        "compliance_task",
        "synthesis_task",
        "verify_task",
    )
    for task_name in required_tasks:
        task_cfg = tasks_section.get(task_name)
        if not isinstance(task_cfg, dict):
            raise RuntimeError(f"Invalid tasks config: missing task mapping '{task_name}'")
        if not isinstance(task_cfg.get("description"), str):
            raise RuntimeError(f"Invalid tasks config: '{task_name}.description' must be a string")
        if not isinstance(task_cfg.get("expected_output"), str):
            raise RuntimeError(f"Invalid tasks config: '{task_name}.expected_output' must be a string")
        if not isinstance(task_cfg.get("agent"), str):
            raise RuntimeError(f"Invalid tasks config: '{task_name}.agent' must be a string")
        if task_cfg["agent"] not in agents_config:
            raise RuntimeError(
                f"Invalid tasks config: '{task_name}.agent' references unknown agent "
                f"'{task_cfg['agent']}'"
            )

        # Optional CrewAI attributes (type validation)
        optional_type_checks: dict[str, tuple[type, ...]] = {
            "name": (str,),
            "tools": (list,),
            "context": (list,),
            "async_execution": (bool,),
            "human_input": (bool,),
            "markdown": (bool,),
            "output_file": (str,),
            "create_directory": (bool,),
            "output_json": (str,),
            "output_pydantic": (str,),
            "guardrail": (str,),
            "guardrails": (list,),
            "guardrail_max_retries": (int,),
        }
        for key, expected_types in optional_type_checks.items():
            if key in task_cfg and not isinstance(task_cfg[key], expected_types):
                raise RuntimeError(
                    f"Invalid tasks config: '{task_name}.{key}' must be of type "
                    f"{', '.join(t.__name__ for t in expected_types)}"
                )

        if "tools" in task_cfg:
            if not all(isinstance(tool_name, str) for tool_name in task_cfg["tools"]):
                raise RuntimeError(
                    f"Invalid tasks config: '{task_name}.tools' entries must be strings"
                )

        if "context" in task_cfg:
            if not all(isinstance(task_ref, str) for task_ref in task_cfg["context"]):
                raise RuntimeError(
                    f"Invalid tasks config: '{task_name}.context' entries must be task name strings"
                )

        if "guardrails" in task_cfg:
            if not all(isinstance(spec, str) for spec in task_cfg["guardrails"]):
                raise RuntimeError(
                    f"Invalid tasks config: '{task_name}.guardrails' entries must be strings"
                )

    return tasks_section  # type: ignore[return-value]


def _build_agent_with_config(
    config: dict[str, str],
    *,
    tools: list[Any],
    max_retries_per_step: int,
) -> Any:
    """Build Agent using CrewAI `config=...` convention with compatibility fallback."""
    try:
        return Agent(  # type: ignore[call-arg]
            config=config,
            tools=tools,
            max_iter=max_retries_per_step,
            allow_delegation=False,
            verbose=False,
        )
    except TypeError:
        # Compatibility fallback for CrewAI versions without `config` support.
        return Agent(  # type: ignore[call-arg]
            role=config["role"],
            goal=config["goal"],
            backstory=config["backstory"],
            tools=tools,
            max_iter=max_retries_per_step,
            allow_delegation=False,
            verbose=False,
        )


def _build_task_with_config(
    config: dict[str, Any],
    *,
    agent: Any,
    tool_registry: dict[str, Any],
    task_registry: dict[str, Any],
    context: list[Any] | None = None,
) -> Any:
    """Build Task using CrewAI `config=...` convention with compatibility fallback."""

    task_config: dict[str, Any] = {
        "description": config["description"],
        "expected_output": config["expected_output"],
        "agent": config["agent"],
    }
    if "name" in config:
        task_config["name"] = config["name"]

    for structured_key in ("output_json", "output_pydantic"):
        if structured_key in config:
            task_config[structured_key] = config[structured_key]

    resolved_context = context or [task_registry[name] for name in config.get("context", [])]
    resolved_tools = [tool_registry[name] for name in config.get("tools", []) if name in tool_registry]

    if "output_json" in config:
        model_name = config["output_json"]
        if model_name not in _OUTPUT_MODEL_REGISTRY:
            raise RuntimeError(f"Unknown output_json model: {model_name}")
    if "output_pydantic" in config:
        model_name = config["output_pydantic"]
        if model_name not in _OUTPUT_MODEL_REGISTRY:
            raise RuntimeError(f"Unknown output_pydantic model: {model_name}")

    guardrail_specs: list[str] = []
    if "guardrail" in config:
        guardrail_specs.append(config["guardrail"])
    guardrail_specs.extend(config.get("guardrails", []))
    if "output_json" in config:
        guardrail_specs.append(f"schema:{config['output_json']}")
    if "output_pydantic" in config:
        guardrail_specs.append(f"schema:{config['output_pydantic']}")

    task_kwargs: dict[str, Any] = {
        "agent": agent,
        "context": resolved_context,
    }
    if resolved_tools:
        task_kwargs["tools"] = resolved_tools

    for optional_key in (
        "name",
        "async_execution",
        "human_input",
        "markdown",
        "output_file",
        "output_json",
        "output_pydantic",
        "guardrail_max_retries",
    ):
        if optional_key in config:
            if optional_key in {"output_json", "output_pydantic"}:
                task_kwargs[optional_key] = _OUTPUT_MODEL_REGISTRY[config[optional_key]]
            else:
                task_kwargs[optional_key] = config[optional_key]

    if guardrail_specs:
        task_kwargs["guardrail"] = _compose_guardrails(guardrail_specs, _OUTPUT_MODEL_REGISTRY)

    if config.get("create_directory") and isinstance(config.get("output_file"), str):
        Path(config["output_file"]).parent.mkdir(parents=True, exist_ok=True)

    # Keep only kwargs supported by current CrewAI Task signature for compatibility.
    if Task is not None:
        try:
            sig = inspect.signature(Task)
            accepted = set(sig.parameters.keys())
            has_var_kw = any(
                p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values()
            )
            if not has_var_kw:
                task_kwargs = {k: v for k, v in task_kwargs.items() if k in accepted}
        except (TypeError, ValueError):
            # If signature introspection is unavailable, keep kwargs as-is.
            pass

    try:
        return Task(  # type: ignore[call-arg]
            config=task_config,
            **task_kwargs,
        )
    except TypeError:
        # Compatibility fallback for CrewAI versions without `config` support.
        fallback_kwargs = {k: v for k, v in task_kwargs.items() if k not in {"name"}}
        return Task(  # type: ignore[call-arg]
            description=task_config["description"],
            expected_output=task_config["expected_output"],
            **fallback_kwargs,
        )


def build_generate_audit_package_crew(
    *,
    backend_base_url: str,
    trace_id: str,
    correlation_id: str,
    document_id: str | None = None,
    max_retries_per_step: int = 3,
) -> Any:
    """Build and return a configured *Generate Audit Package* CrewAI crew.

    Persona matrix (Role / Goal / Backstory):
    - Intake agent: scope resolution specialist for document and metadata validation.
    - Evidence agent: evidence extraction specialist focused on high-signal, citation-ready data.
    - Compliance agent: skeptical risk reviewer mapping evidence to policy requirements.
    - Synthesis agent: educator-style explainer for clear non-technical audit communication.
    - Verifier agent: final critical quality gate for schema/evidence/hallucination checks.

    Persona quality checklist used for these agents:
    - Role is precise enough to assign to a human specialist.
    - Goal is outcome-oriented and reviewable.
    - Backstory encodes experience, style, and quality bar.
    - Function remains clear even when reading only role/goal/backstory.

    Safety limits:
    - Per-agent retries are set via ``max_iter=max_retries_per_step``.
    - The global run timeout is enforced externally with ``asyncio.wait_for``.

    Raises:
        RuntimeError: if the ``crewai`` package is not importable.
    """
    if not _CREWAI_AVAILABLE:
        raise RuntimeError(
            "crewai package is not installed; cannot build GenerateAuditPackage crew. "
            "Install it with: pip install crewai"
        )

    base_url = backend_base_url.rstrip("/")

    # ------------------------------------------------------------------ tools

    class _SkillsBase(BaseTool):  # type: ignore[misc,valid-type]
        """Shared sync HTTP transport for all Skills API tools."""

        base_url: str = base_url  # type: ignore[assignment]

        def _post(self, path: str, payload: dict[str, Any]) -> str:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(f"{self.base_url}{path}", json=payload)
                if resp.status_code in (400, 404, 422):
                    return json.dumps(
                        {"error": resp.text, "status_code": resp.status_code}
                    )
                resp.raise_for_status()
            return json.dumps(resp.json())

    class GetDocumentTool(_SkillsBase):  # type: ignore[misc,valid-type]
        name: str = "get_document"
        description: str = (
            "Retrieve a stored document record from the backend Skills API by document_id. "
            "Input: document_id (str). "
            "Returns JSON with filename, content_type, extracted_text, and document_type."
        )

        def _run(self, document_id: str) -> str:  # type: ignore[override]
            return self._post("/skills/get_document", {"document_id": document_id})

    class SearchDocumentsTool(_SkillsBase):  # type: ignore[misc,valid-type]
        name: str = "search_documents"
        description: str = (
            "Search stored documents using a keyword query via the backend Skills API. "
            "Inputs: query (str), limit (int, default 10). "
            "Returns JSON list of matching document records."
        )

        def _run(self, query: str = "", limit: int = 10) -> str:  # type: ignore[override]
            return self._post("/skills/search_documents", {"query": query, "limit": limit})

    class ExtractTextTool(_SkillsBase):  # type: ignore[misc,valid-type]
        name: str = "extract_text"
        description: str = (
            "Extract plain text from a document stored in the backend Skills API. "
            "Provide document_id to extract from a stored document, or content_base64 + filename "
            "to extract inline. Pass store_document=true to persist the result. "
            "Returns JSON with extracted_text and document_id."
        )

        def _run(  # type: ignore[override]
            self,
            document_id: str | None = None,
            content_base64: str | None = None,
            filename: str | None = None,
            store_document: bool = False,
        ) -> str:
            payload: dict[str, Any] = {"store_document": store_document}
            if document_id:
                payload["document_id"] = document_id
            if content_base64:
                payload["content_base64"] = content_base64
                payload["filename"] = filename or "document.txt"
            return self._post("/skills/extract_text", payload)

    class WriteFindingTool(_SkillsBase):  # type: ignore[misc,valid-type]
        name: str = "write_finding"
        description: str = (
            "Persist a compliance finding to the backend Skills API. "
            "Required inputs: document_id, finding_type, title, description, severity (low/medium/high/critical). "
            "Optional: evidence (list of strings — MUST cite actual extracted text). "
            "Returns JSON with finding_id."
        )

        def _run(  # type: ignore[override]
            self,
            document_id: str,
            finding_type: str,
            title: str,
            description: str,
            severity: str = "medium",
            evidence: list[str] | None = None,
        ) -> str:
            payload: dict[str, Any] = {
                "document_id": document_id,
                "finding_type": finding_type,
                "title": title,
                "description": description,
                "severity": severity,
                "evidence": evidence or [],
            }
            return self._post("/skills/write_finding", payload)

    class LogEventTool(_SkillsBase):  # type: ignore[misc,valid-type]
        name: str = "log_event"
        description: str = (
            "Persist an audit event to the backend Skills API. "
            "Required inputs: event_type, actor_type, actor_id. "
            "Optional: subject_type, subject_id, extra_payload (dict). "
            "Returns JSON with event_id."
        )

        def _run(  # type: ignore[override]
            self,
            event_type: str,
            actor_type: str,
            actor_id: str,
            subject_type: str | None = None,
            subject_id: str | None = None,
            extra_payload: dict[str, Any] | None = None,
        ) -> str:
            payload: dict[str, Any] = {
                "event_type": event_type,
                "actor_type": actor_type,
                "actor_id": actor_id,
                "trace_id": trace_id,
                "correlation_id": correlation_id,
                "payload": extra_payload or {},
            }
            if subject_type:
                payload["subject_type"] = subject_type
            if subject_id:
                payload["subject_id"] = subject_id
            return self._post("/skills/log_event", payload)

    # ---- instantiate tools
    get_doc_tool = GetDocumentTool()
    search_docs_tool = SearchDocumentsTool()
    extract_tool = ExtractTextTool()
    write_finding_tool = WriteFindingTool()
    log_event_tool = LogEventTool()

    tool_registry: dict[str, Any] = {
        "get_document": get_doc_tool,
        "search_documents": search_docs_tool,
        "extract_text": extract_tool,
        "write_finding": write_finding_tool,
        "log_event": log_event_tool,
    }

    # ----------------------------------------------------------------- agents
    agent_cfg = _load_agents_config()

    intake_agent = _build_agent_with_config(
        agent_cfg["intake_agent"],
        tools=[get_doc_tool, search_docs_tool],
        max_retries_per_step=max_retries_per_step,
    )

    evidence_agent = _build_agent_with_config(
        agent_cfg["evidence_agent"],
        tools=[extract_tool, search_docs_tool],
        max_retries_per_step=max_retries_per_step,
    )

    compliance_agent = _build_agent_with_config(
        agent_cfg["compliance_agent"],
        tools=[write_finding_tool],
        max_retries_per_step=max_retries_per_step,
    )

    synthesis_agent = _build_agent_with_config(
        agent_cfg["synthesis_agent"],
        tools=[log_event_tool],
        max_retries_per_step=max_retries_per_step,
    )

    verifier_agent = _build_agent_with_config(
        agent_cfg["verifier_agent"],
        tools=[],
        max_retries_per_step=max_retries_per_step,
    )

    # ------------------------------------------------------------------ tasks

    task_cfg = _load_tasks_config(agent_cfg)
    task_registry: dict[str, Any] = {}

    doc_context = (
        f"Target document_id: {document_id!r}."
        if document_id
        else "No specific document_id provided; search for the most recent relevant document."
    )
    trace_ctx = f"trace_id={trace_id!r}, correlation_id={correlation_id!r}."
    task_vars = {"doc_context": doc_context, "trace_ctx": trace_ctx}

    intake_task_config = {
        **task_cfg["intake_task"],
        "description": task_cfg["intake_task"]["description"].format(**task_vars),
    }
    intake_task = _build_task_with_config(
        intake_task_config,
        agent=intake_agent,
        tool_registry=tool_registry,
        task_registry=task_registry,
    )
    task_registry["intake_task"] = intake_task

    evidence_task_config = {
        **task_cfg["evidence_task"],
        "description": task_cfg["evidence_task"]["description"].format(**task_vars),
    }
    evidence_task = _build_task_with_config(
        evidence_task_config,
        agent=evidence_agent,
        tool_registry=tool_registry,
        task_registry=task_registry,
    )
    task_registry["evidence_task"] = evidence_task

    compliance_task_config = {
        **task_cfg["compliance_task"],
        "description": task_cfg["compliance_task"]["description"].format(**task_vars),
    }
    compliance_task = _build_task_with_config(
        compliance_task_config,
        agent=compliance_agent,
        tool_registry=tool_registry,
        task_registry=task_registry,
    )
    task_registry["compliance_task"] = compliance_task

    synthesis_task_config = {
        **task_cfg["synthesis_task"],
        "description": task_cfg["synthesis_task"]["description"].format(**task_vars),
    }
    synthesis_task = _build_task_with_config(
        synthesis_task_config,
        agent=synthesis_agent,
        tool_registry=tool_registry,
        task_registry=task_registry,
    )
    task_registry["synthesis_task"] = synthesis_task

    verify_task_config = {
        **task_cfg["verify_task"],
        "description": task_cfg["verify_task"]["description"].format(**task_vars),
    }
    verify_task = _build_task_with_config(
        verify_task_config,
        agent=verifier_agent,
        tool_registry=tool_registry,
        task_registry=task_registry,
    )
    task_registry["verify_task"] = verify_task

    # ------------------------------------------------------------------- crew

    crew: Crew = Crew(  # type: ignore[call-arg]
        agents=[
            intake_agent,
            evidence_agent,
            compliance_agent,
            synthesis_agent,
            verifier_agent,
        ],
        tasks=[
            intake_task,
            evidence_task,
            compliance_task,
            synthesis_task,
            verify_task,
        ],
        process=Process.sequential,  # type: ignore[attr-defined]
        verbose=False,
        memory=False,
        max_rpm=10,
    )
    return crew
