export type RiskActionType =
  | 'mitigate'
  | 'accept'
  | 'transfer'
  | 'avoid'
  | 'create'
  | 'submit_for_review'
  | 'approve'
  | 'request_changes';

export interface RiskAction {
  id: string;
  action_id: string;
  record_id: string;
  action_type: RiskActionType;
  action_date: string;
  createdAt: string;
  riskId?: string;
  type?: RiskActionType;
  note?: string;
  rationale?: string;
  actor_email?: string;
  actor_role?: string;
}

export interface AppendRiskActionInput {
  record_id?: string;
  riskId?: string;
  type?: RiskActionType;
  action_type?: RiskActionType;
  note?: string;
  rationale?: string;
  actor_email?: string;
  actor_role?: string;
}

export async function fetchRiskActions(_limit?: number): Promise<{ items: RiskAction[]; degradedToDemo?: boolean }> {
  return { items: [], degradedToDemo: true };
}

export async function appendRiskAction(
  action: AppendRiskActionInput,
): Promise<{ ok: boolean; message: string; item?: RiskAction; degradedToDemo?: boolean }> {
  const now = new Date().toISOString();
  const id = `ra_${Date.now()}`;
  const actionType = action.action_type ?? action.type ?? 'create';

  return {
    ok: true,
    message: 'Risk action added.',
    item: {
      id,
      action_id: id,
      record_id: action.record_id ?? '',
      action_type: actionType,
      action_date: now,
      createdAt: now,
      ...action,
    },
    degradedToDemo: true,
  };
}
