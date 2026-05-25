export type GovernanceStatus = 'compliant' | 'warning' | 'critical' | 'draft';

export interface GovernanceMetric {
  id: string;
  label: string;
  value: number;
  unit?: string;
  status: GovernanceStatus;
}

export interface GovernancePolicy {
  id: string;
  title: string;
  version: string;
  owner: string;
  reviewCadence: string;
  nextReviewDate: string;
  status: GovernanceStatus;
}

export interface GovernanceControl {
  id: string;
  name: string;
  framework: string;
  framework_id?: string;
  control_type?: 'directive' | 'norm' | 'policy' | 'sop';
  activation_mode?: 'baseline' | 'context';
  domain_tags?: string[];
  market_tags?: string[];
  objective: string;
  implementation: string;
  evidence: string;
  status: GovernanceStatus;
  is_active?: boolean;
}

export interface GovernancePageSnapshot {
  metrics: GovernanceMetric[];
  policies: GovernancePolicy[];
  controls: GovernanceControl[];
  updatedAtIso: string;
}

/**
 * Return deterministic, production-like governance data for the Admin page.
 * The data remains local-only by design until backend persistence is enabled.
 */
export function buildGovernanceSnapshot(): GovernancePageSnapshot {
  return {
    metrics: [
      { id: 'coverage', label: 'Control coverage', value: 92, unit: '%', status: 'compliant' },
      { id: 'evidence-freshness', label: 'Evidence freshness', value: 81, unit: '%', status: 'warning' },
      { id: 'open-actions', label: 'Open remediation actions', value: 4, status: 'warning' },
      { id: 'critical-gaps', label: 'Critical control gaps', value: 0, status: 'compliant' },
    ],
    policies: [
      {
        id: 'policy-access-control',
        title: 'Access Control & Role Governance',
        version: 'v1.8',
        owner: 'Security Governance Board',
        reviewCadence: 'Quarterly',
        nextReviewDate: '2026-07-15',
        status: 'compliant',
      },
      {
        id: 'policy-ai-quality',
        title: 'AI Quality and Hallucination Management',
        version: 'v1.4',
        owner: 'QM Lead Office',
        reviewCadence: 'Monthly',
        nextReviewDate: '2026-06-05',
        status: 'warning',
      },
      {
        id: 'policy-audit-traceability',
        title: 'Audit Traceability and Evidence Retention',
        version: 'v2.1',
        owner: 'Compliance Operations',
        reviewCadence: 'Quarterly',
        nextReviewDate: '2026-08-01',
        status: 'compliant',
      },
      {
        id: 'policy-incident-response',
        title: 'Incident Response and Escalation',
        version: 'v0.9',
        owner: 'Platform Reliability Team',
        reviewCadence: 'Monthly',
        nextReviewDate: '2026-05-28',
        status: 'draft',
      },
    ],
    controls: [
      {
        id: 'ctrl-auth-session',
        name: 'Session authentication hardening',
        framework: 'ISO/IEC 27001 A.5',
        objective: 'Restrict unauthorized access to protected admin operations.',
        implementation: 'HTTP-only signed session cookie with server-side token hashing and lockout controls.',
        evidence: 'auth session API tests + security review notes',
        status: 'compliant',
      },
      {
        id: 'ctrl-hitl-approval',
        name: 'Human-in-the-loop approval gate',
        framework: 'EU AI Act Art. 14',
        objective: 'Require accountable human review before regulated release decisions.',
        implementation: 'HITL workflow and reviewer attribution persisted with immutable audit events.',
        evidence: 'HITL review records + audit timeline events',
        status: 'compliant',
      },
      {
        id: 'ctrl-observability-quality',
        name: 'Model quality telemetry controls',
        framework: 'ISO 9001 + internal AI SOP',
        objective: 'Detect and react to quality regressions before policy breach.',
        implementation: 'Observability KPIs, prompt-output trace inspection, and hallucination counters.',
        evidence: 'Admin Observability snapshots and weekly QA summary',
        status: 'warning',
      },
      {
        id: 'ctrl-keys-secrets',
        name: 'Secrets and key management segregation',
        framework: 'GDPR Art. 32 / NIS2',
        objective: 'Reduce systemic blast radius of credential compromise.',
        implementation: 'Separate runtime secrets for session signing, service access, and database credentials.',
        evidence: 'environment configuration baseline and penetration checklist',
        status: 'draft',
      },
    ],
    updatedAtIso: new Date().toISOString(),
  };
}

export function statusPillClass(status: GovernanceStatus): string {
  const map: Record<GovernanceStatus, string> = {
    compliant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-rose-50 text-rose-700 border-rose-200',
    draft: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  };
  return map[status];
}

export function statusLabel(status: GovernanceStatus): string {
  const map: Record<GovernanceStatus, string> = {
    compliant: 'Compliant',
    warning: 'Needs Attention',
    critical: 'Critical',
    draft: 'Draft',
  };
  return map[status];
}
