# Frontend Page Documentation — Reset Access

**Page label:** Reset Access  
**Route:** `/reset-access`  
**Protection:** Public route, intentionally outside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, backend token-reset page

## Purpose

Complete the password reset flow using a time-bound recovery token validated by the backend.

## Current implementation

- Reads `token` from the query string.
- Verifies the token before showing the password reset form.
- Blocks reset submission when the token is invalid or expired.
- Collects `newPassword` and `confirmPassword`.
- Requires client-side validation before submission.
- Shows success feedback with a link back to `/login`.

## Data sources and state

- Backend verification endpoint: `POST /api/v1/auth/recovery/verify`.
- Backend reset endpoint: `POST /api/v1/auth/recovery/reset`.

## UX and behavior contract

- While token verification is in progress, the page shows a validation state.
- Invalid or expired tokens show a blocking message and a link to request a new recovery link.
- Client-side validation currently enforces:
  - minimum password length of 10 characters,
  - exact password confirmation match.
- On success, the page shows a confirmation message instead of auto-redirecting.

## Known boundaries

- The page links back to `/login` after success; it does not currently auto-navigate there.
- Password policy guidance is minimal in the UI and may be expanded later.

## Acceptance criteria

- Valid token allows the reset form to appear.
- Invalid or expired token blocks reset and points the user to `/forgot-access`.
- Weak or mismatched passwords are rejected before submission.
- Successful reset ends with a clear message and path back to login.
