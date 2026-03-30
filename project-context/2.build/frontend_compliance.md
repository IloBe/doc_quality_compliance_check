# Frontend Page Documentation — Compliance Standards

**Page label:** Governance & Standards  
**Route:** `/compliance`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented reference page, currently static/demo-backed

## Purpose

Provide a transparent reference view of the standards, directives, and governance shortcuts used to frame compliance checks and audit interpretation.

## Current implementation

- Shows pre-title label `Governance & Standards` and title `Compliance Standards`.
- Shows a `LuInfo` toggle for the `Why this page matters` panel.
- Renders six standards/directives cards from a static in-page array.
- Shows status chips such as `Active` and `Conditional`.
- Renders a sidebar alert panel and three bottom shortcut cards.
- Links to the governance manual route and the SOP library.

## Data sources and state

- Current standards list is hard-coded inside `frontend/pages/compliance.tsx`.
- Current alert feed content is also static in-page content.
- No backend mapping service or live compliance feed is currently called from this page.

## UX and behavior contract

- Standards must remain readable, scannable, and visibly status-tagged.
- External references open in a new tab.
- The `Real-time Feed Active` badge is currently presentation copy, not a live backend subscription.
- Shortcut cards should clarify where governance users go next: governance manual, architect request, and SOP library.

## Known boundaries

- This page is a governance-reference surface, not the live execution UI for running compliance checks.
- `Contact Architect` is currently a button-level stub with no backend action.
- Compliance alerts and standard metadata are static until a mapping service is wired in.

## Acceptance criteria

- Governance stakeholders can identify active standards quickly.
- The page clearly explains why the standards matter for pass/fail interpretation.
- Navigation to governance references and SOPs works from the page.
- The documentation does not claim live backend mapping when the current page is still static.
