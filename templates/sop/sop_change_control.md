# Change Control SOP

**Document ID:** `[PROJECT-ID]-SOP-CHG-001`<br>
**Version:** 1.0<br>
**Status:** Draft<br>
**Owner:** Engineering Lead / Quality Lead<br>

---

## 1. Purpose

Define how changes impacting product behavior, compliance evidence, security posture, or controlled documentation are requested, assessed, approved, implemented, and verified.

---

## 2. Scope

Applies to product code, infrastructure, configurations, workflows, and controlled documents.

---

## 3. Change Classification

| Class | Description | Typical Approval |
|------|-------------|------------------|
| Standard | Low-risk, repeatable | Product/Engineering owner |
| Normal | Risk-assessed planned change | Cross-functional approval |
| Emergency | Urgent fix with retrospective review | Incident authority + retrospective board |

---

## 4. Required Inputs (Change Request)

| Field | Required |
|-------|----------|
| Change ID | Yes |
| Requester | Yes |
| Business/Compliance Rationale | Yes |
| Impact Assessment | Yes |
| Risk Assessment | Yes |
| Verification Plan | Yes |
| Rollback/Contingency Plan | Yes |

---

## 5. Workflow

1. Raise change request.
2. Perform impact and risk assessment.
3. Obtain approvals from authorized roles.
4. Implement and verify/validate.
5. Execute release decision.
6. Perform post-change review and record evidence.

---

## 6. Testing and Evidence

| Evidence Type | Example |
|--------------|---------|
| Functional verification | Test report |
| Compliance verification | Checklist sign-off |
| Security verification | Scan / review results |
| Release decision | Approval record |

---

## 7. Emergency Changes

- Must include explicit urgency justification.
- Require compensating controls where needed.
- Mandatory retrospective review within defined timeframe.

---

## 8. Segregation of Duties

No individual should self-approve high-impact changes where independence is required.

---

## 9. Metrics

| Metric | Target |
|--------|--------|
| Change success rate | |
| Rollback rate | |
| Emergency change ratio | |
| Lead time to approval | |

---

## 10. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-12 | Barbara L. | Initial draft |
