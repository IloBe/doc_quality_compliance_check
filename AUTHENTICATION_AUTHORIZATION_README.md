# Authentication and Authorization Guide

This document describes the **currently implemented authentication and authorization model** for the Doc Quality Compliance Check backend.

It focuses on the production-hardening work already implemented in code, including:

- email/password authentication,
- server-side session cookies,
- service-client authentication,
- role-based authorization,
- abuse protections,
- recovery-flow safeguards,
- standardized error behavior,
- security verification tests.

---

## 1. Current authentication model

The system currently supports **two authentication modes**:

| Mode | Intended client | Mechanism | Main code |
| --- | --- | --- | --- |
| Browser user authentication | Human users in frontend/browser flows | Email + password login, then backend-issued session cookie | [src/doc_quality/api/routes/auth.py](src/doc_quality/api/routes/auth.py), [src/doc_quality/core/session_auth.py](src/doc_quality/core/session_auth.py) |
| Service-to-service authentication | Explicit machine clients/tools | `X-API-Key` or `Authorization: Bearer <secret>` | [src/doc_quality/core/security.py](src/doc_quality/core/security.py), [src/doc_quality/core/session_auth.py](src/doc_quality/core/session_auth.py) |

### 1.1 Email/password authentication

The currently implemented user login concept is **email/password based authentication**.

Flow:

1. Client sends `POST /api/v1/auth/login` with `email`, `password`, and optional `remember_me`.
2. Backend validates the credentials.
3. Backend creates a **server-side session record**.
4. Backend returns a **secure HTTP-only session cookie**.
5. Follow-up authenticated browser requests use that cookie automatically.

Implemented in:

- [src/doc_quality/api/routes/auth.py](src/doc_quality/api/routes/auth.py)
- [src/doc_quality/core/session_auth.py](src/doc_quality/core/session_auth.py)
- [src/doc_quality/models/orm.py](src/doc_quality/models/orm.py)

### 1.2 Password storage

Passwords are **not stored in plain text**. The backend uses hashed password storage and password verification helpers.

Implemented in:

- [src/doc_quality/core/passwords.py](src/doc_quality/core/passwords.py)
- [src/doc_quality/models/orm.py](src/doc_quality/models/orm.py)

### 1.3 MVP bootstrap user concept

For the current MVP, the backend supports a configured bootstrap user via environment settings:

- `AUTH_MVP_EMAIL`
- `AUTH_MVP_PASSWORD`
- `AUTH_MVP_ROLES`
- `AUTH_MVP_ORG`

If enabled, the backend can auto-provision this user into `app_users` for initial operation.

Implemented in:

- [src/doc_quality/core/config.py](src/doc_quality/core/config.py)
- [src/doc_quality/api/routes/auth.py](src/doc_quality/api/routes/auth.py)

### 1.4 Session-cookie concept

After successful login, the backend creates a persistent server-side session and stores only session metadata in the database. The browser receives the raw cookie token.

Security properties:

- HTTP-only cookie
- configurable cookie name
- secure cookie forced outside development
- cookie clearing on logout
- server-side revocation support
- expiry / TTL support

Implemented in:

- [src/doc_quality/core/session_auth.py](src/doc_quality/core/session_auth.py)
- [src/doc_quality/models/orm.py](src/doc_quality/models/orm.py)

### 1.5 Session duration / remember-me concept

Two TTL modes are implemented:

| Mode | Behavior | Config |
| --- | --- | --- |
| Standard session | Shorter browser session TTL | `session_ttl_short_minutes` |
| Remember-me session | Longer persistent TTL | `session_ttl_remember_me_minutes` |

The login request supports `remember_me` and maps it to the correct TTL policy.

Implemented in:

- [src/doc_quality/core/config.py](src/doc_quality/core/config.py)
- [src/doc_quality/core/session_auth.py](src/doc_quality/core/session_auth.py)
- [tests/test_auth_session_api.py](tests/test_auth_session_api.py)

---

## 2. Implemented authorization model

Authorization is implemented as **role-based access control (RBAC)** on top of authentication.

The main authorization helper is:

- [src/doc_quality/core/session_auth.py](src/doc_quality/core/session_auth.py) → `require_roles(...)`

### 2.1 Core authorization concept

Authorization works as follows:

1. Request must first authenticate successfully.
2. The backend resolves the current authenticated user context.
3. Endpoint-level dependencies check whether at least one required role is present.
4. If no required role matches, the backend returns `403 Forbidden`.

### 2.2 Implemented roles in current code

The active roles visible in the implementation are:

- `qm_lead`
- `architect`
- `riskmanager`
- `auditor`
- `service` (restricted machine role)

### 2.3 Service-role restriction concept

A key hardening change is that the `service` role is **no longer a blanket bypass**.

Instead:

- service access is allowed **only** on explicitly marked machine-to-machine endpoints,
- this is controlled via `require_roles(..., allow_service=True)`.

This prevents service clients from automatically accessing all protected routes.

Implemented in:

