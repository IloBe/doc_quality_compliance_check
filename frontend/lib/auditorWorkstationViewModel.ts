import { formatDateTime } from './dateTime';

export interface AuditorQueueKpis {
  pendingCount: number;
  reviewedCount: number;
  overdueCount: number;
  rejectionRate: number;
}

export interface CandidateWithReview {
  id: string;
  name: string;
  status: string;
  submittedAt: string;
  runId: string;
  documentId: string;
  eventTime: string;
  recommendation: 'approved' | 'rejected';
  complianceChecks: Array<{ topic: string; result: 'passed' | 'failed' }>;
  review?: {
    decision: 'approved' | 'rejected';
    reviewer_email: string;
    reviewed_at: string;
  };
}

export interface AuditorFollowUpTask {
  id: string;
  runId: string;
  documentId: string;
  type: string;
  assignee: string;
  instructions: string;
  reviewedAt: string;
}

export interface DecisionDraft {
  decision: 'approved' | 'rejected';
  reason: string;
  nextTaskType: 'rerun_bridge' | 'manual_follow_up';
  nextTaskAssignee: string;
  nextTaskInstructions: string;
}

export function formatTs(ts: string): string {
  return formatDateTime(ts, ts);
}

export const AUDITOR_WINDOWS = [
  { label: '24h', value: 24 },
  { label: '7d', value: 168 },
  { label: '30d', value: 720 },
];

export function createInitialDecisionDraft(): DecisionDraft {
  return {
    decision: 'approved',
    reason: '',
    nextTaskType: 'rerun_bridge',
    nextTaskAssignee: '',
    nextTaskInstructions: '',
  };
}

export function createMockAuditorEvents(): any[] {
  return [];
}

export function buildCandidates(events: any[], reviewsByRunId: Record<string, any>): CandidateWithReview[] {
  return events.map((event, idx) => {
    const runId = event.run_id || `run_${idx}`;
    return {
      id: runId,
      name: event.document_id || 'Document',
      status: 'pending',
      submittedAt: event.event_time || new Date().toISOString(),
      runId,
      documentId: event.document_id || 'DOC-001',
      eventTime: event.event_time || new Date().toISOString(),
      recommendation: 'approved',
      complianceChecks: [],
      review: reviewsByRunId[runId],
    };
  });
}

export function buildOpenFollowUps(_reviewed: CandidateWithReview[]): AuditorFollowUpTask[] {
  return [];
}

export function buildAuditorQueueKpis(pending: CandidateWithReview[], reviewed: CandidateWithReview[]): AuditorQueueKpis {
  const rejectionRate = reviewed.length === 0 ? 0 : Math.round((reviewed.filter((c) => c.review?.decision === 'rejected').length / reviewed.length) * 100);
  return {
    pendingCount: pending.length,
    reviewedCount: reviewed.length,
    overdueCount: 0,
    rejectionRate,
  };
}

export function getSelectedCandidate(candidates: CandidateWithReview[], _pending: CandidateWithReview[], _reviewed: CandidateWithReview[], selectedRunId: string | null): CandidateWithReview | null {
  if (!selectedRunId) return null;
  return candidates.find((c) => c.runId === selectedRunId) || null;
}

export function getSelectedDisplayScore(selected: CandidateWithReview | null): number | null {
  if (!selected) return null;
  if (!selected.complianceChecks.length) return null;
  const passed = selected.complianceChecks.filter((c) => c.result === 'passed').length;
  return Math.round((passed / selected.complianceChecks.length) * 100);
}

export interface LocalBridgeReviewInput {
  runId: string;
  documentId?: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  reviewerEmail?: string;
  reviewerRoles?: string[];
  nextTaskType?: string;
  nextTaskAssignee?: string;
  nextTaskInstructions?: string;
}

export function createLocalBridgeReview(input: LocalBridgeReviewInput) {
  return {
    decision: input.decision,
    reason: input.reason ?? '',
    reviewer_email: input.reviewerEmail ?? 'local-user',
    reviewed_at: new Date().toISOString(),
  };
}
