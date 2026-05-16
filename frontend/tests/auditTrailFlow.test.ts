/// <reference path="./vitest.d.ts" />

import {
  buildAuditKpis,
  getEffectiveAuditEvents,
  getNearestFutureAudit,
  toApiDateTimeOrNull,
  type NearestFutureAudit,
} from '../lib/auditTrailViewModel';
import type { AuditTrailEvent } from '../lib/auditTrailClient';

function event(overrides: Partial<AuditTrailEvent>): AuditTrailEvent {
  return {
    id: overrides.id ?? 'evt-1',
    event_id: overrides.event_id ?? 'evt-1',
    action: overrides.action ?? 'read',
    actor: overrides.actor ?? 'system',
    actor_email: overrides.actor_email ?? 'system@example.invalid',
    resource: overrides.resource ?? 'audit',
    timestamp: overrides.timestamp ?? '2026-01-01T00:00:00.000Z',
    event_time: overrides.event_time ?? '2026-01-01T00:00:00.000Z',
    event_type: overrides.event_type ?? 'audit.view',
    actor_type: overrides.actor_type,
    actor_id: overrides.actor_id,
    subject_type: overrides.subject_type,
    subject_id: overrides.subject_id,
    trace_id: overrides.trace_id,
    correlation_id: overrides.correlation_id,
    payload: overrides.payload,
    details: overrides.details,
    status: overrides.status,
  };
}

describe('audit trail flow helpers', () => {
  it('selects nearest future audit window and preserves external label context', () => {
    const now = new Date();
    const internal = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 10).toISOString();
    const external = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 20).toISOString();

    const nearest = getNearestFutureAudit(internal, external, 'TUV') as NearestFutureAudit;

    expect(nearest.kind).toBe('internal');
    expect(nearest.label).toContain('Internal');

    const nearestExternal = getNearestFutureAudit('', external, 'TUV') as NearestFutureAudit;
    expect(nearestExternal.kind).toBe('external');
    expect(nearestExternal.label).toContain('TUV');
  });

  it('builds KPI counts for total actors, review events, and approvals', () => {
    const events = [
      event({ id: '1', event_id: '1', actor_email: 'a@example.invalid', event_type: 'bridge.review.opened' }),
      event({ id: '2', event_id: '2', actor_email: 'b@example.invalid', event_type: 'bridge.review.approved' }),
      event({ id: '3', event_id: '3', actor_email: 'a@example.invalid', event_type: 'audit.view' }),
    ];

    const kpis = buildAuditKpis(events);

    expect(kpis.total).toBe(3);
    expect(kpis.uniqueActors).toBe(2);
    expect(kpis.hitlReviews).toBe(2);
    expect(kpis.approvals).toBe(1);
  });

  it('chooses backend or mock source deterministically and formats date payloads', () => {
    const backend = [event({ id: 'b1', event_id: 'b1' })];
    const mock = [event({ id: 'm1', event_id: 'm1' })];

    expect(
      getEffectiveAuditEvents({
        useBackendData: true,
        backendEvents: backend,
        mockEvents: mock,
        windowHours: 24,
      }),
    ).toBe(backend);

    expect(
      getEffectiveAuditEvents({
        useBackendData: false,
        backendEvents: backend,
        mockEvents: mock,
        windowHours: 24,
      }),
    ).toBe(mock);

    expect(toApiDateTimeOrNull('')).toBeNull();
    expect(toApiDateTimeOrNull('2026-05-01')).toContain('2026-05-01T');
  });
});
