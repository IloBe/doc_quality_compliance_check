# Authentication Storage Concept (Phase 0+)

## Goal
Provide an audit-grade, backend-owned authentication model aligned with the project architecture decisions.

## Implemented now (Phase 0)
- Session storage in PostgreSQL table `user_sessions`.
- Session cookie is HTTP-only and backend-validated.
- Frontend stores no auth token in `localStorage`.
- Login page calls `/api/v1/auth/login`; app shell validates identity with `/api/v1/auth/me`; logout via `/api/v1/auth/logout`.

## Qualified persistence concept for login information
Use three persistence layers in PostgreSQL:

1. **Identity table (`app_users`)**
   - `user_id`, `email` (unique), `password_hash`, `password_salt`, `roles` (json/array), `org_id`, `is_active`, timestamps.
   - Password hash should use PBKDF2-HMAC-SHA256 (or Argon2 in later phase).

2. **Session table (`user_sessions`)** *(already implemented)*
   - `session_id`, `session_token_hash`, `user_email`/`user_id`, `roles`, `org`, `is_revoked`, `expires_at`, `last_seen_at`.
   - Stores only hashed session token; raw token exists only in secure cookie and in transit.

3. **Audit login events (`audit_events`)**
   - Events: `login_success`, `login_failed`, `logout`, `session_revoked`, `session_expired`.
   - Include actor identity, tenant/org/project context, trace/correlation ids.

## Security controls
- HTTP-only, Secure, SameSite cookie.
- Server-side revocation and TTL enforcement.
- Constant-time compare for hashes.
- Role checks at API boundary (RBAC), UI hints in frontend.

## Roadmap
- Phase 0: email/password MVP + backend sessions (done, with env-backed credentials).
- Phase 1: move credentials from env to `app_users` with hashed passwords.
- Phase 2: OIDC SSO (Azure AD/Keycloak/Okta) with existing session layer kept as backend session abstraction.
