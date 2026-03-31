import React, { useEffect, useMemo, useState } from 'react';
import { LuClock3, LuDatabase, LuFileSearch, LuInfo, LuLoader, LuRefreshCw, LuShieldCheck, LuUserCog } from 'react-icons/lu';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import { AuditTrailEvent, fetchAuditTrailEventDetail, fetchAuditTrailEvents, fetchAuditTrailSchedule, upsertAuditTrailSchedule } from '../lib/auditTrailClient';
import { useSubstringFilter } from '../lib/useSubstringFilter';

const windows = [
  { label: '24h', value: 24 },
  { label: '7d', value: 24 * 7 },
  { label: '30d', value: 24 * 30 },
];

function formatTs(value: string): string {
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? value : dt.toLocaleString();
}

function formatDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toInputDateOrEmpty(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
}

function toApiDateTimeOrNull(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return `${trimmed}T00:00:00Z`;
}

type AuditMarker = {
  level: 'yellow' | 'red';
  message: string;
};

function getNearestFutureAudit(internalDate: string, externalDate: string, externalNotifiedBody: string) {
  const now = new Date();
  const candidates = [
    internalDate
      ? {
          kind: 'internal' as const,
          date: new Date(`${internalDate}T00:00:00`),
          message: `Internal audit scheduled for ${new Date(`${internalDate}T00:00:00`).toLocaleDateString()}.`,
        }
      : null,
    externalDate
      ? {
          kind: 'external' as const,
          date: new Date(`${externalDate}T00:00:00`),
          message: `${externalNotifiedBody.trim() || 'External notified body'} audit scheduled for ${new Date(`${externalDate}T00:00:00`).toLocaleDateString()}.`,
        }
      : null,
  ].filter((item): item is { kind: 'internal' | 'external'; date: Date; message: string } => Boolean(item && item.date.getTime() > now.getTime()));

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  return candidates[0];
}

function getAuditMarker(event: AuditTrailEvent, nearestAudit: ReturnType<typeof getNearestFutureAudit>): AuditMarker | null {
  if (!nearestAudit) {
    return null;
  }

  const eventDate = new Date(event.event_time);
  if (Number.isNaN(eventDate.getTime())) {
    return null;
  }

  const diffMs = nearestAudit.date.getTime() - eventDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0 || diffDays > 28) {
    return null;
  }

  if (diffDays <= 14) {
    return {
      level: 'red',
      message: nearestAudit.kind === 'external' ? `${nearestAudit.message} Notified body involved.` : nearestAudit.message,
    };
  }

  return {
    level: 'yellow',
    message: nearestAudit.kind === 'external' ? `${nearestAudit.message} Notified body involved.` : nearestAudit.message,
  };
}

function deriveEventDetailLines(event: AuditTrailEvent): string[] {
  const payload = event.payload || {};
  const eventType = (event.event_type || '').toLowerCase();

  if (eventType.includes('bridge.run.approved')) {
    return [
      `Approval verdict: ${(payload.verdict as string) || 'n/a'}`,
      `Risk context: ${(payload.risk_level as string) || 'n/a'}`,
      `Reviewer comment: ${(payload.comments as string) || 'n/a'}`,
    ];
  }

  if (eventType.includes('bridge.run.completed')) {
    return [
      `Workflow status: ${(payload.status as string) || 'n/a'}`,
      `Document reference: ${(payload.document_id as string) || 'n/a'}`,
      `Findings count: ${String(payload.findings ?? 'n/a')}`,
    ];
  }

  if (eventType.includes('auth.recovery.password_reset')) {
    return [
      `Recovery method: ${(payload.reset_via as string) || 'n/a'}`,
      `Single-use token: ${String(payload.token_single_use ?? 'n/a')}`,
      `Actor: ${event.actor_id}`,
    ];
  }

  if (eventType.includes('auth.login_success')) {
    return [
      `IP address: ${(payload.ip as string) || 'n/a'}`,
      `Authentication method: ${(payload.auth_method as string) || 'n/a'}`,
      `Session subject: ${event.subject_id}`,
    ];
  }

  return [
    `Event type: ${event.event_type}`,
    `Actor: ${event.actor_type}:${event.actor_id}`,
    `Subject: ${event.subject_type}:${event.subject_id}`,
  ];
}