- [src/doc_quality/core/session_auth.py](src/doc_quality/core/session_auth.py)
- [src/doc_quality/api/routes/skills.py](src/doc_quality/api/routes/skills.py)

---

## 3. Authorization matrix

The following matrix reflects the currently implemented route policy.

| Route area | Browser roles allowed | Service client allowed | Main code |
| --- | --- | --- | --- |
| `/api/v1/auth/me` | Any authenticated browser session | No | [src/doc_quality/api/routes/auth.py](src/doc_quality/api/routes/auth.py) |
| `/api/v1/documents/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | No | [src/doc_quality/api/routes/documents.py](src/doc_quality/api/routes/documents.py) |
| `/api/v1/compliance/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | No | [src/doc_quality/api/routes/compliance.py](src/doc_quality/api/routes/compliance.py) |
| `/api/v1/research/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | No | [src/doc_quality/api/routes/research.py](src/doc_quality/api/routes/research.py) |
| `/api/v1/reports/*` | `qm_lead`, `riskmanager`, `auditor` | No | [src/doc_quality/api/routes/reports.py](src/doc_quality/api/routes/reports.py) |
| `/api/v1/bridge/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | No | [src/doc_quality/api/routes/bridge.py](src/doc_quality/api/routes/bridge.py) |
| `/api/v1/skills/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | Yes, explicitly allowed | [src/doc_quality/api/routes/skills.py](src/doc_quality/api/routes/skills.py) |
| `/api/v1/audit-trail/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | No | [src/doc_quality/api/routes/audit_trail.py](src/doc_quality/api/routes/audit_trail.py) |
| `/api/v1/observability/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | Yes, explicitly allowed | [src/doc_quality/api/routes/observability.py](src/doc_quality/api/routes/observability.py) |
| `/api/v1/risk-templates/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | No | [src/doc_quality/api/routes/risk_templates.py](src/doc_quality/api/routes/risk_templates.py) |
| `/api/v1/stakeholders/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | No | [src/doc_quality/api/routes/stakeholders.py](src/doc_quality/api/routes/stakeholders.py) |
| `/api/v1/dashboard/*` | No authentication required (currently unauthenticated) | No explicit service allowance | [src/doc_quality/api/routes/dashboard.py](src/doc_quality/api/routes/dashboard.py) |
| `/api/v1/templates/*` | No authentication required (currently unauthenticated) | No explicit service allowance | [src/doc_quality/api/routes/templates.py](src/doc_quality/api/routes/templates.py) |

### 3.1 Authenticated browser user vs service client

| Aspect | Browser user | Service client |
| --- | --- | --- |
| Identity source | Session cookie | API key / bearer token |
| Typical actor | Human user | Orchestrator / automation / backend tool |
| Session endpoint access | Yes | No |
| Explicit route-role checks | Yes | Yes |
| Blanket bypass | No | No |
| Explicit machine allowance needed | Not applicable | Yes |

---

## 4. Implemented abuse protections and throttling

The authentication/authorization design includes protections against brute force and abusive request patterns.

### 4.1 Global API rate limiting

A global in-memory rate limiter protects `/api/v1/*` routes and can return:

- `429 Too Many Requests`
- `Retry-After` header

Implemented in:

- [src/doc_quality/core/rate_limit.py](src/doc_quality/core/rate_limit.py)
- [src/doc_quality/api/main.py](src/doc_quality/api/main.py)

### 4.2 Login throttling and temporary lockout

Login requests are rate-limited per:

- email/account
- IP address

After repeated failed attempts, the backend returns `429` and applies temporary lockout/backoff.

Implemented in:

- [src/doc_quality/api/routes/auth.py](src/doc_quality/api/routes/auth.py)
- [src/doc_quality/core/rate_limit.py](src/doc_quality/core/rate_limit.py)
- [src/doc_quality/core/config.py](src/doc_quality/core/config.py)

### 4.3 Recovery-request throttling

Password recovery requests are also rate-limited per email and per IP to reduce abuse and account-enumeration opportunities.

Implemented in:

- [src/doc_quality/api/routes/auth.py](src/doc_quality/api/routes/auth.py)
- [src/doc_quality/models/orm.py](src/doc_quality/models/orm.py)

---

## 5. Password recovery and leakage minimization

The current recovery flow is designed to limit information disclosure.

### 5.1 Recovery flow behavior

Implemented endpoints:

- `POST /api/v1/auth/recovery/request`
- `POST /api/v1/auth/recovery/verify`
- `POST /api/v1/auth/recovery/reset`

Implemented behavior:

- generic anti-enumeration recovery response,
- hashed recovery token storage,
- expiry / TTL validation,
- single-use token semantics,
- active session revocation after password reset,
- audit event logging.

Implemented in:

- [src/doc_quality/api/routes/auth.py](src/doc_quality/api/routes/auth.py)
- [src/doc_quality/models/orm.py](src/doc_quality/models/orm.py)

### 5.2 Debug token exposure policy

Recovery debug token exposure is:

- **disabled by default**,
- only available when explicitly enabled,
- limited to development mode.

Implemented in:

- [src/doc_quality/core/config.py](src/doc_quality/core/config.py)
- [src/doc_quality/api/routes/auth.py](src/doc_quality/api/routes/auth.py)

---

## 6. Production-safe defaults already implemented

The following hardening defaults are now part of the auth/authz baseline.

| Control | Implemented behavior | Main code |
| --- | --- | --- |
| `SECRET_KEY` fail-fast | Production startup fails if insecure default is still used | [src/doc_quality/core/config.py](src/doc_quality/core/config.py) |
| Secure session cookies | `session_cookie_secure=True` outside development | [src/doc_quality/core/config.py](src/doc_quality/core/config.py), [src/doc_quality/core/session_auth.py](src/doc_quality/core/session_auth.py) |
| Configurable cookie name | Session dependencies resolve cookie name from config | [src/doc_quality/core/session_auth.py](src/doc_quality/core/session_auth.py), [src/doc_quality/api/routes/auth.py](src/doc_quality/api/routes/auth.py) |
| Generic recovery responses | No account enumeration via recovery response text | [src/doc_quality/api/routes/auth.py](src/doc_quality/api/routes/auth.py) |
| Standard error envelope | Controlled 4xx/5xx structure, including framework-level 404s | [src/doc_quality/api/main.py](src/doc_quality/api/main.py) |

---

## 7. Standardized error behavior

The backend now returns a standardized error envelope for relevant API failures.

Example shape:

```json
{
  "error": {
    "code": "forbidden",
    "message": "Insufficient role permissions"
  }
}
```

Typical error codes include:

- `authentication_required`
- `forbidden`
- `not_found`
- `validation_error`
- `rate_limited`
- `internal_error`

Implemented in:

- [src/doc_quality/api/main.py](src/doc_quality/api/main.py)

---

## 8. Security verification tests already implemented

The auth/authz implementation is now backed by dedicated verification tests.

| Test file | What it verifies |
| --- | --- |
| [tests/test_auth_session_api.py](tests/test_auth_session_api.py) | Login, session cookie issuance, logout, TTL behavior, RBAC denial |
| [tests/test_auth_authorization_api.py](tests/test_auth_authorization_api.py) | Unauthorized access, insufficient-role denial, restricted service access |
| [tests/test_auth_rate_limit_api.py](tests/test_auth_rate_limit_api.py) | Global rate limiting, login lockout, `429` + `Retry-After` |
| [tests/test_auth_recovery_api.py](tests/test_auth_recovery_api.py) | Recovery flow safety, debug token exposure policy, password reset behavior |
| [tests/test_error_envelope_api.py](tests/test_error_envelope_api.py) | Standard error envelope for `404`, `422`, and `500` |
| [tests/test_integration_api_workflow.py](tests/test_integration_api_workflow.py) | Protected-route behavior within broader API workflows |
| [tests/conftest.py](tests/conftest.py) | Shared authenticated test client using real login flow |

---

## 9. Related implementation and planning documents

- [README.md](README.md)
- [project-context/1.define/sad.md](project-context/1.define/sad.md)
- [project-context/2.build/phase0_hardening_implementation_tracker.md](project-context/2.build/phase0_hardening_implementation_tracker.md)

---

## 10. Known limitations

The current implementation is production-hardened for a **single-backend / Phase 0 baseline**, but some enterprise-scale identity and resilience capabilities are intentionally deferred.

### 10.1 Enterprise SSO is not implemented yet

The backend currently supports:

- email/password login for browser users,
- backend-owned session cookies,
- API-key / bearer-token access for explicit service clients.

The backend does **not yet implement**:

- LDAP integration,
- SAML-based enterprise SSO,
- OIDC/OAuth2 identity-provider login such as Azure AD, Okta, or Keycloak.

Status:

- **Current state:** not implemented in Phase 0.
- **Recommended roadmap:** introduce enterprise SSO in Phase 2+ while keeping the backend session layer as the stable server-side identity abstraction.

### 10.2 Rate limiting is currently process-local, not distributed

The current rate-limit and login-throttle implementation is **in-memory and local to the running backend process**.

This is sufficient for:

- local deployments,
- single-instance backend hosting,
- Phase 0 validation and controlled production baselines.

It is **not yet sufficient** for:

- multi-instance deployments,
- horizontal scaling behind a load balancer,
- shared lockout state across replicas,
- durable throttling state across restarts.

Status:

- **Current state:** implemented as in-process memory only.
- **Recommended roadmap:** replace or back the limiter with a persistent distributed store such as Redis or PostgreSQL-backed coordination for Phase 2+ scaling.

---

## 11. Current status summary

**Already implemented now:**

- email/password login,
- server-side session cookie authentication,
- API-key based service authentication,
- route-level RBAC,
- explicit service-route scoping,
- global rate limiting,
- login throttling and lockout,
- hardened password recovery flow,
- standardized API error envelope,
- dedicated security verification tests.

**Important current architecture note:**

The system is currently built around **backend-owned session authentication plus role-based authorization**, with browser users and service clients intentionally handled as separate access modes.
