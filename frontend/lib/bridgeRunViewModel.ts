import { getGroupedStandards } from './complianceStandards';
import { formatDateTime } from './dateTime';
import { BridgeApiError } from './bridgeClient';

export function buildBridgeRunStatusClass(_status: string): string {
  return 'text-neutral-700';
}

export function buildBridgeRunDisplay(_run: any): any {
  return _run;
}

export const bridgeSteps = [
  { id: 'ingest', title: 'Load Document', desc: 'Prepare source document and metadata' },
  { id: 'compliance', title: 'Run Controls', desc: 'Evaluate compliance controls and standards' },
  { id: 'research', title: 'Assess Findings', desc: 'Cross-check against references and evidence' },
  { id: 'approval', title: 'Produce Recommendation', desc: 'Generate decision summary for HITL review' },
];

type BridgeRequirementLike = {
  framework?: string;
  requirement_id?: string;
  title?: string;
  passed?: boolean;
  mandatory?: boolean;
  gap_description?: string | null;
};

type BridgeRunLike = {
  requirements?: BridgeRequirementLike[];
  mandatory_gaps?: string[];
  optional_gaps?: string[];
  approved?: boolean;
  automatic_recommendation?: 'approved' | 'rejected';
  privacy_violation?: {
    detected?: boolean;
    matched_signals?: string[];
    proposals?: Array<{
      proposal_id?: string;
      title?: string;
      details?: string;
      implementation_status?: string;
      implementation_note?: string;
    }>;
  };
  checked_frameworks?: string[];
  governance_controls?: Array<{
    id?: string;
    name?: string;
    framework?: string;
    framework_id?: string;
    control_type?: 'directive' | 'norm' | 'policy' | 'sop';
    activation_mode?: 'baseline' | 'context';
    status?: 'compliant' | 'warning' | 'critical' | 'draft';
  }>;
  mitigation_recommendations?: Array<{
    topic?: string;
    proposal?: string;
  }>;
  requirements_catalog?: Array<{
    framework?: string;
    mandatory?: boolean;
  }>;
};

export type BridgeControlItem = {
  frameworkId: string;
  label: string;
  activationType: 'baseline' | 'context';
  status: 'passed' | 'failed';
};

export type BridgeFindingItem = {
  requirementId: string;
  subtitle: string;
  articleOrClause: string;
  paragraph: string;
  description: string;
};

export type BridgeFindingGroup = {
  frameworkId: string;
  label: string;
  findings: BridgeFindingItem[];
};

export type BridgeMitigationItem = {
  topic: string;
  proposal: string;
  implementationStatus?: 'implemented' | 'proposed';
  implementationNote?: string;
};

export type BridgeFailureGuidance = {
  title: string;
  reasonCode?: string;
  errorCode?: string;
  correlationId?: string;
  message: string;
  actionPoints: string[];
};

const DEFAULT_FAILURE_ACTION_POINTS: string[] = [
  'Retry the bridge run after reviewing runtime status and policy settings.',
  'Escalate to the platform operator if this failure persists.',
];

const ROUTING_DENIED_ACTION_POINTS: string[] = [
  'Set active model provider to local ollama for personal-data-possible processing.',
  "Ensure selected_inference_location is 'on_prem' for sensitive steps.",
  'Use external fallback only for scrubbed_fallback workloads when policy allows it.',
];

const CONTRACT_INVALID_ACTION_POINTS: string[] = [
  'Ensure each step defines sensitivity_class, policy_rule_id, and selected_inference_location.',
  "Use canonical policy namespace values (for example: 'policy.bridge.*').",
  'Retry the run after correcting bridge policy metadata inputs.',
];

const RUNTIME_NOT_READY_ACTION_POINTS: string[] = [
  'Open runtime self-check and resolve reported readiness issues first.',
  'Confirm bridge agent topology and required database migrations are healthy.',
  'Retry the bridge run only after self-check reports ready.',
];

