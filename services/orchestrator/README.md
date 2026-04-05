# Doc Quality Orchestrator

Standalone CrewAI orchestration service that calls the existing FastAPI backend as its **Skills API / system-of-record**. Agents never open direct DB connections or bypass policy enforcement.

```
┌──────────────────────────────────────────────────────┐
│  services/orchestrator  (port 8010)                  │
│  CrewAI crews + provider adapter layer               │
│  ⟶ calls backend via Skills API (no direct DB)      │
└─────────────────────────┬────────────────────────────┘
                          │  HTTP /api/v1/skills/*
┌─────────────────────────▼────────────────────────────┐
│  src/doc_quality  FastAPI backend  (port 8000)        │
│  Skills API · DB · file parsing · policy enforcement  │
└──────────────────────────────────────────────────────┘
```

---

## Prerequisites

- Python 3.12+
- [`uv`](https://github.com/astral-sh/uv) (or `pip`)
- Anthropic API key (`ANTHROPIC_API_KEY` env var)

---

## Run — two terminals, no Docker

**Terminal 1 — Backend** (from repo root `doc_quality_compliance_check/`)

```bash
# with uv
uv run uvicorn doc_quality.api.main:create_app --factory --host 0.0.0.0 --port 8000 --reload

# or with pip after: pip install -e .
uvicorn doc_quality.api.main:create_app --factory --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Orchestrator** (from `services/orchestrator/`)

```bash
# with uv
uv run python -m doc_quality_orchestrator

# or with pip after: pip install -e .
python -m doc_quality_orchestrator
```

Health check:

```bash
curl http://localhost:8010/health
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `BACKEND_BASE_URL` | `http://localhost:8000/api/v1` | Backend Skills API base URL |
| `ANTHROPIC_API_KEY` | *(required for Anthropic provider)* | Anthropic provider key |
| `ANTHROPIC_MODEL` | `claude-3-5-sonnet-20241022` | Anthropic model name |
| `NEMOTRON_BASE_URL` | `` | Nemotron-compatible endpoint |
| `NEMOTRON_API_KEY` | `` | Nemotron API key |
| `CREWAI_WORKFLOW_ENABLED` | `true` | **Kill switch** — set `false` to force all traffic to `single_agent_wrapper` without redeploy |
| `MAX_STEPS` | `20` | Maximum steps per run |
| `MAX_RETRIES_PER_STEP` | `3` | Max retries per agent step |
| `MAX_TOKEN_BUDGET_PER_RUN` | `100000` | Token budget hard limit (enforced by adapter layer) |
| `STEP_TIMEOUT_SECONDS` | `60` | Per-step timeout in seconds |
| `GLOBAL_RUN_TIMEOUT_SECONDS` | `300` | Entire-run timeout (enforced via `asyncio.wait_for`) |

Place overrides in `services/orchestrator/.env` (gitignored).

---

## Workflows

### `generate_audit_package` (flagship)

Five agents run sequentially. All tool access goes through the backend Skills API.

| Step | Agent | Skills API tools used |
|---|---|---|
| 1 | Intake Specialist | `get_document`, `search_documents` |
| 2 | Evidence Collector | `extract_text`, `search_documents` |
| 3 | Compliance Analyst | `write_finding` |
| 4 | Report Synthesizer | `log_event` |
| 5 | Quality Verifier | *(no tools — reasons from context)* |

Run is marked `successful` only after Verifier outputs `VERIFIED: PASS`.

**Sample request:**

```bash
curl -X POST http://localhost:8010/workflows/run \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "generate_audit_package",
    "provider": "anthropic",
    "input_payload": {
      "document_id": "<your-document-id>"
    }
  }'
```

### Any other `workflow_id`

Routed to the `single_agent_wrapper` scaffold path (light-weight, no CrewAI).

---

## Routing

| `routing_mode` in request | Effective behaviour |
|---|---|
| `"auto"` *(default)* | `crewai_workflow` if `workflow_id=generate_audit_package` + CrewAI importable + kill switch on; else `single_agent_wrapper` |
| `"crewai_workflow"` | Force CrewAI (falls back if not importable or kill switch is off) |
| `"single_agent_wrapper"` | Force scaffold path |

Every routing decision is logged as an `audit_event` in the backend (`event_type: workflow_routing_decision`).

---

## Package layout

```
services/orchestrator/
  pyproject.toml                     # crewai>=0.130.0, fastapi, uvicorn, httpx
  Dockerfile                         # python:3.12-slim, exposes 8010
  src/doc_quality_orchestrator/
    __init__.py
    __main__.py                      # uvicorn entrypoint
    config.py                        # OrchestratorSettings (safety limits, flags)
    models.py                        # Pydantic request/response models
    main.py                          # GET /health  POST /workflows/run
    service.py                       # Router + _run_crew_workflow / _run_scaffold_workflow
    skills_api.py                    # SkillsApiClient (5 skill methods)
    adapters/
      base.py                        # ModelAdapter ABC: generate() / stream()
      anthropic_adapter.py           # Production Anthropic adapter
      openai_compatible_adapter.py   # OpenAI-compatible adapter
      nemotron_adapter.py            # Nemotron scaffold
      registry.py                    # get_adapter() factory
    crews/
      __init__.py
      review_flow.py                 # build_generate_audit_package_crew()
```

---

## Development

```bash
cd services/orchestrator
uv sync                 # installs crewai + all deps
uv run pytest           # (add tests/ when expanding)
```

### Manual LLM smoke test

Use the manual smoke entrypoint only for explicitly approved live-model checks:

- test file: `tests/test_llm_integration_smoke.py`
- marker: `llm_integration`
- default behavior: skip unless approval and budget env vars are set

Operator runbook:

1. Get human approval before any live-model run.
2. Ensure the chosen adapter is no longer scaffold-backed.
3. Set an explicit budget and provider.
4. Run only the smoke-test module.

PowerShell example:

```powershell
$env:PYTHONPATH = (Resolve-Path .\src).Path
$env:RUN_LLM_INTEGRATION_TESTS = "1"
$env:LLM_TEST_HUMAN_APPROVED = "1"
$env:LLM_TEST_BUDGET_TOKENS = "400"
$env:LLM_TEST_PROVIDER = "anthropic"
python -m pytest tests/test_llm_integration_smoke.py -q --cov-fail-under=0
```

Interpretation:

- `skipped` is the expected safe default today when env gates are missing or the provider is still scaffold-backed
- `passed` means the provider returned schema-valid JSON for the validator report
- `failed` means stop and inspect provider wiring, credentials, or response-schema drift before retrying

Do not wire this test into default CI until a real provider exists and cost controls are formally approved.
