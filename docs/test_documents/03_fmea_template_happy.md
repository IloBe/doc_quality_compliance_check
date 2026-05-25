# Standard Operating Procedure: FMEA Risk Worksheet

**Document ID:** SSP-SOP-FMEA-001<br>
**Version:** 1.1<br>
**Status:** Draft<br>
**Owner:** Risk Manager<br>

---

## 1. Purpose

Provide a consistent FMEA structure for analyzing software, AI, security, and privacy failure modes.

---

## 2. Scope

Applies to SmartShift Planner recommendation, approval, logging, and calendar publication workflows.

---

## 3. Risk Method

**RPN = Severity x Occurrence x Detection**

| Scale | Range | Meaning |
|------|-------|---------|
| Severity | 1-10 | impact to safety, privacy, legal, or operations |
| Occurrence | 1-10 | probability of occurrence |
| Detection | 1-10 | likelihood of detecting before harm |

---

## 4. Procedure

1. Define process step and failure mode.
2. Record effects, causes, and current controls.
3. Score S, O, D and calculate RPN.
4. Define mitigation actions, owner, and verification.
5. Recalculate residual risk after implementation.

---

## 5. Risk Register Requirements

| Process Step | Failure Mode | Effect | Cause | Existing Controls | S | O | D | RPN | Recommended Action | Owner | Due Date | Verification |
|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|
| Recommendation generation | Bias drift | unfair schedules | skewed data | fairness checks | 8 | 4 | 4 | 128 | add drift alarm and parity review | AI Product Owner | 2026-07-15 | fairness report |
| Calendar sync | Wrong recipient | privacy incident | mapping defect | reconciliation | 9 | 3 | 3 | 81 | enforce immutable mapping checks | Engineering Lead | 2026-06-30 | sync verification |

---

## 6. Treatment Strategies

- Avoid
- Mitigate
- Transfer
- Accept

---

## 7. Review Cadence

| Review Type | Frequency | Owner |
|------------|-----------|-------|
| Full review | Monthly | Risk Manager |
| Triggered review | Incident / major change | Cross-functional team |

---

## 8. Governance and Escalation

- RPN >= 150 requires management review.
- Severity >= 9 requires review even if RPN is lower.

---

## 9. Inputs / Outputs

**Inputs:** incidents, findings, change requests.  
**Outputs:** updated worksheet, treatment plan, residual risk decisions.

---

## 10. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.1 | 2026-05-17 | QA Team | Restructured to SOP template style |
