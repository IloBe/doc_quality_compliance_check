"""Risk template seeding service - generates pre-populated RMF/FMEA rows.

Implements SOLID principles:
- Single Responsibility: Only responsible for generating seed data
- Dependency Inversion: Depends on abstractions (Pydantic models), not concrete implementations
- Open/Closed: Extensible via template_metadata context without modifying core logic
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from ..models.risk_template import FmeaRowData, RmfRowData


class RiskTemplateSeedContext(BaseModel):
    """Context passed to seeder to customize seed content."""

    template_title: str
    product: str
    rationale: str | None = None
    created_by: str


class RiskTemplateSeeder:
    """Generates pre-populated rows for RMF and FMEA templates."""

    @staticmethod
    def seed_rmf_rows(context: RiskTemplateSeedContext) -> list[dict[str, Any]]:
        """
        Generate the canonical RMF baseline aligned with the current frontend table.
        """
        rows = [
            {
                "nr": 1,
                "risk_category": "Riskmanagement-Process",
                "activity": "Reference to Qualitymanagement-Policy / Compendium",
                "owner_role": "QM Lead",
                "qualification_required": "ISO 14971 certified; medical device QM background",
                "target_date": "2026-Q1",
                "regulatory_ref": "ISO 14971:2019 §4",
                "status": "Completed",
                "control_measure": "Process definition baselined and approved",
                "verification": "Management review + process audit",
                "evidence_ref": "QMP-COMPENDIUM-001",
                "notes": "",
            },
            {
                "nr": 2,
                "risk_category": "Responsibility of Management",
                "activity": "Management responsibility matrix and sign-off responsibilities",
                "owner_role": "QM Lead",
                "qualification_required": "Management accountability for QM and risk governance",
                "target_date": "2026-Q1",
                "regulatory_ref": "ISO 14971:2019 §4.2",
                "status": "Completed",
                "control_measure": "Formal role assignment and escalation paths",
                "verification": "Signed RACI + governance review",
                "evidence_ref": "MGMT-RACI-2026",
                "notes": "",
            },
            {
                "nr": 3,
                "risk_category": "Staff Qualifications (Target/Actual)",
                "activity": "Qualification matrix (target vs actual) for risk-relevant roles",
                "owner_role": "QM Lead",
                "qualification_required": "Training records + competency evidence",
                "target_date": "2026-Q1",
                "regulatory_ref": "ISO 13485:2016 §6.2",
                "status": "In Progress",
                "control_measure": "Gap closure plan for missing competencies",
                "verification": "Training completion records",
                "evidence_ref": "HR-QUAL-MATRIX-2026",
                "notes": "",
            },
            {
                "nr": 4,
                "risk_category": "Riskmanagement-Plan",
                "activity": "Risk management plan and lifecycle scope definition",
                "owner_role": "Risk Manager",
                "qualification_required": "Risk planning and regulatory documentation skills",
                "target_date": "2026-Q1",
                "regulatory_ref": "ISO 14971:2019 §4.4",
                "status": "In Progress",
                "control_measure": "Plan versioning + approval gate",
                "verification": "Signed RMP and version control log",
                "evidence_ref": "RMP-2026-v1.1",
                "notes": "",
            },
            {
                "nr": 5,
                "risk_category": "Intended Use of Product",
                "activity": "Intended use statement, users, environments, and misuse boundaries",
                "owner_role": "Product Manager",
                "qualification_required": "Clinical and user-context understanding",
                "target_date": "2026-Q2",
                "regulatory_ref": "ISO 14971:2019 §5.2",
                "status": "In Progress",
                "control_measure": "Scope and contraindication definition",
                "verification": "Clinical and stakeholder review",
                "evidence_ref": "INTENDED-USE-2026",
                "notes": "",
            },
            {
                "nr": 6,
                "risk_category": "Hazardous Situation",
                "activity": "Hazardous situation register and scenario descriptions",
                "owner_role": "Risk Manager",
                "qualification_required": "Hazard analysis expertise",
                "target_date": "2026-Q3",
                "regulatory_ref": "ISO 14971:2019 §5.4",
                "status": "Open",
                "control_measure": "Scenario-based hazard capture",
                "verification": "Cross-functional hazard workshop",
                "evidence_ref": "HAZARD-REGISTER-2026",
                "notes": "",
            },
            {
                "nr": 7,
                "risk_category": "Risk Assessments",
                "activity": "Risk estimation and evaluation records per hazardous situation",
                "owner_role": "Risk Manager",
                "qualification_required": "Risk scoring method competence",
                "target_date": "2026-Q3",
                "regulatory_ref": "ISO 14971:2019 §6",
                "status": "Open",
                "control_measure": "Severity/probability scoring + acceptance criteria",
                "verification": "Peer review of risk matrix",
                "evidence_ref": "RISK-ASSESSMENT-2026",
                "notes": "",
            },
            {
                "nr": 8,
                "risk_category": "Risk Mitigations",
                "activity": "identified risk mitigation tasks; implemented risk mitigation measures; new identified risks as consequence of mitigation task",
                "owner_role": "Architect",
                "qualification_required": "Safety engineering and implementation control",
                "target_date": "2026-Q3",
                "regulatory_ref": "ISO 14971:2019 §7",
                "status": "Open",
                "control_measure": "Mitigation tracking with verification evidence",
                "verification": "Test evidence and effectiveness review",
                "evidence_ref": "MITIGATION-TASKS-2026; MITIGATION-MEASURES-2026; NEW-RISKS-LOG-2026",
                "notes": "",
            },
            {
                "nr": 9,
                "risk_category": "Completeness",
                "activity": "Completeness check of RMF artifacts and traceability links",
                "owner_role": "Auditor",
                "qualification_required": "Audit readiness and document traceability skills",
                "target_date": "2026-Q4",
                "regulatory_ref": "EU AI Act Art.11 / Annex IV",
                "status": "Open",
                "control_measure": "Checklist-based completeness validation",
                "verification": "Internal audit and gap closure",
                "evidence_ref": "RMF-COMPLETENESS-CHECKLIST-2026",
                "notes": "",
            },
            {
                "nr": 10,
                "risk_category": "Assessed Total Risk",
                "activity": "Overall assessed total risk and benefit-risk conclusion",
                "owner_role": "QM Lead",
                "qualification_required": "Risk acceptance authority",
                "target_date": "2026-Q4",
                "regulatory_ref": "ISO 14971:2019 §8",
                "status": "Open",
                "control_measure": "Total risk statement and acceptance rationale",
                "verification": "Top management sign-off",
                "evidence_ref": "TOTAL-RISK-STATEMENT-2026",
                "notes": "",
            },
            {
                "nr": 11,
                "risk_category": "Risk Management Report",
                "activity": "Final risk management report with linked evidence and conclusions",
                "owner_role": "QM Lead",
                "qualification_required": "Regulatory affairs; MDR / IVDR knowledge",
                "target_date": "2026-Q4",
                "regulatory_ref": "ISO 14971:2019 §10",
                "status": "Open",
                "control_measure": "Risk management report linked to DHF and technical file",
                "verification": "Regulatory submission review",
                "evidence_ref": "RMR-2026-v1.0",
                "notes": "",
            },
            {
                "nr": 12,
                "risk_category": "Post-Market Phase",
                "activity": "Post-market surveillance feedback loop and risk update triggers",
                "owner_role": "Regulatory Affairs",
                "qualification_required": "PMS / vigilance process expertise",
                "target_date": "Ongoing",
                "regulatory_ref": "ISO 14971:2019 §10.2",
                "status": "Open",
                "control_measure": "Complaint and incident trend monitoring",
                "verification": "Periodic PMS review report",
                "evidence_ref": "PMS-RISK-REVIEW-2026",
                "notes": "",
            },
        ]

        return rows

    @staticmethod
    def seed_fmea_rows(context: RiskTemplateSeedContext) -> list[dict[str, Any]]:
        """
        Generate the canonical FMEA baseline aligned with the current frontend table.
        """
        rows = [
            {
                "nr": 1,
                "system_element": "Data Preprocessing Pipeline",
                "root_cause": "Upstream ETL schema drift and missing input guards",
                "failure_mode": "Corrupt or missing input data passed to model",
                "hazard_impact": "Patient safety and diagnostic confidence",
                "effect": "False/misleading diagnostic prediction; patient safety risk",
                "severity": 4,
                "probability": 3,
                "rpn": 12,
                "mitigation": "Input schema validation + anomaly detection; reject malformed inputs with alert",
                "verification": "Unit + integration tests; negative-input test suite",
                "post_severity": 2,
                "post_probability": 2,
                "post_rpn": 4,
                "residual_risk": "Medium",
                "status": "In Progress",
                "post_effect_risk": "Residual delay risk with reduced patient safety impact",
                "new_risks": "Potential false reject of borderline valid data",
                "notes": "Linked to TEST-NEG-042",
            },
            {
                "nr": 2,
                "system_element": "AI Inference Engine",
                "root_cause": "Insufficient OOD handling and calibration drift over time",
                "failure_mode": "Model overconfidence / hallucination on out-of-distribution inputs",
                "hazard_impact": "Clinical decision quality and patient outcome",
                "effect": "Misleading high-confidence output; delayed correct diagnosis",
                "severity": 5,
                "probability": 2,
                "rpn": 10,
                "mitigation": "Calibrated softmax + OOD detector; mandatory HITL review for confidence < 0.85",
                "verification": "Model evaluation suite; clinical evaluation study",
                "post_severity": 3,
                "post_probability": 2,
                "post_rpn": 6,
                "residual_risk": "Medium",
                "status": "Open",
                "post_effect_risk": "Reduced but still relevant risk in edge OOD scenarios",
                "new_risks": "Operational overhead due to increased HITL escalations",
                "notes": "ISO 14971 §7.4 — human oversight required",
            },
            {
                "nr": 3,
                "system_element": "API Gateway",
                "root_cause": "Weak session hardening and incomplete authorization checks",
                "failure_mode": "Authentication bypass or session fixation",
                "hazard_impact": "Confidentiality of patient data and legal compliance",
                "effect": "Unauthorized access to patient data; GDPR/HIPAA violation",
                "severity": 5,
                "probability": 1,
                "rpn": 5,
                "mitigation": "JWT + HttpOnly session cookies; RBAC; rate limiting; HSTS",
                "verification": "Penetration test; automated auth test suite (100 % pass)",
                "post_severity": 2,
                "post_probability": 1,
                "post_rpn": 2,
                "residual_risk": "Low",
                "status": "Mitigated",
                "post_effect_risk": "Localized security risk with constrained blast radius",
                "new_risks": "Token refresh race conditions under high concurrency",
                "notes": "Verified Q1-2026 pentest report",
            },
            {
                "nr": 4,
                "system_element": "Database / Persistence Layer",
                "root_cause": "Incomplete transaction safeguards and backup verification gaps",
                "failure_mode": "Audit trail record loss or silent data corruption",
                "hazard_impact": "Auditability and traceability evidence integrity",
                "effect": "Non-traceability; regulatory non-compliance",
                "severity": 4,
                "probability": 2,
                "rpn": 8,
                "mitigation": "Append-only audit_events table; DB checksums; daily backup + point-in-time recovery",
                "verification": "Backup restore drill; data integrity checks",
                "post_severity": 2,
                "post_probability": 1,
                "post_rpn": 2,
                "residual_risk": "Low",
                "status": "Verified",
                "post_effect_risk": "Low remaining impact due to rapid recovery capability",
                "new_risks": "Backup storage growth and retention policy tuning needs",
                "notes": "",
            },
            {
                "nr": 5,
                "system_element": "HITL Review Gate",
                "root_cause": "Workflow policy checks not enforced strongly enough server-side",
                "failure_mode": "Reviewer bypasses mandatory approval step",
                "hazard_impact": "Clinical governance and approval chain integrity",
                "effect": "Unapproved AI output enters clinical workflow",
                "severity": 5,
                "probability": 2,
                "rpn": 10,
                "mitigation": "Workflow enforces HITL gate server-side; UI cannot submit without reviewer token",
                "verification": "Workflow integration tests; RBAC audit",
                "post_severity": 3,
                "post_probability": 1,
                "post_rpn": 3,
                "residual_risk": "Medium",
                "status": "Open",
                "post_effect_risk": "Reduced governance breach risk, still sensitive for critical paths",
                "new_risks": "Approval latency during peak reviewer workload",
                "notes": "",
            },
        ]

        return rows
