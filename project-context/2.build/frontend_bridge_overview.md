# Frontend Page Documentation — Bridge Overview

**Page label:** Bridge Architecture  
**Route:** `/bridge`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented overview page, informational + backend-aware reload action

## Purpose

Explain the orchestration model used for document checks and provide a clear entry from overview context into a document-level Bridge run.

## Current implementation

- `frontend/pages/bridge.tsx` is the canonical page (self-contained, no alias).
- Renders standardized header via `PageHeaderWithWhy`.
- Renders overview stat cards from `bridgeOverviewStats`.
- Renders system status section via `BridgeSystemStatusCard`.
- Provides button navigation to `/doc/DOC-001/bridge`.
- Provides `Reload Agents` action with explicit success/error feedback banners.
- Uses bottom `Governance note` footer card.

## Data sources and state

- Overview stats/system summary are currently static/presentational values.
- Reload behavior:
  - demo mode (`NEXT_PUBLIC_BRIDGE_SOURCE` not `backend`) returns local demo confirmation,
  - backend mode calls `reloadBridgeAgents()` from `bridgeClient` and reports readiness summary.

## UX and behavior contract

- The page communicates orchestration purpose for QA, auditors, and product leads.
- Demo Bridge entry button remains a reliable path into document-level run page.
- Reload action must provide explicit user feedback in both demo and backend modes.

## Known boundaries

- Crew/runtime metrics shown in overview remain illustrative, not full live telemetry.
- This page frames and links workflow execution; it does not execute a Bridge run itself.

## Acceptance criteria

- Users can navigate from overview to executable Bridge session.
- Page explains four-step orchestration concept clearly.
- Reload action surfaces mode-correct message (demo/backend).
- Documentation does not overstate live runtime integration on overview route.
