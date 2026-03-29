# Governance Manual (Example) — EU Compliance Documentation & SOP Framework

&nbsp;

**Document ID:** GOV-MAN-001  
**Version:** 0.1 (Demo)  
**Status:** Draft (Example Content)  
**Effective date:** 2026-03-28  
**Owner:** Compliance & Quality Lead  
**Approved by:** Management Representative / CEO  
**Applies to:** Browser-based “SOP Check” application, supporting EU compliance evidence management and controlled document workflows.

&nbsp;

---
&nbsp;

## **1. Purpose and Scope**

This Governance Manual defines how the organization establishes, operates, and monitors governance controls for the SOP Check browser application (“the System”). The intent is to ensure consistent compliance management practices, reliable audit evidence, and controlled processes suitable for external audits by Notified Bodies and other regulators.

&nbsp;

Scope includes: organizational responsibilities, document control, training/competence, risk and change management, internal audits, CAPA, supplier oversight, data governance, and management review.

&nbsp;

---
&nbsp;

## **2. Governance Principles**

The organization follows these principles for compliance and quality governance:

**2.1 Accountability:** Clear assignment of responsibility and authority for compliance processes and approvals.  
**2.2 Traceability:** Decisions, approvals, changes, and evidence are recorded, attributable, and retrievable.  
**2.3 Risk-based thinking:** Controls are proportionate to risk, with documented rationale and review.  
**2.4 Controlled documentation:** Only approved, current versions are used; obsolete versions are prevented from unintended use.  
**2.5 Continuous improvement:** Issues are corrected with root-cause analysis and effectiveness checks.

&nbsp;

---
&nbsp;

## **3. Roles and Responsibilities (RACI Summary)**

**3.1 Management Representative (MR):** Ensures the compliance management system is established and maintained; reports performance to top management.  
**3.2 Compliance & Quality Lead (CQL):** Owns SOPs, audit readiness, CAPA process, and external audit coordination.  
**3.3 Product Owner (PO):** Owns intended use, user needs, and prioritization; ensures regulatory needs are captured in requirements.  
**3.4 Engineering Lead (EL):** Owns secure development practices, release readiness, and technical change implementation.  
**3.5 Security Officer / DPO (as applicable):** Oversees security controls and privacy governance; coordinates incident response and DPIAs as needed.  
**3.6 All Personnel:** Follow approved SOPs, complete required training, and report nonconformities.
**3.7 Minimum governance requirement:** No individual may approve their own change where independence is required (e.g., SOP approval, release approval), unless explicitly justified and risk-assessed.

&nbsp;

---
&nbsp;

## **4. Document and Record Control**

**4.1 Controlled documents** include SOPs, policies, templates, work instructions, and forms. Each controlled document must have: ID, version, effective date, owner, approval, and change history.

**4.2 Records** include audit logs, training completion evidence, review minutes, approvals, CAPA records, test/verification evidence, and release notes.

**4.3 Lifecycle rules:**
<ul>
  <li>- Draft → Review → Approved → Effective → Obsolete/Archived</li>  
  <li>- Obsolete documents remain retrievable and clearly marked “Obsolete” with end-of-use date.</li>
</ul>

**4.4 Retention:** Records are retained per the retention schedule defined by the CQL, considering contractual and regulatory requirements. Deviations must be documented and approved by the MR.

&nbsp;

---
&nbsp;

## **5. Training and Competence**
<ul>
   <li>- Role-based training is defined for personnel performing regulated activities (e.g., SOP authors/approvers, auditors, release approvers).</li>
   <li>- Training records must include trainee, training content, completion date, and (where applicable) assessment of effectiveness.</li>
   <li>- Access to System approval functions is restricted to trained and authorized roles.</li>
</ul>

&nbsp;

---
&nbsp;

## **6. Risk Management and Change Control**

**6.1 Risk management**
<ul>
  <li>- Risks related to compliance integrity, security, availability, and evidence reliability are identified and reviewed periodically.</li>
  <li>- Risk acceptability criteria and mitigation measures are documented and approved by the MR/CQL.</li>
</ul>

**6.2 Change control**  
All changes affecting compliance evidence, controlled documents, workflows, or security posture are subject to change control:

<ul>
  <li>- Change request with rationale and impact assessment</li>
  <li>- Review/approval by authorized roles</li>
  <li>- Verification/validation evidence appropriate to risk</li>
  <li>- Release decision with documented acceptance criteria</li>
  <li>- Post-release monitoring (where applicable)</li>
