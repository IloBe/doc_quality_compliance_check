# Frontend Page Requirements — Login

**Page label:** Sign-in  
**Route:** `/login`  
**Owner persona:** `@frontend-eng`

## Purpose

Authenticate users and establish role-aware session context for all protected pages.

## Functional requirements

- Submit credentials to auth API and store session via secure cookie flow.
- Redirect authenticated user to `/dashboard`.
- Provide route entry to forgot access flow (`/forgot-access`).
- Show clear error state for failed authentication.

## Data and state

- Backend source: auth endpoints in `auth.py`.
- Session status consumed by app shell auth guard.

## UX properties

- Clear role/compliance context messaging.
- No protected content rendered before session verification.

## Acceptance criteria

- Successful sign-in opens protected app shell.
- Failed sign-in keeps user on login with actionable feedback.
