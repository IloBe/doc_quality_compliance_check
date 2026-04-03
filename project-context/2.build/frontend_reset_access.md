# Frontend Page Documentation — Reset Access

**Page label:** Reset Access  
**Route:** `/reset-access`  
**Protection:** Public route, intentionally outside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, backend token-reset page

## Purpose

Complete password reset flow using a time-bound recovery token validated by backend.

## Current implementation

- Reads `token` from query string.
- Verifies token before showing reset form.
- Blocks submission when token is invalid or expired.
- Collects `newPassword` and `confirmPassword`.
- Enforces client-side validation before submission.
- Shows success feedback with inline link back to `/login`.

## Data sources and state

- Verification endpoint: `POST /api/v1/auth/recovery/verify`.
- Reset endpoint: `POST /api/v1/auth/recovery/reset`.

## UX and behavior contract

- While token verification runs, page shows `Validating recovery token...` state.
- Invalid/expired token shows blocking message + `/forgot-access` path.
- Client validation enforces:
  - minimum password length 10,
  - exact confirmation match.
- Success renders confirmation message; route is not auto-redirected.

## Known boundaries

- Post-success flow is user-driven navigation back to `/login`.
- Password policy guidance in UI remains intentionally minimal.

## Acceptance criteria

- Valid token reveals reset form.
- Invalid/expired token blocks form and links to `/forgot-access`.
- Weak or mismatched passwords are rejected before request.
- Successful reset shows clear confirmation and login path.
