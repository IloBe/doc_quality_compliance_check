import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { LuLoader, LuRefreshCw } from 'react-icons/lu';
import AuditTrailEventDetailsPanel from '../components/auditTrail/AuditTrailEventDetailsPanel';
import AuditTrailFiltersPanel from '../components/auditTrail/AuditTrailFiltersPanel';
import AuditTrailKpiGrid from '../components/auditTrail/AuditTrailKpiGrid';
import AuditTrailSchedulePanel from '../components/auditTrail/AuditTrailSchedulePanel';
import AuditTrailTimelineTable from '../components/auditTrail/AuditTrailTimelineTable';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import { getHeaderControlClass, getHeaderToggleGroupClass } from '../components/buttonStyles';
import { AuditTrailEvent, fetchAuditTrailEventDetail, fetchAuditTrailEvents, fetchAuditTrailSchedule, upsertAuditTrailSchedule } from '../lib/auditTrailClient';
import {
  AUDIT_WINDOWS,
  buildAuditKpis,
  createMockAuditTrailEvents,
  formatDateInputValue,
  getEffectiveAuditEvents,
  getNearestFutureAudit,
  toApiDateTimeOrNull,
  toInputDateOrEmpty,
} from '../lib/auditTrailViewModel';
import { getSelectionButtonClass } from '../lib/selectionStyles';
import { useSubstringFilter } from '../lib/useSubstringFilter';

const AuditTrailPage = () => {
  const router = useRouter();
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

  const mockEvents = useMemo<AuditTrailEvent[]>(() => createMockAuditTrailEvents(), []);

  const effectiveEvents = useMemo(() => {
    return getEffectiveAuditEvents({
      useBackendData,
      backendEvents: events,
      mockEvents,
      windowHours,
    });
  }, [events, mockEvents, useBackendData, windowHours]);

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
    getSearchText: (item) => [item.event_time, item.event_type || '', `${item.actor_type || ''}:${item.actor_id || ''}`, `${item.subject_type || ''}:${item.subject_id || ''}`].join(' '),
  });

  const selectedEventFromList = useMemo(
    () => visibleEvents.find((item) => item.event_id === selectedEventId) ?? visibleEvents[0] ?? null,
    [visibleEvents, selectedEventId],
  );

  const selectedEvent = useMemo(
    () => (useBackendData ? selectedEventDetail ?? selectedEventFromList : selectedEventFromList),
    [selectedEventDetail, selectedEventFromList, useBackendData],
  );

  const kpis = useMemo(() => buildAuditKpis(visibleEvents), [visibleEvents]);

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
            <button
              type="button"
              onClick={() => router.push('/auditor-workstation')}
              className={getHeaderControlClass('neutral')}
            >
              Open Auditor Workstation
            </button>
            <div className={getHeaderToggleGroupClass()}>
              {AUDIT_WINDOWS.map((option) => {
                const active = option.value === windowHours;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setWindowHours(option.value)}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${getSelectionButtonClass({
                      isSelected: active,
                      tone: 'blue',
                      selectedClass: 'bg-blue-600 text-white',
                    })}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={load}
              className={getHeaderControlClass('neutral')}
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

      <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs text-neutral-700 font-semibold">
        Read-only governance view: use Auditor Workstation for approve/reject actions and follow-up assignment.
      </div>

      <AuditTrailKpiGrid kpis={kpis} />

      <AuditTrailSchedulePanel
        internalAuditDate={internalAuditDate}
        externalAuditDate={externalAuditDate}
        externalNotifiedBody={externalNotifiedBody}
        onInternalAuditDateChange={setInternalAuditDate}
        onExternalAuditDateChange={setExternalAuditDate}
        onExternalNotifiedBodyChange={setExternalNotifiedBody}
        nearestFutureAudit={nearestFutureAudit}
        useBackendData={useBackendData}
        isScheduleSaving={isScheduleSaving}
        scheduleError={scheduleError}
        onSaveSchedule={saveSchedule}
      />

      <AuditTrailFiltersPanel
        filterQuery={filterQuery}
        onFilterQueryChange={setFilterQuery}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

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
          <AuditTrailTimelineTable
            visibleEvents={visibleEvents}
            nearestFutureAudit={nearestFutureAudit}
            selectedEventId={selectedEventId}
            isDetailLoading={isDetailLoading}
            auditInfoEventId={auditInfoEventId}
            onSelectEvent={setSelectedEventId}
            onToggleAuditInfo={(eventId) => setAuditInfoEventId((current) => (current === eventId ? null : eventId))}
          />

          <AuditTrailEventDetailsPanel selectedEvent={selectedEvent} detailError={detailError} />
        </div>
      )}

      <FooterInfoCard title="Governance note" accent="emerald">
        Audit Trail is designed as compliance evidence chronology (who/what/when + trace context). Technical latency and model quality diagnostics remain in Admin Observability.
      </FooterInfoCard>
    </div>
  );
};

export default AuditTrailPage;
