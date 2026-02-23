# AGENTS.md — Doc Quality Compliance Check

This file is the AAMAD framework bridge file for VS Code + GitHub Copilot.
It enables IDE discoverability of all agent personas and project context.

## Project Overview

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Framework:** AAMAD (AI-Assisted Multi-Agent Application Development)  
**IDE:** VS Code + GitHub Copilot  
**AAMAD_ADAPTER:** vscode  

## Agent Personas

All agent personas are defined in `.github/agents/`:

| Agent | File | Phase | Epic |
|-------|------|-------|------|
| Product Manager | `.github/agents/product-mgr.agent.md` | Define | MRD + PRD |
| System Architect | `.github/agents/system-arch.agent.md` | Define/Build | SAD |
| Project Manager | `.github/agents/project-mgr.agent.md` | Build | Setup |
| Frontend Engineer | `.github/agents/frontend-eng.agent.md` | Build | Frontend |
| Backend Engineer | `.github/agents/backend-eng.agent.md` | Build | Backend |
| Integration Engineer | `.github/agents/integration-eng.agent.md` | Build | Integration |
| QA Engineer | `.github/agents/qa-eng.agent.md` | Build | QA |

## Project Context

All phase artifacts are stored in `project-context/`:

| Directory | Contents |
|-----------|----------|
| `project-context/1.define/` | MRD, PRD, SAD |
| `project-context/2.build/` | setup.md, frontend.md, backend.md, integration.md, qa.md |
| `project-context/3.deliver/` | Deploy configs, QA logs (future) |

## AAMAD Rules & Instructions

Copilot instructions are in `.github/instructions/`:

| File | Purpose |
|------|---------|
| `aamad-core.instructions.md` | Core AAMAD principles (alwaysApply) |
| `development-workflow.instructions.md` | Modular development workflow |
| `epics-index.instructions.md` | Epic-to-agent mapping |
| `adapter-registry.instructions.md` | Adapter abstraction |
| `adapter-crewai.instructions.md` | CrewAI-specific rules |

## Quick Start for Copilot Chat

1. Open VS Code with GitHub Copilot extension
2. Use `@product-mgr` to update requirements
3. Use `@system-arch` to update architecture
4. Use `@backend-eng` to implement features
5. Use `@qa-eng` to validate changes

## Environment

```bash
AAMAD_ADAPTER=vscode
ANTHROPIC_API_KEY=<optional>
```
