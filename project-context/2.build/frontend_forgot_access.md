# Frontend Page Documentation — Forgot Access

**Page label:** Recover Access  
**Route:** `/forgot-access`  
**Protection:** Public route, intentionally outside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, backend recovery-request page

## Purpose

Start password recovery without exposing whether an account exists.

## Current implementation

- Renders a compact single-form recovery page.
- Accepts work-email input and submits via `requestPasswordRecovery(email)`.
- Shows backend-provided confirmation message after submission.
- Shows optional dev-mode `reset_url` link when backend returns it.
- Provides navigation back to `/login`.

## Data sources and state

- Backend endpoint: `POST /api/v1/auth/recovery/request`.
- Response payload may include `reset_url` for development/testing flows.

## UX and behavior contract

- Response messaging remains generic and non-enumerating.
- Errors render inline and should not leak account-existence details.
- Page remains intentionally low-friction and outside protected shell.

## Known boundaries

- Debug recovery link is for development/testing only, not production-facing UX.
- This page initiates recovery only; it does not verify token or set new password.

## Acceptance criteria

- Submitting form returns visible confirmation message.
- UI text does not expose account existence.
- Optional dev reset link appears only when backend supplies it.
- User can navigate back to `/login` cleanly.
