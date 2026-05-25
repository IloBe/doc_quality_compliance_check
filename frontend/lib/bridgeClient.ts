export interface ReloadBridgeAgentsResult {
  message: string;
  agents: Array<{ id: string; status: string; name?: string }>;
  requirements_version: string;
}

export interface BridgeAgentRuntimeTopology {
  agent_id: string;
  sandbox_id: string;
  orchestrator_managed: boolean;
  container_name: string;
  container_id?: string | null;
  deployed: boolean;
  running: boolean;
  health_status: string;
  network_id?: string | null;
  proof_source: string;
}

export interface BridgeRuntimeTopology {
  checked_at: string;
  orchestrator_name: string;
  orchestrator_mode: string;
  topology_source: string;
  explicitly_proven: boolean;
  isolated_deployments: boolean;
  all_agents_healthy: boolean;
  agents: BridgeAgentRuntimeTopology[];
  issues: string[];
}

function isBackendMode(): boolean {
  const mode = String(process.env.NEXT_PUBLIC_BRIDGE_SOURCE || 'backend').trim().toLowerCase();
  return mode !== 'demo';
}

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN?.trim() || '';
}

function buildApiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path}` : path;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as {
      error?: {
        code?: string;
        message?: string;
        details?: string[];
        reason?: string;
      };
      detail?: string | Array<{ msg?: string; loc?: Array<string | number> }>;
    };

    if (payload.error && typeof payload.error.message === 'string' && payload.error.message.trim().length > 0) {
      const parts: string[] = [payload.error.message.trim()];
      if (payload.error.reason) {
        parts.push(`Reason: ${payload.error.reason}`);
      }
      if (Array.isArray(payload.error.details) && payload.error.details.length > 0) {
        parts.push(payload.error.details.join(' '));
      }
      return parts.join(' ');
    }

    if (typeof payload.detail === 'string' && payload.detail.trim().length > 0) {
      return payload.detail;
    }

    if (Array.isArray(payload.detail) && payload.detail.length > 0) {
      const first = payload.detail[0];
      const location = Array.isArray(first.loc) ? first.loc.join('.') : 'request';
      const reason = first.msg || 'validation error';
      return `${location}: ${reason}`;
    }
  } catch {
    // Fall back to status text.
  }
  return response.statusText || fallback;
}

export async function reloadBridgeAgents(): Promise<ReloadBridgeAgentsResult> {
  if (isBackendMode()) {
    const response = await fetch(buildApiUrl('/api/v1/bridge/agents/reload'), {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      const detail = await parseErrorMessage(response, 'Failed to reload bridge agents.');
      throw new Error(`Failed to reload bridge agents: ${detail}`);
    }

    const payload = await response.json() as {
      message: string;
      requirements_version: string;
      agents: Array<{ agent_id: string; label: string; status: string }>;
    };

    return {
      message: payload.message,
      requirements_version: payload.requirements_version,
      agents: (payload.agents || []).map((agent) => ({
        id: agent.agent_id,
        name: agent.label,
        status: agent.status,
      })),
    };
  }

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

export async function fetchBridgeRuntimeTopology(): Promise<BridgeRuntimeTopology> {
  if (isBackendMode()) {
    const response = await fetch(buildApiUrl('/api/v1/bridge/runtime/topology'), {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const detail = await parseErrorMessage(response, 'Failed to load bridge runtime topology.');
      throw new Error(`Failed to load bridge runtime topology: ${detail}`);
    }

    return await response.json() as BridgeRuntimeTopology;
  }

  return {
    checked_at: new Date().toISOString(),
    orchestrator_name: 'bridge-workflow-orchestrator',
    orchestrator_mode: 'containerized-sandbox',
    topology_source: 'metadata',
    explicitly_proven: true,
    isolated_deployments: true,
    all_agents_healthy: true,
    agents: [
      {
        agent_id: 'inspection',
        sandbox_id: 'sandbox-inspection-demo',
        orchestrator_managed: true,
        container_name: 'bridge-agent-inspection',
        container_id: 'demo-inspection',
        deployed: true,
        running: true,
        health_status: 'healthy',
        network_id: 'bridge-sandbox-network',
        proof_source: 'metadata',
      },
      {
        agent_id: 'compliance',
        sandbox_id: 'sandbox-compliance-demo',
        orchestrator_managed: true,
        container_name: 'bridge-agent-compliance',
        container_id: 'demo-compliance',
        deployed: true,
        running: true,
        health_status: 'healthy',
        network_id: 'bridge-sandbox-network',
        proof_source: 'metadata',
      },
      {
        agent_id: 'research',
        sandbox_id: 'sandbox-research-demo',
        orchestrator_managed: true,
        container_name: 'bridge-agent-research',
        container_id: 'demo-research',
        deployed: true,
        running: true,
        health_status: 'healthy',
        network_id: 'bridge-sandbox-network',
        proof_source: 'metadata',
      },
      {
        agent_id: 'quality_gate',
        sandbox_id: 'sandbox-quality-gate-demo',
        orchestrator_managed: true,
        container_name: 'bridge-agent-quality-gate',
        container_id: 'demo-quality-gate',
        deployed: true,
        running: true,
        health_status: 'healthy',
        network_id: 'bridge-sandbox-network',
        proof_source: 'metadata',
      },
    ],
    issues: [],
  };
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
  framework?: string;
  summary?: string;
  started_at: string;
  completed_at?: string;
  status: 'pending' | 'completed' | 'failed';
  recommendation?: 'approved' | 'rejected';
  automatic_recommendation?: 'approved' | 'rejected';
  score?: number;
  compliance_score?: number;
  requirements?: Array<{
    requirement_id: string;
    framework?: string;
    title?: string;
    passed?: boolean;
    mandatory?: boolean;
    gap_description?: string;
  }>;
  mandatory_gaps?: string[];
  optional_gaps?: string[];
  approved?: boolean;
  checked_frameworks?: string[];
  governance_controls?: Array<{
    id: string;
    name: string;
    framework: string;
    framework_id: string;
    control_type: 'directive' | 'norm' | 'policy' | 'sop';
    activation_mode: 'baseline' | 'context';
    domain_tags: string[];
    market_tags: string[];
    status: 'compliant' | 'warning' | 'critical' | 'draft';
    objective: string;
    implementation: string;
    evidence: string;
  }>;
  mitigation_recommendations?: Array<{
    topic: string;
    proposal: string;
  }>;
  sandbox_steps?: Array<{
    step_id: string;
    agent_id: string;
    sandbox_id: string;
    model_provider: string;
    model_id: string;
    sandbox_mode: string;
    egress_policy: string;
    processed_locally: boolean;
  }>;
  privacy_violation?: {
    detected: boolean;
    summary: string;
    matched_signals: string[];
    proposals: Array<{
      proposal_id: string;
      title: string;
      details: string;
      implementation_status?: string;
      implementation_note?: string;
    }>;
  };
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
  if (isBackendMode()) {
    const response = await fetch(buildApiUrl(`/api/v1/bridge/runs/${encodeURIComponent(_runId)}/human-review`), {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const detail = await parseErrorMessage(response, 'Failed to load bridge human review.');
      throw new Error(`Failed to load bridge human review: ${detail}`);
    }

    return await response.json() as BridgeHumanReviewResponse;
  }

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
  if (isBackendMode()) {
    const response = await fetch(buildApiUrl(`/api/v1/bridge/runs/${encodeURIComponent(_runId)}/human-review`), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(review),
    });

    if (!response.ok) {
      const detail = await parseErrorMessage(response, 'Failed to submit bridge human review.');
      throw new Error(`Failed to submit bridge human review: ${detail}`);
    }

    return await response.json() as BridgeHumanReviewResponse;
  }

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
  if (isBackendMode()) {
    const response = await fetch(buildApiUrl('/api/v1/bridge/run/eu-ai-act'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
        domain_info: _domainInfo,
      }),
    });

    if (!response.ok) {
      const detail = await parseErrorMessage(response, 'Failed to execute bridge run.');
      throw new Error(`Failed to execute bridge run: ${detail}`);
    }

    return await response.json() as BridgeRunResponse;
  }

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
  if (isBackendMode()) {
    const response = await fetch(buildApiUrl(`/api/v1/bridge/alerts/eu-ai-act/${encodeURIComponent(_documentId)}`), {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const detail = await parseErrorMessage(response, 'Failed to load bridge alert.');
      throw new Error(`Failed to load bridge alert: ${detail}`);
    }

    const payload = await response.json() as {
      regulatory_update: {
        requires_document_update: boolean;
        message?: string;
      };
    };

    return {
      hasAlert: Boolean(payload?.regulatory_update?.requires_document_update),
      message: payload?.regulatory_update?.message,
      regulatory_update: payload?.regulatory_update || { requires_document_update: false },
    };
  }

  return {
    hasAlert: false,
    regulatory_update: {
      requires_document_update: false,
    },
  };
}