const AuditTrailPage = () => {
  const [windowHours, setWindowHours] = useState(24 * 7);
  const [internalAuditDate, setInternalAuditDate] = useState(formatDateInputValue(new Date(Date.now() + 1000 * 60 * 60 * 24 * 21)));
  const [externalAuditDate, setExternalAuditDate] = useState(formatDateInputValue(new Date(Date.now() + 1000 * 60 * 60 * 24 * 45)));
  const [externalNotifiedBody, setExternalNotifiedBody] = useState('TÜV SÜD');
  const [isScheduleSaving, setIsScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [auditInfoEventId, setAuditInfoEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditTrailEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventDetail, setSelectedEventDetail] = useState<AuditTrailEvent | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to demo mode to keep the page useful in workshops without seeded audit rows.
  // Set NEXT_PUBLIC_AUDIT_TRAIL_SOURCE=backend to load persisted events from PostgreSQL.
  const useBackendData = process.env.NEXT_PUBLIC_AUDIT_TRAIL_SOURCE === 'backend';

  const mockEvents = useMemo<AuditTrailEvent[]>(() => {
    const now = Date.now();
    return [
      {
        event_id: 'evt-001',
        event_type: 'auth.login_success',
        actor_type: 'user',
        actor_id: 'maria.mueller@qm.local',
        subject_type: 'session',
        subject_id: 'sess-91ac',
        trace_id: 'trc-auth-001',
        correlation_id: 'cor-auth-001',
        tenant_id: 'default_tenant',
        org_id: 'qm',
        project_id: 'doc-quality',
        event_time: new Date(now - 1000 * 60 * 25).toISOString(),
        payload: { ip: '127.0.0.1', auth_method: 'password' },
        created_at: new Date(now - 1000 * 60 * 25).toISOString(),
      },
      {
        event_id: 'evt-002',
        event_type: 'bridge.run.completed',
        actor_type: 'agent',
        actor_id: 'orchestrator',
        subject_type: 'workflow',
        subject_id: 'wf-arc42-2026-031',
        trace_id: 'trc-bridge-002',
        correlation_id: 'cor-bridge-002',
        tenant_id: 'default_tenant',
        org_id: 'qm',
        project_id: 'doc-quality',
        event_time: new Date(now - 1000 * 60 * 55).toISOString(),
        payload: { status: 'done', document_id: 'ARC42-2026-031', findings: 4 },
        created_at: new Date(now - 1000 * 60 * 55).toISOString(),
      },
      {
        event_id: 'evt-003',
        event_type: 'bridge.run.approved',
        actor_type: 'user',
        actor_id: 'sven.riskmanager@qm.local',
        subject_type: 'hitl_review',
        subject_id: 'review-2026-77',
        trace_id: 'trc-review-003',
        correlation_id: 'cor-review-003',
        tenant_id: 'default_tenant',
        org_id: 'qm',
        project_id: 'doc-quality',
        event_time: new Date(now - 1000 * 60 * 80).toISOString(),
        payload: { verdict: 'approved', risk_level: 'high', comments: 'Escalation path validated.' },
        created_at: new Date(now - 1000 * 60 * 80).toISOString(),
      },
      {
        event_id: 'evt-004',
        event_type: 'auth.recovery.password_reset',
        actor_type: 'user',
        actor_id: 'auditor.team@qm.local',
        subject_type: 'account',
        subject_id: 'auditor.team@qm.local',
        trace_id: 'trc-auth-004',
        correlation_id: 'cor-auth-004',
        tenant_id: 'default_tenant',
        org_id: 'qm',
        project_id: 'doc-quality',
        event_time: new Date(now - 1000 * 60 * 210).toISOString(),
        payload: { reset_via: 'recovery_token', token_single_use: true },
        created_at: new Date(now - 1000 * 60 * 210).toISOString(),
      },
      {
        event_id: 'evt-005',
        event_type: 'skills.log_event',
        actor_type: 'agent',
        actor_id: 'compliance_checker',
        subject_type: 'finding',
        subject_id: 'finding-1045',
        trace_id: 'trc-skill-005',
        correlation_id: 'cor-skill-005',
        tenant_id: 'default_tenant',
        org_id: 'qm',
        project_id: 'doc-quality',
        event_time: new Date(now - 1000 * 60 * 420).toISOString(),
        payload: { severity: 'medium', regulation: 'EU AI Act Art. 14' },
        created_at: new Date(now - 1000 * 60 * 420).toISOString(),
      },
    ];
  }, []);

  const effectiveEvents = events;

  const nearestFutureAudit = useMemo(
    () => getNearestFutureAudit(internalAuditDate, externalAuditDate, externalNotifiedBody),
    [externalAuditDate, externalNotifiedBody, internalAuditDate],
  );

  const {
    filterQuery,
    setFilterQuery,
    hasActiveFilters,
    clearFilters,
    filteredItems: visibleEvents,
  } = useSubstringFilter<AuditTrailEvent>({
    items: effectiveEvents,
    getSearchText: (item) => [
      formatTs(item.event_time),
      item.event_type || '',
      `${item.actor_type || ''}:${item.actor_id || ''}`,
      `${item.subject_type || ''}:${item.subject_id || ''}`,
    ].join(' '),
  });

  const selectedEventFromList = useMemo(
    () => visibleEvents.find((item) => item.event_id === selectedEventId) ?? visibleEvents[0] ?? null,
    [visibleEvents, selectedEventId],
  );

  const selectedEvent = useMemo(
    () => (useBackendData ? selectedEventDetail ?? selectedEventFromList : selectedEventFromList),
    [selectedEventDetail, selectedEventFromList, useBackendData],
  );

  const kpis = useMemo(() => {
    const total = visibleEvents.length;
    const uniqueActors = new Set(visibleEvents.map((item) => item.actor_id)).size;
    const hitlReviews = visibleEvents.filter((item) => item.subject_type.toLowerCase().includes('review')).length;
    const approvals = visibleEvents.filter((item) => item.event_type.toLowerCase().includes('approved')).length;
    return { total, uniqueActors, hitlReviews, approvals };
  }, [visibleEvents]);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    if (!useBackendData) {
      setEvents(mockEvents);
      if (mockEvents.length > 0) {
        setSelectedEventId((current) => (current && mockEvents.some((item) => item.event_id === current) ? current : mockEvents[0].event_id));
      } else {
        setSelectedEventId(null);
      }
      setIsLoading(false);
      return;
    }

    try {
      const [payload, schedule] = await Promise.all([
        fetchAuditTrailEvents({
          windowHours,
          limit: 250,
        }),
        fetchAuditTrailSchedule(),
      ]);
      setEvents(payload.items || []);
      setInternalAuditDate(toInputDateOrEmpty(schedule.internal_audit_date));
      setExternalAuditDate(toInputDateOrEmpty(schedule.external_audit_date));
      setExternalNotifiedBody(schedule.external_notified_body || '');
      setScheduleError(null);
      if (payload.items?.length) {
        setSelectedEventId((current) => (current && payload.items.some((item) => item.event_id === current) ? current : payload.items[0].event_id));
      } else {
        setSelectedEventId(null);
        setSelectedEventDetail(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [windowHours]);

  const saveSchedule = async () => {
    if (!useBackendData) {
      return;
    }

    setIsScheduleSaving(true);
    setScheduleError(null);
    try {
      const saved = await upsertAuditTrailSchedule({
        internal_audit_date: toApiDateTimeOrNull(internalAuditDate),
        external_audit_date: toApiDateTimeOrNull(externalAuditDate),
        external_notified_body: externalNotifiedBody.trim() || null,
      });
      setInternalAuditDate(toInputDateOrEmpty(saved.internal_audit_date));
      setExternalAuditDate(toInputDateOrEmpty(saved.external_audit_date));
      setExternalNotifiedBody(saved.external_notified_body || '');
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to persist audit schedule');
    } finally {
      setIsScheduleSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedEventId) {
      setSelectedEventDetail(null);
      setDetailError(null);
      setIsDetailLoading(false);
      return;
    }

    if (!useBackendData) {
      const local = selectedEventFromList ?? mockEvents.find((item) => item.event_id === selectedEventId) ?? null;
      setSelectedEventDetail(local);
      setDetailError(null);
      setIsDetailLoading(false);
      return;
    }

    let mounted = true;
    setIsDetailLoading(true);
    setDetailError(null);

    fetchAuditTrailEventDetail(selectedEventId)
      .then((detail) => {
        if (mounted) {
          setSelectedEventDetail(detail);
        }
      })
      .catch((err) => {
        if (mounted) {
          setSelectedEventDetail(selectedEventFromList);
          setDetailError(err instanceof Error ? err.message : 'Failed to load event details');
        }
      })
      .finally(() => {
        if (mounted) {
          setIsDetailLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [mockEvents, selectedEventFromList, selectedEventId, useBackendData]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Reporting / Governance Evidence"
        title="Audit Trail"
        subtitle="Append-only governance timeline for who changed what, when, and under which trace context."
        whyDescription="Audit Trail is a governance and compliance evidence view, not a performance telemetry screen. It provides immutable event chronology with actor, subject, and trace context for review boards, auditors, and post-incident forensics."
        rightContent={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl p-1">
              {windows.map((option) => {
                const active = option.value === windowHours;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setWindowHours(option.value)}
                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-wide rounded-lg transition ${
                      active ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:bg-neutral-100'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <LuRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        }
      />

      {!useBackendData && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-xs text-blue-700 font-semibold">
          Demo mode · representative governance events. Set{' '}
          <code className="font-mono bg-blue-100 px-1 rounded">NEXT_PUBLIC_AUDIT_TRAIL_SOURCE=backend</code>{' '}
          to load persisted audit events from PostgreSQL.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Events in window</div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{kpis.total}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Unique actors</div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{kpis.uniqueActors}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="text-xs uppercase font-black tracking-widest text-neutral-400">HITL review events</div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{kpis.hitlReviews}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Approval events</div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{kpis.approvals}</div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-4">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Next audits</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Next internal audit</label>
              <input
                type="date"
                value={internalAuditDate}
                onChange={(e) => setInternalAuditDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Next external audit</label>
              <input
                type="date"
                value={externalAuditDate}
                onChange={(e) => setExternalAuditDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Notified body</label>
              <input
                value={externalNotifiedBody}
                onChange={(e) => setExternalNotifiedBody(e.target.value)}
                placeholder="e.g. TÜV SÜD"
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="text-xs text-neutral-600">
          {nearestFutureAudit ? (
            <span>
              Nearest future audit: <span className="font-semibold text-neutral-900">{nearestFutureAudit.kind === 'external' ? 'External' : 'Internal'}</span> on{' '}
              <span className="font-semibold text-neutral-900">{nearestFutureAudit.date.toLocaleDateString()}</span>
              {nearestFutureAudit.kind === 'external' && externalNotifiedBody.trim() ? ` · ${externalNotifiedBody.trim()}` : ''}
            </span>
          ) : (
            <span>No future audit date configured yet.</span>
          )}
        </div>

        {useBackendData && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveSchedule}
              disabled={isScheduleSaving}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScheduleSaving ? 'Saving…' : 'Save audit schedule'}
            </button>
            {scheduleError && <div className="text-xs text-rose-700">{scheduleError}</div>}
          </div>
        )}
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-4">
        <div className="grid grid-cols-1 gap-3">
          <input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter visible rows by any substring (time, event type, actor, subject)"
            className="px-3 py-2 rounded-xl border border-neutral-200 text-sm"
          />
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LuFileSearch className="w-4 h-4" />
            Remove filters
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center gap-3 text-neutral-600">
          <LuLoader className="w-5 h-5 animate-spin" />
          Loading audit trail events...
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-sm text-rose-700">{error}</div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-lg font-black text-neutral-900 mb-4">Event Timeline</h2>
            {visibleEvents.length === 0 ? (
              <div className="text-sm text-neutral-500">No audit events in this window with the current filters.</div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500 border-b border-neutral-200">
                      <th className="py-2 pr-3">Time</th>
                      <th className="py-2 pr-3">Event type</th>
                      <th className="py-2 pr-3">Actor</th>
                      <th className="py-2 pr-3">Subject</th>
                      <th className="py-2 pr-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEvents.map((item) => (
                      <React.Fragment key={item.event_id}>
                      <tr
                        className={`border-b border-neutral-100 ${
                          getAuditMarker(item, nearestFutureAudit)?.level === 'red'
                            ? 'bg-rose-50'
                            : getAuditMarker(item, nearestFutureAudit)?.level === 'yellow'
                              ? 'bg-amber-50'
                              : ''
                        }`}
                      >
                        <td className="py-2 pr-3 text-neutral-600 whitespace-nowrap">{formatTs(item.event_time)}</td>
                        <td className="py-2 pr-3 font-semibold text-neutral-800">
                          <div className="inline-flex items-center gap-2">
                            <span>{item.event_type}</span>
                            {getAuditMarker(item, nearestFutureAudit) && (
                              <button
                                type="button"
                                onClick={() => setAuditInfoEventId((current) => (current === item.event_id ? null : item.event_id))}
                                className="p-1 rounded-full text-amber-700 hover:bg-white/70"
                                title="Show audit context"
                              >
                                <LuInfo className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-3">{item.actor_id}</td>
                        <td className="py-2 pr-3">{item.subject_type}:{item.subject_id}</td>
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            onClick={() => setSelectedEventId(item.event_id)}
                            className="px-2 py-1 text-xs rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-60"
                            disabled={isDetailLoading && selectedEventId === item.event_id}
                          >
                            {isDetailLoading && selectedEventId === item.event_id ? 'Loading…' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {auditInfoEventId === item.event_id && getAuditMarker(item, nearestFutureAudit) && (
                        <tr className="border-b border-neutral-100 bg-white/80">
                          <td colSpan={5} className="px-3 py-2 text-xs text-neutral-700">
                            {getAuditMarker(item, nearestFutureAudit)?.message}
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5">
              <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Selected Event</h2>
              {detailError && (
                <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  Detail fallback active: {detailError}
                </div>
              )}
              {!selectedEvent ? (
                <div className="text-sm text-neutral-500">Select an event to inspect payload and trace context.</div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="inline-flex items-center gap-2 text-neutral-700"><LuClock3 className="w-4 h-4" /> {formatTs(selectedEvent.event_time)}</div>
                  <div className="inline-flex items-center gap-2 text-neutral-700"><LuShieldCheck className="w-4 h-4" /> {selectedEvent.event_type}</div>
                  <div className="inline-flex items-center gap-2 text-neutral-700"><LuUserCog className="w-4 h-4" /> {selectedEvent.actor_type}:{selectedEvent.actor_id}</div>
                  <div className="inline-flex items-center gap-2 text-neutral-700"><LuDatabase className="w-4 h-4" /> {selectedEvent.subject_type}:{selectedEvent.subject_id}</div>
                  <div className="pt-2 text-xs text-neutral-500">Trace ID: {selectedEvent.trace_id || 'n/a'}</div>
                  <div className="text-xs text-neutral-500">Correlation ID: {selectedEvent.correlation_id || 'n/a'}</div>
                  <div className="pt-2 space-y-1">
                    {deriveEventDetailLines(selectedEvent).map((line) => (
                      <div key={line} className="text-xs text-neutral-700 bg-neutral-50 border border-neutral-200 rounded px-2 py-1">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-5">
              <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Payload</h2>
              {!selectedEvent ? (
                <div className="text-sm text-neutral-500">No payload selected.</div>
              ) : Object.keys(selectedEvent.payload || {}).length === 0 ? (
                <div className="text-sm text-neutral-500">This event has no structured payload fields.</div>
              ) : (
                <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded p-3 whitespace-pre-wrap break-words max-h-80 overflow-auto">{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      <FooterInfoCard title="Governance scope" accent="emerald">
        Audit Trail is designed as compliance evidence chronology (who/what/when + trace context). Technical latency and model quality diagnostics remain in Admin Observability.
      </FooterInfoCard>
    </div>
  );
};

export default AuditTrailPage;
