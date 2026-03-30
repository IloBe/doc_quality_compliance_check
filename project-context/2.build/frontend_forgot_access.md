# Frontend Page Documentation — Forgot Access

**Page label:** Recover Access  
**Route:** `/forgot-access`  
**Protection:** Public route, intentionally outside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, backend recovery-request page

## Purpose

Start the password recovery flow in a way that avoids exposing whether an account exists.

## Current implementation

- Renders a single-form recovery request page.
- Accepts work-email input and submits it through `requestPasswordRecovery(email)`.
- Shows the backend-provided generic message after submission.
- Provides a route back to `/login`.

## Data sources and state

- Backend endpoint: `POST /api/v1/auth/recovery/request`.
- The response may include `reset_url` in development-oriented flows.

## UX and behavior contract

- Response messaging must remain generic and non-enumerating.
- The page should stay simple and low-friction.
- If the backend returns `reset_url`, the page may show a dev-mode recovery link for local testing.
- Errors are shown inline without leaking account-existence details.

## Known boundaries

- The optional debug recovery link is for development/test workflows and should not be documented as a production-facing feature.
- This page initiates recovery only; it does not verify tokens or set a new password.

## Acceptance criteria

- Submitting the form returns a visible confirmation message.
- UI text does not expose whether the email belongs to an account.
- The page can optionally surface a dev-mode reset link when supplied by the backend.
- Users can navigate back to `/login` cleanly.
