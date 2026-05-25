// Audit Trail ViewModel - Models and utilities for audit trails

import { AuditTrailEvent } from './auditTrailClient';
import { formatDateTime } from './dateTime';

export interface AuditTrailKpis {
  total: number;
  uniqueActors: number;
  hitlReviews: number;
  approvals: number;
}

export interface NearestFutureAudit {
  kind: 'internal' | 'external';
  type?: 'internal' | 'external';
  date: Date;
  label: string;
}

export interface AuditMarker {
  message: string;
  tone?: 'info' | 'warning';
}

export const AUDIT_WINDOWS = [
  { label: '24h', value: 24 },
  { label: '7d', value: 168 },
  { label: '30d', value: 720 },
];

export function formatTs(ts: string): string {
  return formatDateTime(ts, ts);
}

export function formatDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toInputDateOrEmpty(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function toApiDateTimeOrNull(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function createMockAuditTrailEvents(): AuditTrailEvent[] {
  return [];
}

export function getEffectiveAuditEvents(params: {
  useBackendData: boolean;
  backendEvents: AuditTrailEvent[];
  mockEvents: AuditTrailEvent[];
  windowHours: number;
}): AuditTrailEvent[] {
  return params.useBackendData ? params.backendEvents : params.mockEvents;
}

export function getNearestFutureAudit(internalDate: string, externalDate: string, externalNotifiedBody: string): NearestFutureAudit | null {
  const internal = internalDate ? new Date(internalDate) : null;
  const external = externalDate ? new Date(externalDate) : null;
  const now = new Date();
  const candidates: NearestFutureAudit[] = [];
  if (internal && internal > now) {
    candidates.push({ kind: 'internal', type: 'internal', date: internal, label: 'Internal audit' });
  }
  if (external && external > now) {
    candidates.push({ kind: 'external', type: 'external', date: external, label: `External audit (${externalNotifiedBody || 'Notified body'})` });
  }
  if (!candidates.length) return null;
  return candidates.sort((a, b) => a.date.getTime() - b.date.getTime())[0];
}

export function getAuditMarker(_event: AuditTrailEvent, _nearest: NearestFutureAudit | null): AuditMarker | null {
  return null;
}

export function getAuditRowHighlightClass(_marker: AuditMarker | null): string {
  return 'bg-white';
}

export function deriveEventDetailLines(event: AuditTrailEvent): string[] {
  const details = event.details && typeof event.details === 'object' ? Object.entries(event.details).map(([k, v]) => `${k}: ${String(v)}`) : [];
  return details.length ? details : ['No additional metadata'];
}

export function buildAuditKpis(events: AuditTrailEvent[]): AuditTrailKpis {
  const uniqueActors = new Set(events.map((e) => e.actor_email || e.actor || 'unknown')).size;
  const hitlReviews = events.filter((e) => (e.event_type || '').includes('review')).length;
  const approvals = events.filter((e) => (e.event_type || '').includes('approved')).length;
  return {
    total: events.length,
    uniqueActors,
    hitlReviews,
    approvals,
  };
}
