# Frontend Page Documentation — Workflow / Bridge Overview

**Page label:** Bridge Architecture  
**Route:** `/workflow` with `/bridge` as alias  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented overview page, largely informational/demo-oriented

## Purpose

Explain the orchestration model used for document checks and provide a clear entry from overview context into a document-level Bridge run.

## Current implementation

- `frontend/pages/workflow.tsx` is the canonical page.
- `frontend/pages/bridge.tsx` simply re-exports the workflow page.
- Shows pre-title label `Bridge Architecture` and title `Workflow Orchestration`.
- Shows a `LuInfo` toggle for the `Why this page matters` panel.
- Renders four overview cards: Inspection, Compliance, Template Core, and Research RAG.
- Provides a button that navigates to `/doc/DOC-001/bridge`.
- Shows a large `Dynamic Agent Routing` status card with static summary metrics.

## Data sources and state

- Current counts and metrics are static/presentational values in the page component.
- No backend orchestration feed is currently fetched on this overview page.

## UX and behavior contract

- The page must communicate orchestration purpose clearly for QA, auditors, and product leads.
- The demo Bridge entry button must remain a reliable path into a document-level session.
- The `Reload Agents` button is currently presentational and should not be documented as a live backend refresh action.

## Known boundaries

- Crew/infrastructure metrics on this page are currently illustrative, not live operational telemetry.
- This page frames the workflow; it does not itself execute the Bridge run.

## Acceptance criteria

- Users can navigate from the overview to an executable Bridge session.
- The page explains the four-step orchestration concept without ambiguity.
- Documentation does not overstate backend runtime integration on the overview route.
