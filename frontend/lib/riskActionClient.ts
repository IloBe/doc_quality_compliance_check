import { isDemoMode } from './appMode';

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

interface AuditEventSummary {
  event_id: string;
  event_type: string;
  actor_id: string;
  subject_id: string;
  event_time: string;
  created_at: string;
}

interface AuditEventSummaryList {
  items?: AuditEventSummary[];
}

interface LoggedAuditEvent {
  event_id: string;
  event_type: string;
  actor_id: string;
  subject_id: string;
  event_time: string;
  created_at: string;
}

const demoActions: RiskAction[] = [];

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
    if (payload?.error?.message) {
      return payload.error.message;
    }
    if (payload?.detail) {
      return payload.detail;
    }
  } catch {
    // Ignore parse errors and use fallback.
  }
  return response.statusText || fallback;
}

function parseActionType(eventType: string): RiskActionType {
  const parsed = eventType.replace(/^risk\.action\./, '');
  switch (parsed) {
    case 'mitigate':
    case 'accept':
    case 'transfer':
    case 'avoid':
    case 'create':
    case 'submit_for_review':
    case 'approve':
    case 'request_changes':
      return parsed;
    default:
      return 'create';
  }
}

function toRiskActionFromSummary(item: AuditEventSummary): RiskAction {
  const actionType = parseActionType(item.event_type);
  const when = item.event_time || item.created_at || new Date().toISOString();
  return {
    id: item.event_id,
    action_id: item.event_id,
    record_id: item.subject_id,
    riskId: item.subject_id,
    action_type: actionType,
    type: actionType,
    action_date: when,
    createdAt: item.created_at || when,
    actor_email: item.actor_id,
  };
}

export async function fetchRiskActions(limit = 200): Promise<{ items: RiskAction[]; message?: string; degradedToDemo?: boolean }> {
  if (isDemoMode()) {
    return { items: [...demoActions], degradedToDemo: true };
  }

  const query = new URLSearchParams({
    limit: String(limit),
    event_type: 'risk.action.',
  });
  const endpoint = buildApiUrl(`/api/v1/audit-trail/events?${query.toString()}`);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return {
        items: [],
        message: await parseErrorMessage(response, 'Failed to load risk actions.'),
      };
    }

    const payload = await response.json() as AuditEventSummaryList;
    const items = (payload.items || []).map(toRiskActionFromSummary);
    return { items };
  } catch (error) {
    return {
      items: [],
      message: error instanceof Error ? error.message : 'Failed to load risk actions.',
    };
  }
}

export async function appendRiskAction(
  action: AppendRiskActionInput,
): Promise<{ ok: boolean; message: string; item?: RiskAction; degradedToDemo?: boolean }> {
  const now = new Date().toISOString();
  const actionType = action.action_type ?? action.type ?? 'create';
  const recordId = action.record_id ?? action.riskId ?? 'unknown';

  if (isDemoMode()) {
    const id = `ra_${Date.now()}`;
    const item: RiskAction = {
      id,
      action_id: id,
      record_id: recordId,
      riskId: recordId,
      action_type: actionType,
      type: actionType,
      action_date: now,
      createdAt: now,
      ...action,
    };
    demoActions.unshift(item);

    return {
      ok: true,
      message: 'Risk action added (demo mode).',
      item,
      degradedToDemo: true,
    };
  }

  const endpoint = buildApiUrl('/api/v1/skills/log_event');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: `risk.action.${actionType}`,
        actor_type: 'user',
        actor_id: action.actor_email || 'unknown',
        subject_type: 'risk_record',
        subject_id: recordId,
        tenant_id: 'default_tenant',
        payload: {
          action_type: actionType,
          rationale: action.rationale,
          actor_role: action.actor_role,
          note: action.note,
          record_id: recordId,
        },
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        message: await parseErrorMessage(response, 'Failed to persist risk action.'),
      };
    }

    const saved = await response.json() as LoggedAuditEvent;
    const item: RiskAction = {
      id: saved.event_id,
      action_id: saved.event_id,
      record_id: saved.subject_id,
      riskId: saved.subject_id,
      action_type: parseActionType(saved.event_type),
      type: parseActionType(saved.event_type),
      action_date: saved.event_time || now,
      createdAt: saved.created_at || now,
      actor_email: saved.actor_id,
      actor_role: action.actor_role,
      note: action.note,
      rationale: action.rationale,
    };

    return {
      ok: true,
      message: 'Risk action persisted.',
      item,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to persist risk action.',
    };
  }
}
