# Frontend Page Requirements — Forgot Access

**Page label:** Access Recovery Request  
**Route:** `/forgot-access`  
**Owner persona:** `@frontend-eng`

## Purpose

Start a secure, anti-enumeration password recovery process.

## Functional requirements

- Accept email input and call recovery request endpoint.
- Always show generic response message regardless of account existence.
- Provide guidance for next step (`/reset-access?token=...`).

## Data and state

- Backend source: `POST /api/v1/auth/recovery/request`.

## UX properties

- Security-first language (no identity leakage).
- Clean single-action form for low-friction recovery initiation.

## Acceptance criteria

- Request is submitted successfully with generic confirmation.
- No account existence hints are exposed in UI text.
