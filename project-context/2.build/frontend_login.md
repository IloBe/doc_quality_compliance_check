# Frontend Page Documentation — Login

**Page label:** Enterprise Access  
**Route:** `/login`  
**Protection:** Public route, intentionally outside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, backend-authenticated entry page

## Purpose

Authenticate the user with backend session cookies and establish the session required for all protected workstation pages.

## Current implementation

- Renders a branded split-screen login view with a left-side product/value panel and right-side auth form.
- Uses email/password submission via `loginWithPassword(email, password, rememberMe)`.
- Prefills demo credentials for local evaluation.
- Supports `Remember session` checkbox behavior.
- Provides navigation to `/forgot-access`.
- Shows inline error feedback on failed login attempts.
- Redirects successful login to `/`.

## Auth service visibility

- The page can display an Auth API status badge.
- Badge visibility is controlled by `NEXT_PUBLIC_ENABLE_AUTH_HEALTH_CHECK` and is enabled unless explicitly set to `false`.
- Health checks use `checkAuthServiceHealth()` with a direct backend health target.
- The badge can show online/offline/checking state, optional backend version, and a live `checked ... ago` label.

## UX and behavior contract

- This page must remain outside the protected shell.
- No protected content is shown before session verification; `_app.tsx` handles redirect logic for protected pages separately.
- The `Secure By` icons are decorative branding indicators and do not drive any authentication logic.
- Error state remains visible without navigating away from the page.

## Known boundaries

- The visual copy references corporate SSO/project email, but the implemented flow is currently email/password against backend auth endpoints.
- The status badge is operationally useful for demo and troubleshooting, but it is optional UI rather than a hard dependency.

## Acceptance criteria

- Successful sign-in creates a valid backend session and lands on `/`.
- Failed sign-in keeps the user on `/login` with actionable feedback.
- Forgot-access navigation works.
- When enabled, the Auth API badge updates without relying on noisy dev proxy behavior.
