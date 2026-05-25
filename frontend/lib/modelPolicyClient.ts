export interface RuntimeModelParameters {
  temperature: number;
  top_p: number;
  top_k: number;
}

export interface ActiveRuntimeModel {
  model_id: string;
  display_name: string;
  provider: string;
  priority: number;
  params: RuntimeModelParameters;
}

export interface ActiveModelStatus {
  active_model: ActiveRuntimeModel;
  policy_updated_at?: string;
  policy_updated_by?: string;
  degradedToDemo?: boolean;
}

const DEFAULT_ACTIVE_MODEL: ActiveRuntimeModel = {
  model_id: 'llama3.1:8b',
  display_name: 'Llama 3.1 8B',
  provider: 'ollama',
  priority: 1,
  params: {
    temperature: 0.2,
    top_p: 0.9,
    top_k: 40,
  },
};

export async function fetchActiveModelStatus(): Promise<ActiveModelStatus> {
  const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN?.trim();
  const endpoint = apiOrigin ? `${apiOrigin}/api/v1/admin/model-policy/active` : '/api/v1/admin/model-policy/active';

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }
    const payload = await response.json();
    return {
      active_model: payload?.active_model ?? DEFAULT_ACTIVE_MODEL,
      policy_updated_at: payload?.policy_updated_at,
      policy_updated_by: payload?.policy_updated_by,
    };
  } catch {
    return {
      active_model: DEFAULT_ACTIVE_MODEL,
      degradedToDemo: true,
    };
  }
}

export interface ModelPolicyPayload {
  default_model_id: string;
  items: ModelCandidate[];
  updated_by?: string;
  updated_at?: string;
}

export interface ModelCandidate {
  model_id: string;
  display_name: string;
  provider: string;
  enabled: boolean;
  priority: number;
  params: RuntimeModelParameters;
}

export async function fetchModelPolicy(): Promise<ModelPolicyPayload> {
  const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN?.trim();
  const endpoint = apiOrigin ? `${apiOrigin}/api/v1/admin/model-policy` : '/api/v1/admin/model-policy';

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch model policy');
  }
}

export async function updateModelPolicy(policy: ModelPolicyPayload): Promise<ModelPolicyPayload> {
  const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN?.trim();
  const endpoint = apiOrigin ? `${apiOrigin}/api/v1/admin/model-policy` : '/api/v1/admin/model-policy';

  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        default_model_id: policy.default_model_id,
        items: policy.items,
      }),
    });
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update model policy');
  }
}