</ul>

Emergency changes are permitted only with documented justification, compensating controls, and retrospective review.

&nbsp;

---
&nbsp;

## **7. Internal Audits, Nonconformities, and CAPA**

**7.1 Internal audits**

<ul>
  <li>- Planned at least annually or per risk.</li> 
  <li>- Audit scope, criteria, and independence are defined in the audit plan.</li>
  <li>- Findings are recorded with objective evidence, severity, and required actions.</li>
</ul>

**7.2 Nonconformities & CAPA**

<ul>
  <li>- Nonconformities (NCs) are logged, investigated, and dispositioned (correction, containment, CAPA).</li>
  <li>- CAPA includes root-cause analysis, corrective actions, due dates, owners, and effectiveness checks.</li>
  <li>- CAPA closure requires evidence that actions were implemented and effective.</li>
</ul>

&nbsp;

---
&nbsp;

## **8. Supplier and Third-Party Oversight**

Suppliers impacting compliance, security, or evidence integrity (e.g., hosting, authentication, logging, storage) are evaluated and approved based on risk. Controls include:

<ul>
  <li>- Defined requirements (security, availability, data handling, audit support)</li>
  <li>- Contractual commitments and SLAs (as applicable)</li>
  <li>- Periodic review and incident communication expectations</li>  
  <li>- Documented rationale for supplier selection</li>
</ul>

&nbsp;

---
&nbsp;

## **9. Data Governance, Security, and Privacy (High-Level)**

<ul>
  <li>- Access is controlled using least privilege and role-based permissions.</li>
  <li>- The System maintains audit trails for creation/approval/modification events relevant to compliance records.</li>
  <li>- Backups, recovery objectives, and integrity checks are defined and periodically tested.</li>
  <li>- Security incidents are handled under an incident response SOP with defined triage, containment, notification assessment, and post-incident CAPA.</li>
</ul>

&nbsp;

---
&nbsp;

## **10. Management Review**

Top management reviews the performance of the governance and compliance system at planned intervals (at least annually or per risk), including:

<ul>
  <li>- Audit results, CAPA metrics, major changes/releases</li>
  <li>- Supplier performance and incidents</li>
  <li>- Security and privacy posture (as applicable)</li>
  <li>- Resource needs, improvement opportunities, and decisions/actions</li>
</ul>

Management review outputs are documented, assigned, and tracked to completion.

&nbsp;

---
&nbsp;

## **11. References (Examples — adapt to your context)**

<ul>
<li>- SOP-BIZ-001 — Business and Product Goals</li>
&nbsp;
(`templates/sop/sop_business_goals.md`)

<li>- SOP-STK-001 — Stakeholders</li>
&nbsp;
(`templates/sop/sop_stakeholders.md`)

<li>- SOP-QR-001 — Quality Requirements</li>
&nbsp;
(`templates/sop/sop_quality_requirements.md`)

<li>- SOP-RISK-001 — Risk Assessment</li>
&nbsp;
(`templates/sop/sop_risk_assessment.md`)

<li>- SOP-ARCH-001 — Technical Architecture and Components Overview</li>
&nbsp;
(`templates/sop/sop_architecture.md`)

<li>- SOP-GLOSS-001 — Glossary</li>
&nbsp;
(`templates/sop/sop_glossary.md`)

<li>- SOP-DOC-001 — Document Control SOP</li>
&nbsp;
(`templates/sop/sop_document_control.md`)

<li>- SOP-CHG-001 — Change Control SOP</li>
&nbsp;
(`templates/sop/sop_change_control.md`)

<li>- SOP-PRO-RM-001 — Risk Management Procedure</li>
&nbsp;
(`templates/sop/sop_risk_management_procedure.md`)

<li>- SOP-IA-001 — Internal Audit SOP</li>
&nbsp;
(`templates/sop/sop_internal_audit.md`)

<li>- SOP-CAPA-001 — CAPA SOP</li>
&nbsp;
(`templates/sop/sop_capa.md`)

<li>- SOP-SUP-001 — Supplier Management SOP</li>
&nbsp;
(`templates/sop/sop_supplier_management.md`)

<li>- SOP-SEC-IR-001 — Security Incident Response SOP</li>
&nbsp;
(`templates/sop/sop_security_incident_response.md`)
</ul>

&nbsp;

---
&nbsp;

## **12. Revision History**  

**Version:** 0.1  
**Date:** 2026-03-28  
**Change summary:** Initial demo content  
**Author:** CQL  
**Approval:** MR
