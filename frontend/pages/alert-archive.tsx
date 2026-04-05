import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { LuArchive, LuInfo, LuLoader, LuRefreshCw, LuShieldCheck } from 'react-icons/lu';
import AlertArchiveList from '../components/compliance/AlertArchiveList';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import { getHeaderControlClass } from '../components/buttonStyles';
import { fetchComplianceAlertArchive } from '../lib/complianceAlertClient';
import { complianceAlertArchive } from '../lib/complianceStandards';
import { ComplianceAlertFilters, ComplianceAlertSeverity, filterComplianceAlerts, normalizeDateRange } from '../lib/complianceAlertViewModel';
import { getSelectionButtonClass } from '../lib/selectionStyles';

const FRAMEWORK_FILTERS = ['All', 'EU AI Act', 'GDPR', 'HIPAA'] as const;
const SEVERITY_FILTERS: ComplianceAlertSeverity[] = ['All', 'info', 'warning', 'critical'];

function _readQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function _isValidFramework(value: string): value is (typeof FRAMEWORK_FILTERS)[number] {
  return FRAMEWORK_FILTERS.includes(value as (typeof FRAMEWORK_FILTERS)[number]);
}

function _isValidSeverity(value: string): value is ComplianceAlertSeverity {
  return SEVERITY_FILTERS.includes(value as ComplianceAlertSeverity);
}

