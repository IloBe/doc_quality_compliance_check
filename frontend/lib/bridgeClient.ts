export interface ReloadBridgeAgentsResult {
  message: string;
  agents: Array<{ id: string; status: string; name?: string }>;
  requirements_version: string;
}

export async function reloadBridgeAgents(): Promise<ReloadBridgeAgentsResult> {
  return {
    message: 'Demo mode — agents simulated.',
    agents: [{ id: 'agent-1', status: 'ready', name: 'Compliance Agent' }],
    requirements_version: '0.0.0',
  };
}

export async function fetchBridgeRuns(): Promise<any[]> {
  return [];
}

export async function fetchBridgeRunById(_id: string): Promise<any | null> {
  return null;
}

export interface BridgeHumanReviewResponse {
  decision: 'approved' | 'rejected';
  reason?: string;
  reviewer_email: string;
  reviewed_at: string;
  next_task_type?: 'rerun_bridge' | 'manual_follow_up';
  next_task_assignee?: string;
  next_task_instructions?: string;
}

export interface BridgeRunResponse {
  run_id: string;
  document_id: string;
  started_at: string;
  completed_at?: string;
  status: 'pending' | 'completed' | 'failed';
  recommendation?: 'approved' | 'rejected';
  automatic_recommendation?: 'approved' | 'rejected';
  score?: number;
  compliance_score?: number;
  regulatory_update?: {
    requires_document_update: boolean;
    message?: string;
  };
  human_review_required?: boolean;
}

export interface BridgeEuAiActAlertResponse {
  hasAlert: boolean;
  message?: string;
  regulatory_update: {
    requires_document_update: boolean;
  };
}

export async function fetchBridgeHumanReview(_runId: string): Promise<BridgeHumanReviewResponse> {
  return {
    decision: 'approved',
    reviewer_email: 'reviewer@example.com',
    reviewed_at: new Date().toISOString(),
    next_task_type: 'rerun_bridge',
  };
}

export async function submitBridgeHumanReview(
  _runId: string,
  review: Record<string, any>,
): Promise<BridgeHumanReviewResponse> {
  return {
    decision: review.decision === 'rejected' ? 'rejected' : 'approved',
    reason: review.reason,
    reviewer_email: review.reviewer_email || 'reviewer@example.com',
    next_task_type: review.next_task_type,
    next_task_assignee: review.next_task_assignee,
    next_task_instructions: review.next_task_instructions,
    reviewed_at: new Date().toISOString(),
  };
}

export async function executeBridgeEuAiActRun(documentId: string, _domainInfo?: any): Promise<BridgeRunResponse> {
  return {
    run_id: `run_${Date.now()}`,
    document_id: documentId,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    status: 'completed',
    recommendation: 'approved',
    automatic_recommendation: 'approved',
    score: 0.9,
    compliance_score: 0.9,
    regulatory_update: {
      requires_document_update: false,
      message: 'No regulatory changes detected.',
    },
    human_review_required: true,
  };
}

export async function fetchBridgeEuAiActAlert(_documentId: string): Promise<BridgeEuAiActAlertResponse> {
  return {
    hasAlert: false,
    regulatory_update: {
      requires_document_update: false,
    },
  };
}
