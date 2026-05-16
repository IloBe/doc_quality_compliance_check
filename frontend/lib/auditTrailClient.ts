// Audit Trail Client - API client for audit logs

export interface AuditTrailEvent {
  id: string;
  event_id: string;
  action: string;
  actor: string;
  actor_email?: string;
  resource: string;
  timestamp: string;
  event_time: string;
  event_type?: string;
  actor_type?: string;
  actor_id?: string;
  subject_type?: string;
  subject_id?: string;
  trace_id?: string;
  correlation_id?: string;
  payload?: Record<string, any>;
  details?: any;
  status?: string;
}

export interface AuditTrailSchedule {
  id?: string;
  internal_audit_date?: string | null;
  external_audit_date?: string | null;
  external_notified_body?: string | null;
  enabled?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  nextRun?: string;
}

export interface AuditTrailScheduleInput {
  internal_audit_date?: string | null;
  external_audit_date?: string | null;
  external_notified_body?: string | null;
}

export async function fetchAuditTrailEvents(filters?: any): Promise<{ items: AuditTrailEvent[] }> {
  return Promise.resolve({ items: [] });
}

export async function fetchAuditTrailEventDetail(eventId: string): Promise<AuditTrailEvent | null> {
  return Promise.resolve({
    id: eventId,
    event_id: eventId,
    action: 'read',
    actor: 'system',
    actor_email: 'system@example.com',
    resource: 'audit',
    timestamp: new Date().toISOString(),
    event_time: new Date().toISOString(),
    event_type: 'audit.view',
    actor_type: 'user',
    actor_id: 'system',
    subject_type: 'resource',
    subject_id: 'audit',
    trace_id: `trace_${Date.now()}`,
    correlation_id: `corr_${Date.now()}`,
    payload: {},
    details: {},
    status: 'ok',
  });
}

export async function fetchAuditTrailSchedule(): Promise<AuditTrailSchedule> {
  return Promise.resolve({});
}

export async function upsertAuditTrailSchedule(schedule: AuditTrailScheduleInput): Promise<AuditTrailSchedule> {
  return Promise.resolve({
    ...schedule,
  });
}
