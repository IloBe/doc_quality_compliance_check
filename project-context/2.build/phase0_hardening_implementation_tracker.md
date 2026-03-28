# Phase 0 Hardening Implementation Tracker

This tracker operationalizes the SAD hardening checklist into sprint-sized execution items.

Status legend: `Not Started` | `In Progress` | `Blocked` | `Done`

## Sprint Plan Overview

| Sprint | Focus | Owner | Status |
| --- | --- | --- | --- |
| Sprint 1 | Secure defaults + auth foundations | Backend Eng | Done |
| Sprint 2 | API abuse protections + login throttling | Backend Eng | Done |
| Sprint 3 | Authorization matrix and route hardening | Backend Eng | Done |
| Sprint 4 | Error disclosure minimization + recovery controls | Backend Eng | Done |
| Sprint 5 | Security verification tests and CI gate prep | Backend Eng | Done |

## Detailed Checklist

| ID | Hardening Task | Sprint | Owner | Status | Code Mapping |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Enforce production `SECRET_KEY` fail-fast | Sprint 1 | Backend Eng | Done | `src/doc_quality/core/config.py` |
| 1.2 | Auto-enable secure cookies outside development | Sprint 1 | Backend Eng | Done | `src/doc_quality/core/config.py` |
| 1.3 | Disable recovery debug token exposure by default | Sprint 1 | Backend Eng | Done | `src/doc_quality/core/config.py`, `src/doc_quality/api/routes/auth.py` |
| 1.4 | Resolve session cookie by configured cookie name | Sprint 1 | Backend Eng | Done | `src/doc_quality/core/session_auth.py` |
| 2.1 | Global API rate limiting middleware | Sprint 2 | Backend Eng | Done | `src/doc_quality/core/rate_limit.py`, `src/doc_quality/api/main.py` |
| 2.2 | Login throttle and lockout per IP/email | Sprint 2 | Backend Eng | Done | `src/doc_quality/core/rate_limit.py`, `src/doc_quality/api/routes/auth.py`, `src/doc_quality/core/config.py` |
| 2.3 | Return `429` + `Retry-After` for throttle events | Sprint 2 | Backend Eng | Done | `src/doc_quality/api/main.py`, `src/doc_quality/api/routes/auth.py` |
| 3.1 | Restrict `service` bypass to explicit endpoints only | Sprint 3 | Backend Eng | Done | `src/doc_quality/core/session_auth.py` |
| 3.2 | Add explicit role checks to compliance routes | Sprint 3 | Backend Eng | Done | `src/doc_quality/api/routes/compliance.py` |
| 3.3 | Add explicit role checks to research routes | Sprint 3 | Backend Eng | Done | `src/doc_quality/api/routes/research.py` |
| 3.4 | Strengthen report endpoint authorization | Sprint 3 | Backend Eng | Done | `src/doc_quality/api/routes/reports.py` |
| 3.5 | Mark skills endpoints as explicit machine/hybrid endpoints | Sprint 3 | Backend Eng | Done | `src/doc_quality/api/routes/skills.py` |
| 4.1 | Standardized API error envelope for 4xx/5xx | Sprint 4 | Backend Eng | Done | `src/doc_quality/api/main.py` |
| 4.2 | Keep recovery responses anti-enumeration generic | Sprint 4 | Backend Eng | Done | `src/doc_quality/api/routes/auth.py` |
| 5.1 | Add authorization negative-path tests | Sprint 5 | Backend Eng | Done | `tests/test_auth_authorization_api.py` |
| 5.2 | Add rate-limit/lockout tests | Sprint 5 | Backend Eng | Done | `tests/test_auth_rate_limit_api.py` |
| 5.3 | Add recovery token leakage policy tests | Sprint 5 | Backend Eng | Done | `tests/test_auth_recovery_api.py` |
| 5.4 | Add standardized error envelope tests | Sprint 5 | Backend Eng | Done | `tests/test_error_envelope_api.py` |
