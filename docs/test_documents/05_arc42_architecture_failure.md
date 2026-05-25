# arc42 Architecture Documentation: SmartShift Planner - Failure Fixture

**Project/System:** SmartShift Planner<br>
**Version:** 0.3<br>
**Date:** 2026-05-17<br>
**Authors:** Architecture QA Team<br>
**Status:** Draft<br>

---

## 1. Introduction and Goals

Speed is prioritized above security and privacy controls.

---

## 3. Context and Scope

The browser directly accesses backend services and production data stores.

---

## 4. Solution Strategy

- hardcode integration tokens in frontend code
- share admin accounts during peak operations
- allow direct production edits without governance review

---

## 5. Building Block View

Frontend, AI service, and database are tightly coupled with weak separation.

---

## 6. Runtime View

User approval triggers direct writes to production data and verbose sensitive logging.

---

## 9. Architecture Decisions

- skip tenant isolation
- keep sensitive logs for troubleshooting convenience

---

## 11. Risks and Technical Debt

- no maintained risk register
- no documented mitigation ownership

---

Negative fixture note:
- mandatory sections are intentionally omitted (for example constraints, deployment view, concepts, quality requirements, glossary)
- system context diagram, component diagram, and sequence diagram are intentionally absent