export function mapBridgeFailureGuidance(error: unknown): BridgeFailureGuidance {
  const fallback: BridgeFailureGuidance = {
    title: 'Bridge execution failed',
    message: error instanceof Error ? error.message : 'Bridge workflow execution failed unexpectedly.',
    actionPoints: DEFAULT_FAILURE_ACTION_POINTS,
  };

  if (!(error instanceof BridgeApiError)) {
    return fallback;
  }

  const reason = (error.reason || '').trim().toLowerCase();
  const mappedActionPoints = error.actionPoints.length > 0
    ? error.actionPoints
    : reason === 'bridge_policy_routing_denied'
      ? ROUTING_DENIED_ACTION_POINTS
      : reason === 'bridge_step_policy_invalid'
        ? CONTRACT_INVALID_ACTION_POINTS
        : reason === 'bridge_runtime_not_ready'
          ? RUNTIME_NOT_READY_ACTION_POINTS
          : DEFAULT_FAILURE_ACTION_POINTS;

  if (reason === 'bridge_policy_routing_denied') {
    return {
      title: 'Fail-closed routing denied this run',
      reasonCode: error.reason,
      errorCode: error.errorCode,
      correlationId: error.correlationId,
      message: error.message,
      actionPoints: mappedActionPoints,
    };
  }

  if (reason === 'bridge_step_policy_invalid') {
    return {
      title: 'Bridge step policy contract is invalid',
      reasonCode: error.reason,
      errorCode: error.errorCode,
      correlationId: error.correlationId,
      message: error.message,
      actionPoints: mappedActionPoints,
    };
  }

  if (reason === 'bridge_runtime_not_ready') {
    return {
      title: 'Bridge runtime is not ready',
      reasonCode: error.reason,
      errorCode: error.errorCode,
      correlationId: error.correlationId,
      message: error.message,
      actionPoints: mappedActionPoints,
    };
  }

  return {
    title: 'Bridge execution failed',
    reasonCode: error.reason,
    errorCode: error.errorCode,
    correlationId: error.correlationId,
    message: error.message,
    actionPoints: mappedActionPoints,
  };
}

const groupedStandards = getGroupedStandards();
const standardCatalog = [...groupedStandards.alwaysOn, ...Object.values(groupedStandards.conditionalByCategory).flat()];

