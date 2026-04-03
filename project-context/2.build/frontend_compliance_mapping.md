# Frontend Page Documentation — Request New Standard Mapping

**Page label:** Governance & Standards  
**Route:** `/compliance/request-standard-mapping`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, backend-aware with demo fallback for mapping request submissions

## Purpose

Externalizes standard mapping change intent with rationale and trace metadata. Provides a structured request form for governance teams to propose SOP-to-standard mappings in agent workflows.

## Current implementation

- `frontend/pages/compliance/request-standard-mapping.tsx` renders the full page.
- Renders standardized header via `PageHeaderWithWhy` (`Governance & Standards` → `Request New Standard Mapping`).
- Renders a back-navigation link (left area) to `/compliance`.
- Demo mode banner shown conditionally in the header area (amber badge with `LuInfo` icon).
- Renders a split layout:
  - **Request form (left/top):** structured input fields + submit button.
  - **Records list (bottom):** recent mapping requests, filtered to max 25 items.
- No footer card; page remains focused on the request workflow.

### Components

| Component | File | Purpose |
| --- | --- | --- |
| Form inputs | — | Structured input fields for mapping request |

## Data sources and state

### Form state

- **standardName:** text input (≥3 characters required)
- **sopReference:** text input (≥3 characters required)
- **businessJustification:** textarea (≥15 characters required)
- **projectId:** optional text input
- **tenantId:** select dropdown, default `'default'`
- **requesterEmail:** pre-filled from `currentUser?.email`, user-editable

### Form validation

Submission requires:

- `standardName.trim().length >= 3`
- `sopReference.trim().length >= 3`
- `businessJustification.trim().length >= 15`
- `requesterEmail` contains `@`

### Request submission

- `submitStandardMappingRequest()` from `lib/complianceMappingRequestClient`.
- Payload includes all form fields + computed tenant/project context.
- Response: `{ ok, message, record, degradedToDemo }`.
- On success: form fields cleared, new record prepended to list, `submitMessage` shown.
- On failure: `submitError` shown inline; form fields retained for retry.
- Loading state: `isSubmitting` disables the button.

### Recent records list

- `fetchStandardMappingRequests(25)` on mount (async load).
- Records prepended with new submissions in real time.
- List capped at 25 items; oldest records dropped on new submissions.
- Loading state: `isLoadingRecords` spinner shown during initial fetch.
- Demo mode: `isDemoMode` flag set from response; banner shown in header area.

## RBAC

- Page is protected by the AppShell route gate; no additional role checks needed.
- `currentUser?.email` used to pre-fill requester email.

## UX and behavior contract

- **Demo banner:** shown only when `isDemoMode` is true (backend endpoint not configured).
- **Validation feedback:** `submitError` shows inline when form validation fails before API call.
- **Request feedback:** `submitMessage` shows inline on successful submission.
- **Records loading:** spinner shown during initial fetch (`isLoadingRecords`).
- **Form auto-clear:** on successful submission, all input fields reset to empty (except `requesterEmail` and `tenantId` which stay as-is).
- Back link navigates to `/compliance` (similar to Alert Archive).

## Navigation

- Back link: `← Back to Compliance Standards` → `/compliance`

## Known boundaries

- Records list is presentation-only; no edit or delete capability.
- Tenant ID is a select dropdown with limited options; no dynamic tenant creation.
- Project ID is optional; backend determines scope based on tenant/project combo.

## Acceptance criteria

- Form renders with all required fields and correct input types.
- Form validation prevents submission with incomplete data and shows error.
- Successful submission clears form fields and shows success message.
- New submitted records appear at the top of the records list.
- Demo mode banner appears in header when API response includes `degradedToDemo: true`.
- Back navigation link correctly routes to `/compliance`.
- Records list shows loading state during initial fetch.
