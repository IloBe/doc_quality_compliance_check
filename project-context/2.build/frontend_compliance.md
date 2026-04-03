# Frontend Page Documentation — Compliance Standards

**Page label:** Governance & Standards  
**Route:** `/compliance`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented reference page, currently static/demo-backed

## Purpose

Provide a transparent reference view of active standards, directives, alerts, and governance shortcuts used to frame compliance checks and audit interpretation.

## Current implementation

- Renders standardized header via `PageHeaderWithWhy` (`Governance & Standards` → `Compliance Standards`).
- Renders standards cards from shared constants (`complianceStandards`).
- Renders compliance alert panel from shared constants (`complianceAlerts`).
- Renders bottom shortcut cards from shared constants (`complianceShortcuts`).
- Uses bottom `Governance note` footer card for policy framing.

## Data sources and state

- Current standards, alerts, and shortcuts are sourced from `frontend/lib/complianceStandards.ts`.
- No backend mapping service or live compliance feed is currently called from this route.

## UX and behavior contract

- Standards remain readable, scannable, and visibly status-tagged.
- External references open in a new tab where configured.
- Alerts panel and shortcut cards remain stable navigational aids for governance users.

## Known boundaries

- This page is a governance-reference surface, not the execution UI for running compliance checks.
- Compliance alert and standard metadata are static until mapping/live-feed integration is added.

## Acceptance criteria

- Governance stakeholders can identify active standards quickly.
- Page purpose and pass/fail interpretation context are explicit.
- Navigation to downstream governance areas (including SOP/library shortcuts) works.
- Documentation does not claim live backend mapping when current page is static.
