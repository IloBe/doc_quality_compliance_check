# Frontend Page Documentation — Auditor Workstation

**Page label:** Reporting / Auditor Operations  
**Route:** `/auditor-workstation`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, demo-by-default with optional backend via env flag

## Purpose

Provide the active decision workspace for auditors: review machine recommendation evidence for Bridge runs, record approval or rejection rationale with role gate, and assign follow-up tasks when remediation is required.

## Current implementation

- `frontend/pages/auditor-workstation.tsx` renders the full page.
- Renders standardized header via `PageHeaderWithWhy` (`Reporting / Auditor Operations` → `Auditor Workstation`).
- Renders `AuditorWorkstationKpiGrid` with pending / reviewed / overdue counts.
- Renders a split layout (when loaded, no error):
  - `AuditorPendingQueuePanel` — list of pending Bridge run candidates.
  - `AuditorDecisionPanel` — decision form for the selected run (approve/reject + reason + follow-up).
  - `AuditorFollowUpPanel` — list of open follow-ups from previously reviewed items.
- Uses bottom `Governance note` footer card.

### Components

| Component | File | Purpose |
| --- | --- | --- |
| `AuditorWorkstationKpiGrid` | `components/auditorWorkstation/` | Pending / reviewed / overdue KPIs |
| `AuditorPendingQueuePanel` | `components/auditorWorkstation/` | Queue of runs awaiting decision |
| `AuditorDecisionPanel` | `components/auditorWorkstation/` | Approve/reject form with reason + follow-up |
| `AuditorFollowUpPanel` | `components/auditorWorkstation/` | Open follow-up items from rejected reviews |

## Data sources and state

### Data mode switch

Controlled by env var (shared with Audit Trail):

```bash
NEXT_PUBLIC_AUDIT_TRAIL_SOURCE=backend
```

- **Demo mode (default):** events from `createMockAuditorEvents()` from `lib/auditorWorkstationViewModel`. Reviews stored in local React state (`reviewsByRunId`).
- **Backend mode:** events fetched via `fetchAuditTrailEvents({ windowHours, limit: 500, eventType: 'bridge.run.recommendation' })`. Existing reviews loaded concurrently via `fetchBridgeHumanReview(runId)` per candidate.

### Candidates and queue

- `buildCandidates(events, reviewsByRunId)` derives the pending queue from audit events.
- `pending` / `reviewed` / `openFollowUps` derived via useMemo from candidates.
- `selectedRunId` auto-initializes to the first available candidate on load; when no explicit selection exists, the displayed record prefers pending items before reviewed ones.

### Review submission

- **Backend mode:** `submitBridgeHumanReview(runId, payload)` from `lib/bridgeClient`.
- **Demo mode:** `createLocalBridgeReview(...)` produces a local review record without API call.
- On success: `reviewsByRunId` updated; draft reset to initial state.
- On failure: `submitError` shown inline.

### Score popover

- Selecting a run from the queue may reveal a score popover (`showScorePopover`).
- Dismissed on click-outside (`scorePopoverRef`) or on `selectedRunId` change.

## RBAC

- `useCan('review.approve')` required to submit a decision — `submitDecision()` returns early if false.
- Queue and evidence are visible to all authenticated users.

## Window selector

- Time-window buttons in header right area (e.g., 7d, 30d, 90d) control `windowHours`.
- Changing the window triggers a full reload.

## Decision form behavior

| Field | Constraint |
| --- | --- |
| Decision | `approved` \| `rejected`, pre-populated from queue row |
| Reason | ≥5 characters required |
| Next task type | Available when `rejected`; defaults to `rerun_bridge` |
| Next task assignee | Required when `rejected` and `nextTaskType === 'manual_follow_up'` |
| Next task instructions | Optional |

## Navigation

- **Refresh button** in header right area: re-invokes `load()`.
- **Read-only trail button** in header right area: navigates to `/audit-trail`.

## UX and behavior contract

- **Demo banner:** blue strip shown in demo mode confirming local-only storage.
- Loading and error states render inline replacement panels within the main body.
- Selecting a run in the queue pre-fills the decision draft based on the existing recommendation.
- Submit button disabled during `isSubmitting` state.

## Known boundaries

- All `canApprove` gate logic is enforced client-side only; server validates role on `submitBridgeHumanReview`.
- Follow-up assignments are shown in `AuditorFollowUpPanel` but not independently persisted to a follow-up service (linked via reviewed records).

## Acceptance criteria

- Demo mode loads mock candidates and allows local decision submission for the current page session without backend.
- Backend mode loads real events and existing reviews; decisions persist via `submitBridgeHumanReview`.
- Decision form validates reason length and follow-up fields before submission.
- Role gate (`review.approve`) disables submit for read-only users.
- Window selector changes reload the candidate queue.
- Navigation to Audit Trail is reachable from the header.
