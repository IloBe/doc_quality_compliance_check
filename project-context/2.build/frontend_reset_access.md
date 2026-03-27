# Frontend Page Requirements — Reset Access

**Page label:** Access Recovery Reset  
**Route:** `/reset-access`  
**Owner persona:** `@frontend-eng`

## Purpose

Complete secure credential reset using a time-bound, single-use recovery token.

## Functional requirements

- Parse token from query string.
- Verify token via backend before allowing reset submission.
- Submit new password and show confirmation state.
- Redirect user to `/login` after successful reset.

## Data and state

- Backend sources:
  - `POST /api/v1/auth/recovery/verify`
  - `POST /api/v1/auth/recovery/reset`

## UX properties

- Clear validation and expiry feedback.
- Strong password guidance and confirmation messaging.

## Acceptance criteria

- Valid token allows password reset flow completion.
- Invalid/expired token is blocked with clear user guidance.
