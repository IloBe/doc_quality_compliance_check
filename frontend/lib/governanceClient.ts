import {
  buildGovernanceSnapshot,
  GovernanceControl,
  GovernanceMetric,
  GovernancePolicy,
} from './adminGovernanceViewModel';

export interface GovernanceSnapshotApi {
  metrics: GovernanceMetric[];
  policies: Array<{
    id: string;
    title: string;
    version: string;
    owner: string;
    review_cadence: string;
    next_review_date: string;
    status: GovernancePolicy['status'];
  }>;
  controls: GovernanceControl[];
  updated_at: string;
}

export interface GovernanceSnapshotUi {
  metrics: GovernanceMetric[];
  policies: GovernancePolicy[];
  controls: GovernanceControl[];
  updatedAtIso: string;
  degradedToDemo?: boolean;
}

export interface GovernanceControlCreatePayload {
  name: string;
  framework_id: string;
  framework: string;
  control_type: 'directive' | 'norm' | 'policy' | 'sop';
  activation_mode: 'baseline' | 'context';
  domain_tags: string[];
  market_tags: string[];
  objective: string;
  implementation: string;
  evidence: string;
  status: GovernanceControl['status'];
  is_active: boolean;
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
    const payload = await response.json() as { detail?: string; error?: { message?: string } };
    if (typeof payload?.detail === 'string' && payload.detail.trim().length > 0) {
      return payload.detail;
    }
    if (typeof payload?.error?.message === 'string' && payload.error.message.trim().length > 0) {
      return payload.error.message;
    }
  } catch {
    // Ignore JSON parse errors and fall back to status text.
  }
  return response.statusText || fallback;
}

/**
 * Fetch governance snapshot from backend with demo fallback on transport errors.
 */
export async function fetchGovernanceSnapshot(): Promise<GovernanceSnapshotUi> {
  const endpoint = buildApiUrl('/api/v1/admin/governance/snapshot');

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const detail = await parseErrorMessage(response, 'Failed to load governance snapshot.');
      throw new Error(`Failed to load governance snapshot: ${detail}`);
    }

    const payload = await response.json() as GovernanceSnapshotApi;
    return {
      metrics: Array.isArray(payload.metrics) ? payload.metrics : [],
      policies: Array.isArray(payload.policies)
        ? payload.policies.map((policy) => ({
            id: policy.id,
            title: policy.title,
            version: policy.version,
            owner: policy.owner,
            reviewCadence: policy.review_cadence,
            nextReviewDate: policy.next_review_date,
            status: policy.status,
          }))
        : [],
      controls: Array.isArray(payload.controls) ? payload.controls : [],
      updatedAtIso: payload.updated_at || new Date().toISOString(),
    };
  } catch (error) {
    const demo = buildGovernanceSnapshot();
    console.error('admin.governance.client_fetch_failed', {
      error: error instanceof Error ? error.message : String(error),
      endpoint,
      fallback: 'demo_snapshot',
    });
    return {
      ...demo,
      degradedToDemo: true,
    };
  }
}

export async function createGovernanceControl(payload: GovernanceControlCreatePayload): Promise<GovernanceControl> {
  const endpoint = buildApiUrl('/api/v1/admin/governance/controls');
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Failed to create governance control item.');
    throw new Error(`Failed to create governance control item: ${detail}`);
  }

  return await response.json() as GovernanceControl;
}