function normalizeFrameworkKey(value: string | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function humanizeFrameworkId(value: string | undefined): string {
  const normalized = normalizeFrameworkKey(value);
  const fromCatalog = standardCatalog.find((item) => normalizeFrameworkKey(item.id) === normalized);
  if (fromCatalog) {
    return fromCatalog.title;
  }

  return String(value || '')
    .trim()
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => (part.length <= 4 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`))
    .join(' ');
}

function getActivationType(frameworkId: string, run: BridgeRunLike | null | undefined): 'baseline' | 'context' {
  const normalized = normalizeFrameworkKey(frameworkId);
  const catalogItem = run?.requirements_catalog?.find((item) => normalizeFrameworkKey(item.framework) === normalized);
  if (catalogItem && catalogItem.mandatory === false) {
    return 'context';
  }

  const fromCatalog = standardCatalog.find((item) => normalizeFrameworkKey(item.id) === normalized);
  if (fromCatalog && fromCatalog.category !== 'baseline') {
    return 'context';
  }

  return 'baseline';
}

function extractCitation(requirementId: string | undefined, description: string | null | undefined): {
  articleOrClause: string;
  paragraph: string;
} {
  const text = `${requirementId || ''} ${description || ''}`;
  const articleMatch = text.match(/(Art\.?\s*\d+[a-zA-Z0-9\-]*|Article\s+\d+[a-zA-Z0-9\-]*|Clause\s+\d+(?:\.\d+)*|Annex\s+[IVX0-9]+)/i);
  const paragraphMatch = text.match(/(para(?:graph)?\.?\s*\d+(?:\.\d+)*|section\s+\d+(?:\.\d+)*)/i);

  return {
    articleOrClause: articleMatch ? articleMatch[1] : (requirementId || 'Reference not specified'),
    paragraph: paragraphMatch ? paragraphMatch[1] : 'Paragraph not explicitly stated',
  };
}

export function formatBridgeDateTime(value?: string): string {
  if (!value) return 'n/a';
  return formatDateTime(value, value);
}

export function buildLogMessage(message: string): string {
  return `[${formatDateTime(new Date())}] ${message}`;
}

export function inferBridgeDomainInfo(doc: any): {
  domain: string;
  description: string;
  uses_ai_ml: boolean;
  intended_use: string;
  target_market: string;
} {
  const rawType = String(doc?.type || '').toLowerCase();
  const rawTitle = String(doc?.title || '').trim();

  const domain = rawType.includes('risk') || rawTitle.toLowerCase().includes('xray')
    ? 'medical devices'
    : 'quality management';

  const description = rawTitle
    ? `Bridge workflow evaluation for document ${rawTitle}`
    : 'Bridge workflow evaluation for selected compliance document';

  return {
    domain,
    description,
    uses_ai_ml: true,
    intended_use: 'compliance and risk verification',
    target_market: 'EU',
  };
}

export function deriveComplianceChecks(_doc: unknown, run: BridgeRunLike | null | undefined): Array<{ name: string; passed: boolean }> {
  if (!run) {
    return [];
  }

  const checks = (run.requirements || [])
    .filter((req) => Boolean(req.framework))
    .slice(0, 8)
    .map((req) => ({
      name: `${req.framework}: ${req.title || 'requirement'}`,
      passed: Boolean(req.passed),
    }));

  if (run.privacy_violation?.detected) {
    checks.unshift({
      name: 'GDPR / privacy violation signals detected',
      passed: false,
    });
  }

  return checks;
}

export function deriveRunControlItems(run: BridgeRunLike | null | undefined): BridgeControlItem[] {
  if (!run) {
    return [];
  }

  const governanceControls = run.governance_controls || [];
  if (governanceControls.length > 0) {
    return governanceControls.map((item) => ({
      frameworkId: String(item.framework_id || item.framework || item.id || 'unknown').toLowerCase(),
      label: item.framework || humanizeFrameworkId(item.framework_id),
      activationType: item.activation_mode || getActivationType(String(item.framework_id || ''), run),
      status: item.status === 'compliant' ? 'passed' : 'failed',
    }));
  }

  if ((run.checked_frameworks || []).length === 0) {
    // Demo fallback keeps pipeline cards informative when backend detail is unavailable.
    return groupedStandards.alwaysOn.slice(0, 4).map((standard) => ({
      frameworkId: standard.id,
      label: standard.title,
      activationType: standard.category === 'baseline' ? 'baseline' : 'context',
      status: 'passed',
    }));
  }

  return (run.checked_frameworks || []).map((frameworkId) => {
    const normalized = String(frameworkId || '').toLowerCase();
    const normalizedKey = normalizeFrameworkKey(frameworkId);
    const frameworkRequirements = (run.requirements || []).filter(
      (item) => normalizeFrameworkKey(item.framework) === normalizedKey,
    );
    const failed = frameworkRequirements.some((item) => !item.passed);

    return {
      frameworkId: normalized,
      label: humanizeFrameworkId(normalized),
      activationType: getActivationType(normalized, run),
      status: failed ? 'failed' : 'passed',
    };
  });
}

export function deriveResearchChecks(run: BridgeRunLike | null | undefined): Array<{ name: string; passed: boolean }> {
  if (!run) {
    return [];
  }

  const optionalGapCount = (run.optional_gaps || []).length;
  const mandatoryGapCount = (run.mandatory_gaps || []).length;
  const signalCount = (run.privacy_violation?.matched_signals || []).length;

  return [
    {
      name: 'Mandatory controls cross-check',
      passed: mandatoryGapCount === 0,
    },
    {
      name: 'Optional controls cross-check',
      passed: optionalGapCount === 0,
    },
    {
      name: 'Privacy risk signal review',
      passed: signalCount === 0,
    },
  ];
}

export function deriveFindingGroups(run: BridgeRunLike | null | undefined): BridgeFindingGroup[] {
  if (!run) {
    return [];
  }

  const failedRequirements = (run.requirements || []).filter((item) => item.passed === false);
  const groups = new Map<string, BridgeFindingGroup>();

  for (const item of failedRequirements) {
    const frameworkId = String(item.framework || 'unknown').toLowerCase();
    const existing = groups.get(frameworkId) || {
      frameworkId,
      label: humanizeFrameworkId(frameworkId),
      findings: [],
    };
    const citation = extractCitation(item.requirement_id, item.gap_description);
    existing.findings.push({
      requirementId: item.requirement_id || 'N/A',
      subtitle: item.title || 'Requirement finding',
      articleOrClause: citation.articleOrClause,
      paragraph: citation.paragraph,
      description: item.gap_description || 'Specific requirement evidence is missing.',
    });
    groups.set(frameworkId, existing);
  }

  if (run.privacy_violation?.detected) {
    const frameworkId = 'gdpr';
    const existing = groups.get(frameworkId) || {
      frameworkId,
      label: humanizeFrameworkId(frameworkId),
      findings: [],
    };
    existing.findings.unshift({
      requirementId: 'PRIVACY-VIOLATION',
      subtitle: 'Explicit privacy violation signals detected',
      articleOrClause: 'GDPR Art. 5 / Art. 32',
      paragraph: 'Paragraph not explicitly stated',
      description: 'Sensitive medical and personal data indicators were detected in bridge processing context.',
    });
    groups.set(frameworkId, existing);
  }

  return Array.from(groups.values());
}

export function deriveAutomaticRecommendation(
  complianceChecks: Array<{ name: string; passed: boolean }>,
  researchChecks: Array<{ name: string; passed: boolean }>,
  run: BridgeRunLike | null | undefined,
): 'approved' | 'rejected' {
  if (run?.automatic_recommendation === 'approved' || run?.automatic_recommendation === 'rejected') {
    return run.automatic_recommendation;
  }

  if (run?.approved === false) {
    return 'rejected';
  }

  const hasFailedCompliance = complianceChecks.some((item) => !item.passed);
  const hasFailedResearch = researchChecks.some((item) => !item.passed);
  return hasFailedCompliance || hasFailedResearch ? 'rejected' : 'approved';
}

export function deriveMitigationItems(run: BridgeRunLike | null | undefined): BridgeMitigationItem[] {
  if (!run) {
    return [];
  }

  const backendMitigations = (run.mitigation_recommendations || [])
    .filter((item) => item.topic && item.proposal)
    .map((item) => ({
      topic: String(item.topic),
      proposal: String(item.proposal),
    }));

  if (backendMitigations.length > 0) {
    const deduped = new Map<string, BridgeMitigationItem>();
    for (const item of backendMitigations) {
      const key = `${item.topic.toLowerCase()}::${item.proposal.toLowerCase()}`;
      if (!deduped.has(key)) {
        deduped.set(key, item);
      }
    }
    return Array.from(deduped.values());
  }

  const items: BridgeMitigationItem[] = [];

  for (const req of (run.requirements || []).filter((item) => item.passed === false).slice(0, 6)) {
    const frameworkLabel = humanizeFrameworkId(req.framework);
    items.push({
      topic: `Corrective action plan - ${frameworkLabel}`,
      proposal: `Define owner, due date, and verification evidence for "${req.title || 'requirement gap'}" before rerun. Include updated control implementation artifact and reviewer sign-off.`,
    });
  }

  const deduped = new Map<string, BridgeMitigationItem>();
  for (const item of items) {
    const key = `${item.topic.toLowerCase()}::${item.proposal.toLowerCase()}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }
  return Array.from(deduped.values());
}

export function derivePrivacyMitigationItems(run: BridgeRunLike | null | undefined): BridgeMitigationItem[] {
  if (!run?.privacy_violation?.detected) {
    return [];
  }

  const items: BridgeMitigationItem[] = [];
  for (const proposal of run.privacy_violation?.proposals || []) {
    if (!proposal.title || !proposal.details) {
      continue;
    }
    items.push({
      topic: proposal.title,
      proposal: proposal.details,
      implementationStatus: proposal.implementation_status === 'implemented' ? 'implemented' : 'proposed',
      implementationNote: proposal.implementation_note,
    });
  }

  if (items.length === 0) {
    items.push({
      topic: 'Data privacy risk mitigation required',
      proposal: 'Define and approve a documented privacy mitigation plan before re-running the bridge workflow.',
      implementationStatus: 'proposed',
    });
  }

  const deduped = new Map<string, BridgeMitigationItem>();
  for (const item of items) {
    const key = `${item.topic.toLowerCase()}::${item.proposal.toLowerCase()}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }
  return Array.from(deduped.values());
}

export function buildQualityGateSummary(input: {
  backendRun?: BridgeRunLike | null;
  complianceChecks?: Array<{ name: string; passed: boolean }>;
  researchChecks?: Array<{ name: string; passed: boolean }>;
}): { heading: string; text: string } {
  const run = input.backendRun;
  const complianceChecks = input.complianceChecks || [];
  const researchChecks = input.researchChecks || [];

  if (!run) {
    return {
      heading: 'Quality Gate Summary',
      text: 'Bridge run has not produced a final quality-gate result yet.',
    };
  }

  const mandatoryGapCount = (run.mandatory_gaps || []).length;
  const optionalGapCount = (run.optional_gaps || []).length;
  const privacyDetected = Boolean(run.privacy_violation?.detected);
  const failedCompliance = complianceChecks.filter((item) => !item.passed).length;
  const failedResearch = researchChecks.filter((item) => !item.passed).length;

  if (privacyDetected || mandatoryGapCount > 0 || failedCompliance > 0 || failedResearch > 0) {
    return {
      heading: 'Quality Gate Summary - Rejected',
      text: `Violations detected. Mandatory gaps: ${mandatoryGapCount}. Optional gaps: ${optionalGapCount}. Privacy violation: ${privacyDetected ? 'yes' : 'no'}.`,
    };
  }

  return {
    heading: 'Quality Gate Summary',
    text: `No quality-gate violations detected. Mandatory gaps: ${mandatoryGapCount}. Optional gaps: ${optionalGapCount}.`,
  };
}

export function createLocalHumanReviewRecord(input: Record<string, any>): {
  decision: 'approved' | 'rejected';
  reason: string;
  reviewer_email: string;
  reviewed_at: string;
} {
  return {
    decision: input.decision === 'rejected' ? 'rejected' : 'approved',
    reason: input.reason || '',
    reviewer_email: input.reviewerEmail || input.reviewer_email || 'reviewer@example.com',
    reviewed_at: new Date().toISOString(),
  };
}
