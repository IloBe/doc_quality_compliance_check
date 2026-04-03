# Frontend Page Documentation — Login

**Page label:** Enterprise Access  
**Route:** `/login`  
**Protection:** Public route, intentionally outside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, backend-authenticated entry page

## Purpose

Authenticate users with backend session cookies and establish access for protected workstation routes.

## Current implementation

- Renders branded split-screen layout (value panel + auth form).
- Uses email/password submission via `loginWithPassword(email, password, rememberMe)`.
- Prefills demo credentials for local evaluation.
- Supports `Remember session` checkbox.
- Provides navigation to `/forgot-access`.
- Shows inline error feedback on failed login attempts.
- Redirects successful login to `/` via `router.replace('/')`.

## Auth service visibility

- Optional Auth API health badge is controlled by `NEXT_PUBLIC_ENABLE_AUTH_HEALTH_CHECK` (enabled unless explicitly `false`).
- Health checks use `checkAuthServiceHealth()` with direct backend `/health` target.
- Badge shows online/offline/checking state, optional backend version, and live `checked ... ago` label.

## UX and behavior contract

- Route remains outside protected shell (`_app.tsx` no-shell route list).
- Error state remains visible without forced navigation.
- `Secure By` icons are decorative and non-functional for auth logic.
- Submit button switches to loading state (`Decrypting...`) while request is in flight.

## Known boundaries

- Visual copy references enterprise SSO style, but current implementation is email/password auth.
- Health badge is optional troubleshooting aid, not hard auth dependency.

## Acceptance criteria

- Successful sign-in creates valid backend session and lands on `/`.
- Failed sign-in stays on `/login` with actionable feedback.
- Forgot-access navigation works.
- Health badge (when enabled) updates on interval without relying on dev proxy noise.