const AlertArchivePage = () => {
  const router = useRouter();
  const [selectedFramework, setSelectedFramework] = useState<(typeof FRAMEWORK_FILTERS)[number]>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<ComplianceAlertSeverity>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [alerts, setAlerts] = useState(complianceAlertArchive);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useBackendData = process.env.NEXT_PUBLIC_COMPLIANCE_ALERT_SOURCE === 'backend';

  const activeFilters: ComplianceAlertFilters = useMemo(() => {
    const normalized = normalizeDateRange(startDate, endDate);
    return {
      framework: selectedFramework,
      severity: selectedSeverity,
      startDate: normalized.startDate,
      endDate: normalized.endDate,
    };
  }, [endDate, selectedFramework, selectedSeverity, startDate]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const frameworkFromQuery = _readQueryValue(router.query.framework);
    const severityFromQuery = _readQueryValue(router.query.severity);
    const startDateFromQuery = _readQueryValue(router.query.startDate);
    const endDateFromQuery = _readQueryValue(router.query.endDate);

    if (frameworkFromQuery && _isValidFramework(frameworkFromQuery)) {
      setSelectedFramework(frameworkFromQuery);
    }
    if (severityFromQuery && _isValidSeverity(severityFromQuery)) {
      setSelectedSeverity(severityFromQuery);
    }
    if (startDateFromQuery) {
      setStartDate(startDateFromQuery);
    }
    if (endDateFromQuery) {
      setEndDate(endDateFromQuery);
    }
    // Initialize from URL only once; subsequent URL updates are driven by state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const nextQuery: Record<string, string> = {};
    Object.entries(router.query).forEach(([key, rawValue]) => {
      if (key === 'framework' || key === 'severity' || key === 'startDate' || key === 'endDate') {
        return;
      }
      const normalized = _readQueryValue(rawValue);
      if (normalized) {
        nextQuery[key] = normalized;
      }
    });

    if (activeFilters.framework !== 'All') {
      nextQuery.framework = activeFilters.framework;
    }
    if (activeFilters.severity !== 'All') {
      nextQuery.severity = activeFilters.severity;
    }
    if (activeFilters.startDate) {
      nextQuery.startDate = activeFilters.startDate;
    }
    if (activeFilters.endDate) {
      nextQuery.endDate = activeFilters.endDate;
    }

    const currentFramework = _readQueryValue(router.query.framework);
    const currentSeverity = _readQueryValue(router.query.severity);
    const currentStartDate = _readQueryValue(router.query.startDate);
    const currentEndDate = _readQueryValue(router.query.endDate);

    const desiredFramework = nextQuery.framework ?? '';
    const desiredSeverity = nextQuery.severity ?? '';
    const desiredStartDate = nextQuery.startDate ?? '';
    const desiredEndDate = nextQuery.endDate ?? '';

    if (
      currentFramework === desiredFramework
      && currentSeverity === desiredSeverity
      && currentStartDate === desiredStartDate
      && currentEndDate === desiredEndDate
    ) {
      return;
    }

    void router.replace(
      {
        pathname: router.pathname,
        query: nextQuery,
      },
      undefined,
      { shallow: true, scroll: false },
    );
  }, [activeFilters, router]);

  const loadAlerts = async (filters: ComplianceAlertFilters) => {
    if (!useBackendData) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchComplianceAlertArchive({
        framework: filters.framework,
        severity: filters.severity,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      setAlerts(items.length > 0 ? items : complianceAlertArchive);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance alerts');
      setAlerts(complianceAlertArchive);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts(activeFilters);
  }, [activeFilters]);

  const visibleAlerts = useMemo(() => {
    if (useBackendData) {
      return alerts;
    }

    return filterComplianceAlerts(complianceAlertArchive, activeFilters);
  }, [activeFilters, alerts, useBackendData]);

  const frameworkCount = useMemo(() => {
    return new Set(visibleAlerts.map((alert) => alert.framework).filter(Boolean)).size;
  }, [visibleAlerts]);

  const clearAllFilters = () => {
    setSelectedFramework('All');
    setSelectedSeverity('All');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Governance & Standards"
        title="Compliance Alert Archive"
        subtitle="Demo archive of recent regulatory monitoring results for EU AI Act, GDPR, and HIPAA with app-consistent governance context."
        whyDescription="The archive gives reviewers and governance stakeholders a traceable view of recent monitoring outputs so they can understand what changed, when it was detected, and which framework family it affects before deeper investigation begins."
        rightContent={
          <button
            type="button"
            onClick={() => loadAlerts(activeFilters)}
            className={getHeaderControlClass('neutral')}
          >
            {isLoading ? <LuLoader className="h-3.5 w-3.5 animate-spin" /> : <LuRefreshCw className="h-3.5 w-3.5" />}
            Refresh Alerts
          </button>
        }
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-neutral-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-violet-700">
            <LuArchive className="h-4 w-4" />
            Archive Scope
          </div>
          <p className="mt-3 text-3xl font-black text-neutral-900">{visibleAlerts.length} Alerts</p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            {useBackendData
              ? 'Persisted archive entries are read from append-only backend audit storage with demo fallback when no live backend is available.'
              : 'Demo-only entries styled as realistic monitoring outcomes for the latest tracked frameworks.'}
          </p>
        </div>

        <div className="rounded-[2rem] border border-neutral-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-700">
            <LuShieldCheck className="h-4 w-4" />
            Covered Frameworks
          </div>
          <p className="mt-3 text-3xl font-black text-neutral-900">{frameworkCount} Families</p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            EU AI Act, GDPR, and HIPAA snapshots are shown for demo purposes while preserving the app’s governance-first presentation style.
          </p>
        </div>

        <div className="rounded-[2rem] border border-neutral-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-700">
            <LuInfo className="h-4 w-4" />
            Demo Note
          </div>
          <p className="mt-3 text-3xl font-black text-neutral-900">{useBackendData ? 'Audit-Backed' : 'Mocked Feed'}</p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            {useBackendData
              ? 'Backend mode stores alert snapshots in append-only audit events for reproducibility while preserving a demo fallback when no live rows are available.'
              : 'Entries are intentionally synthetic to avoid external research cost while still showing how a realistic alert archive would look in production.'}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-[2rem] border border-neutral-100 bg-gradient-to-r from-neutral-50 to-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-neutral-900">Latest archived alerts</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            The list below shows the last five archived alerts for EU AI Act, GDPR, and HIPAA in a format suitable for compliance demo walkthroughs and stakeholder reviews.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-xs font-black uppercase tracking-wide text-neutral-600">
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 outline-none transition focus:border-blue-400"
              />
            </label>
            <label className="text-xs font-black uppercase tracking-wide text-neutral-600">
              End date
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 outline-none transition focus:border-blue-400"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {FRAMEWORK_FILTERS.map((framework) => (
              <button
                key={framework}
                type="button"
                onClick={() => setSelectedFramework(framework)}
                className={[
                  'rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition',
                  getSelectionButtonClass({
                    isSelected: selectedFramework === framework,
                    tone: framework === 'HIPAA' ? 'amber' : 'blue',
                    idleClass: 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100',
                  }),
                ].join(' ')}
              >
                {framework}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {SEVERITY_FILTERS.map((severity) => (
              <button
                key={severity}
                type="button"
                onClick={() => setSelectedSeverity(severity)}
                className={[
                  'rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition',
                  getSelectionButtonClass({
                    isSelected: selectedSeverity === severity,
                    tone: severity === 'warning' || severity === 'critical' ? 'amber' : 'blue',
                    idleClass: 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100',
                  }),
                ].join(' ')}
              >
                Severity: {severity}
              </button>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-neutral-700 transition hover:bg-neutral-100"
              title="Clear all framework, severity, and date filters"
            >
              Clear all filters
            </button>
          </div>
          {error ? <p className="mt-3 text-sm font-medium text-amber-700">{error} Showing demo archive data.</p> : null}
        </div>

        <AlertArchiveList alerts={visibleAlerts} />
      </section>

      <FooterInfoCard title="Governance note" accent="blue">
        This archive page follows the same separation-of-concerns approach as the rest of the app: page layout remains in the route, archive rendering stays in the reusable list component, and demo alert content is sourced from shared frontend data. This keeps the page easy to extend later with real backend-backed alert history.
      </FooterInfoCard>
    </div>
  );
};

export default AlertArchivePage;