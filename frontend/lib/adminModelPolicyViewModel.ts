// Admin Model Policy ViewModel - Types and utilities for model policy management UI

export interface ModelCandidate {
  model_id: string;
  display_name: string;
  provider: 'ollama' | 'anthropic' | 'perplexity' | 'openai' | 'other';
  enabled: boolean;
  priority: number;
  params: {
    temperature: number;
    top_p: number;
    top_k: number;
  };
}

export interface ModelPolicyUI {
  default_model_id: string;
  items: ModelCandidate[];
  updated_by?: string;
  updated_at?: string;
}

export interface ModelPolicyRequest {
  default_model_id: string;
  items: ModelCandidate[];
}

export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  ollama: 'Ollama (On-Prem)',
  anthropic: 'Anthropic',
  perplexity: 'Perplexity',
  openai: 'OpenAI',
  other: 'Other',
};

export const PROVIDER_COLORS: Record<string, string> = {
  ollama: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  anthropic: 'bg-blue-50 border-blue-300 text-blue-900',
  perplexity: 'bg-purple-50 border-purple-300 text-purple-900',
  openai: 'bg-amber-50 border-amber-300 text-amber-900',
  other: 'bg-neutral-50 border-neutral-300 text-neutral-900',
};

export function getDefaultModelPolicy(): ModelPolicyUI {
  return {
    default_model_id: 'llama3.1:8b',
    items: [
      {
        model_id: 'llama3.1:8b',
        display_name: 'Llama 3.1 8B',
        provider: 'ollama',
        enabled: true,
        priority: 1,
        params: { temperature: 0.2, top_p: 0.9, top_k: 40 },
      },
      {
        model_id: 'llama3.1:70b',
        display_name: 'Llama 3.1 70B',
        provider: 'ollama',
        enabled: true,
        priority: 2,
        params: { temperature: 0.15, top_p: 0.9, top_k: 32 },
      },
      {
        model_id: 'qwen3:32b',
        display_name: 'Qwen3 32B',
        provider: 'ollama',
        enabled: true,
        priority: 3,
        params: { temperature: 0.2, top_p: 0.85, top_k: 40 },
      },
    ],
  };
}

export function reorderByPriority(items: ModelCandidate[]): ModelCandidate[] {
  return [...items].sort((a, b) => a.priority - b.priority);
}

export function updatePriorities(items: ModelCandidate[], newOrder: ModelCandidate[]): ModelCandidate[] {
  return newOrder.map((item, index) => ({
    ...item,
    priority: index + 1,
  }));
}

export function validateModelPolicy(policy: ModelPolicyUI): string[] {
  const errors: string[] = [];

  if (!policy.default_model_id.trim()) {
    errors.push('Default model ID is required');
  }

  if (policy.items.length === 0) {
    errors.push('At least one model must be configured');
  }

  const ids = policy.items.map((item) => item.model_id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    errors.push('Model IDs must be unique');
  }

  if (!ids.includes(policy.default_model_id)) {
    errors.push('Default model ID must exist in the items list');
  }

  policy.items.forEach((item, index) => {
    if (!item.model_id.trim()) {
      errors.push(`Item ${index}: Model ID is required`);
    }
    if (!item.display_name.trim()) {
      errors.push(`Item ${index}: Display name is required`);
    }
    if (item.priority < 1 || item.priority > 1000) {
      errors.push(`Item ${index}: Priority must be between 1 and 1000`);
    }
    if (item.params.temperature < 0 || item.params.temperature > 2) {
      errors.push(`Item ${index}: Temperature must be between 0 and 2`);
    }
    if (item.params.top_p < 0 || item.params.top_p > 1) {
      errors.push(`Item ${index}: Top P must be between 0 and 1`);
    }
    if (item.params.top_k < 1 || item.params.top_k > 500) {
      errors.push(`Item ${index}: Top K must be between 1 and 500`);
    }
  });

  return errors;
}

export function toModelPolicyUI(data: any): ModelPolicyUI {
  return {
    default_model_id: data.default_model_id || 'llama3.1:8b',
    items: Array.isArray(data.items) ? data.items : [],
    updated_by: data.updated_by,
    updated_at: data.updated_at,
  };
}
