# Standard Operating Procedure: Data Privacy Handling Control - Failure Case

**Document ID:** SSP-SOP-PRIV-FAIL-001<br>
**Version:** 1.1<br>
**Status:** Draft<br>
**Owner:** Privacy Officer<br>

---

## 1. Purpose

Provide a failure-path privacy note that intentionally contains personal-data-like indicators for test validation.

---

## 2. Scope

Applies to synthetic breach simulation content used by automated privacy-routing tests.

---

## 3. Synthetic personal data examples

- Employee: Jane Testperson
- Email: jane.testperson@example.invalid
- Reviewer ID: TEST-PII-001
- Support contact: privacy-check@example.invalid

---

## 4. Privacy issue

- The content includes identifiable personal-data-like fields.
- External fallback should be blocked for this payload.
- On-prem-only routing is required.

---

## 5. Expected Review Outcome

- reject or rework
- personal-data-bearing payload detected
- on-prem-only routing required

---

## 10. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.1 | 2026-05-17 | QA Team | Restructured to SOP template style |
