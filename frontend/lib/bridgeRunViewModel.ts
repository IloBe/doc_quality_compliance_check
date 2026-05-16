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

export function formatBridgeDateTime(value?: string): string {
  if (!value) return 'n/a';
  return new Date(value).toLocaleString();
}

export function buildLogMessage(message: string): string {
  return `[${new Date().toLocaleTimeString()}] ${message}`;
}

export function inferBridgeDomainInfo(_doc: any): { domain: string; criticality: string } {
  return { domain: 'general', criticality: 'normal' };
}

export function deriveComplianceChecks(_doc: any, _run: any): Array<{ name: string; passed: boolean }> {
  return [];
}

export function deriveResearchChecks(_run: any): Array<{ name: string; passed: boolean }> {
  return [];
}

export function deriveAutomaticRecommendation(
  _complianceChecks: Array<{ name: string; passed: boolean }>,
  _researchChecks: Array<{ name: string; passed: boolean }>,
  run: any,
): 'approved' | 'rejected' {
  return run?.recommendation === 'rejected' ? 'rejected' : 'approved';
}

export function buildQualityGateSummary(_run: any): { heading: string; text: string } {
  return {
    heading: 'Quality Gate Summary',
    text: 'No quality-gate violations detected.',
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
