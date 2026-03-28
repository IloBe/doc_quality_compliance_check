# Authentication Storage Concept (Phase 0+)

## Goal

Provide an audit-grade, backend-owned authentication model aligned with the project architecture decisions.

## Implemented now (Phase 0)

- Session storage in PostgreSQL table `user_sessions`.
- Session cookie is HTTP-only and backend-validated.
- Frontend stores no auth token in `localStorage`.
- Login page calls `/api/v1/auth/login`; app shell validates identity with `/api/v1/auth/me`; logout via `/api/v1/auth/logout`.
- Browser users authenticate with email/password; explicit service clients authenticate with API key or bearer token only on allowed machine endpoints.
- Cookie security is environment-aware (`Secure` outside development) and cookie name is configurable.
- Global API throttling and login lockout protections are implemented as process-local in-memory controls.

## Qualified persistence concept for login information

Use three persistence layers in PostgreSQL:

1. **Identity table (`app_users`)** *(partially implemented now)*
   - `user_id`, `email` (unique), `password_hash`, `password_salt`, `roles` (json/array), `org_id`, `is_active`, timestamps.
   - Phase 0 already provisions the MVP bootstrap account into `app_users` with a hashed password; later phases can expand this to managed multi-user onboarding/admin flows.

2. **Session table (`user_sessions`)** *(already implemented)*
   - `session_id`, `session_token_hash`, `user_email`/`user_id`, `roles`, `org`, `is_revoked`, `expires_at`, `last_seen_at`.
   - Stores only hashed session token; raw token exists only in secure cookie and in transit.

3. **Audit login/security events (`audit_events`)** *(partially implemented now)*
   - Phase 0 already records selected auth/security events such as `auth.login_success` and password-recovery events.
   - Later hardening can expand this to `login_failed`, `logout`, `session_revoked`, and `session_expired` for fuller identity lifecycle auditing.

## Security controls

- HTTP-only, Secure, SameSite cookie.
- Server-side revocation and TTL enforcement.
- Constant-time compare for hashes.
- Role checks at API boundary (RBAC), UI hints in frontend.
- Explicit machine-to-machine role scoping; service access is not a blanket bypass.
- Standardized error envelope for authz / rate-limit failures.

## Roadmap

- Phase 0: email/password MVP + backend sessions (done, with env-backed credentials).
- Phase 1: expand from env-backed bootstrap credentials to managed multi-user `app_users` lifecycle (creation, rotation, disable/lock flows) with hashed passwords remaining in the database.
- Phase 2: OIDC / enterprise SSO (Azure AD/Keycloak/Okta, and where needed LDAP/SAML federation) with existing session layer kept as backend session abstraction.
- Phase 2+: replace process-local throttling with persistent distributed/shared rate-limiting and lockout state for multi-instance deployments.
