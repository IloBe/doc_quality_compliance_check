import React, { useEffect, useMemo, useState } from 'react';
import {
  LuBriefcase,
  LuCheck,
  LuClock3,
  LuFileText,
  LuInfo,
  LuLoader,
  LuShield,
  LuTrendingUp,
  LuX,
} from 'react-icons/lu';
import { useMockStore } from '../lib/mockStore';
import { DashboardSummary, DashboardTimeframe, fetchDashboardSummary } from '../lib/dashboardClient';
import WhyThisPageMatters from '../components/WhyThisPageMatters';

function parseTimestamp(value: string): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getWindowStart(now: Date, timeframe: DashboardTimeframe): Date {
  const start = new Date(now);
  if (timeframe === 'week') {
    start.setDate(start.getDate() - 7);
  } else if (timeframe === 'month') {
    start.setMonth(start.getMonth() - 1);
  } else {
    start.setFullYear(start.getFullYear() - 1);
  }
  return start;
}

function inferRisk(title: string, type: string): 'High' | 'Limited' | 'Minimal' {
  const text = `${title} ${type}`.toLowerCase();
  if (text.includes('risk') || text.includes('rmf') || text.includes('fmea')) {
    return 'High';
  }
  if (text.includes('architecture') || text.includes('arc42')) {
    return 'Limited';
  }
  return 'Minimal';
}

function deriveChecks(type: string): Array<{ standard: string; article: string; passed: boolean }> {
  const lower = type.toLowerCase();
  if (lower === 'rmf' || lower === 'fmea') {
    return [
      { standard: 'EU AI Act', article: 'Art. 9 (Risk Mgmt)', passed: true },
      { standard: 'EU AI Act', article: 'Art. 14 (Human Oversight)', passed: false },
      { standard: 'ISO 9001', article: 'Clause 6.1 (Risk Actions)', passed: true },
    ];
  }
  if (lower === 'arc42') {
    return [
      { standard: 'EU AI Act', article: 'Annex IV (Technical Docs)', passed: false },
      { standard: 'ISO 27001', article: 'A.8.32 (Change Mgmt)', passed: true },
      { standard: 'ISO 9001', article: 'Clause 8.3 (Design Control)', passed: true },
    ];
  }
  return [
    { standard: 'ISO 9001', article: 'Clause 7.5 (Documented Info)', passed: true },
    { standard: 'EU AI Act', article: 'Art. 12 (Logging)', passed: true },
    { standard: 'ISO 27001', article: 'A.8.15 (Logging)', passed: false },
  ];
}

const DashboardPage = () => {
  const documents = useMockStore((state) => state.documents);
  const exports = useMockStore((state) => state.exports);
  const bridgeRuns = useMockStore((state) => state.bridgeRuns);

  const [timeframe, setTimeframe] = useState<DashboardTimeframe>('month');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWhyThisPageMatters, setShowWhyThisPageMatters] = useState(false);

  // Default to demo mode (same mock source as Doc Hub).
  // Set NEXT_PUBLIC_DASHBOARD_SOURCE=backend to use live aggregation endpoint.
  const useBackendData = process.env.NEXT_PUBLIC_DASHBOARD_SOURCE === 'backend';

  useEffect(() => {
    if (!useBackendData) {
      setIsLoading(false);
      setError(null);
      setSummary(null);
      return;
    }

    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await fetchDashboardSummary(timeframe);
        if (mounted) {
          setSummary(payload);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard analytics');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [timeframe, useBackendData]);

  const mockSummary = useMemo<DashboardSummary>(() => {
    const now = new Date();
    const start = getWindowStart(now, timeframe);
    const inRange = (dt: Date | null) => Boolean(dt && dt >= start && dt <= now);

    const docsInRange = documents.filter((doc) => inRange(parseTimestamp(doc.updatedAt)));
    const exportsInRange = exports.filter((job) => inRange(parseTimestamp(job.createdAt)));

    const rows = docsInRange.map((doc) => {
      const checks = deriveChecks(doc.type);
      const passed = checks.filter((x) => x.passed).length;
      const failed = checks.length - passed;
      const cycleDays = Math.max(1, Math.round((now.getTime() - (parseTimestamp(doc.updatedAt)?.getTime() ?? now.getTime())) / 86400000));

      return {
        document_id: doc.id,
        title: doc.title,
        risk_class: inferRisk(doc.title, doc.type),
        cycle_days: cycleDays,
        passed_checks: passed,
        failed_checks: failed,
        checks,
      };
    });

    const allChecks = rows.flatMap((r) => r.checks);
    const passRate = allChecks.length ? Math.round((allChecks.filter((x) => x.passed).length / allChecks.length) * 100) : 0;
    const avgCycle = rows.length ? Math.round((rows.reduce((acc, row) => acc + row.cycle_days, 0) / rows.length) * 10) / 10 : 0;

    return {
      timeframe,
      window_start: start.toISOString(),
      window_end: now.toISOString(),
      kpis: {
        open_documents: docsInRange.filter((d) => d.status !== 'Approved').length,
        closed_documents: docsInRange.filter((d) => d.status === 'Approved').length,
        active_jobs: exportsInRange.filter((e) => e.status === 'Queued' || e.status === 'Running').length,
        closed_jobs: exportsInRange.filter((e) => e.status === 'Ready' || e.status === 'Failed').length,
        avg_cycle_days: avgCycle,
        compliance_pass_rate: passRate,
        bridge_runs_done: bridgeRuns.filter((r) => r.status === 'Done').length,
      },
      risk_distribution: {
        high: rows.filter((r) => r.risk_class === 'High').length,
        limited: rows.filter((r) => r.risk_class === 'Limited').length,
        minimal: rows.filter((r) => r.risk_class === 'Minimal').length,
      },
      documents: rows,
    };
  }, [bridgeRuns, documents, exports, timeframe]);

  const effectiveSummary = useBackendData ? summary : mockSummary;

  const timeframeButtons: Array<{ key: DashboardTimeframe; label: string }> = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
  ];

  const riskTotal = useMemo(() => {
    if (!effectiveSummary) {
      return 0;
    }
    return (
      effectiveSummary.risk_distribution.high +
      effectiveSummary.risk_distribution.limited +
      effectiveSummary.risk_distribution.minimal
    );
  }, [effectiveSummary]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Quality & Audit Insights</div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Dashboard</h1>
            <button
              type="button"
              onClick={() => setShowWhyThisPageMatters((prev) => !prev)}
              className="p-1.5 rounded-full text-neutral-400 hover:text-blue-700 hover:bg-blue-50 transition"
              title="Why this page matters"
            >
              <LuInfo className="w-4 h-4" />
            </button>
          </div>
          <p className="text-neutral-500 font-medium mt-1">Operational overview for document compliance, risk and audit readiness.</p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl p-1 shadow-sm">
          {timeframeButtons.map((item) => {
            const active = timeframe === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTimeframe(item.key)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition ${
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {showWhyThisPageMatters && (
        <WhyThisPageMatters
          description="The Dashboard provides audit-readiness visibility at a glance. It consolidates document status, risk class, and pass/fail control results so stakeholders can prioritize remediation and make release decisions using evidence, not assumptions."
        />
      )}

      {useBackendData && isLoading && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center gap-3 text-neutral-600">
          <LuLoader className="w-5 h-5 animate-spin" />
          Loading dashboard analytics...
        </div>
      )}

      {useBackendData && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!useBackendData && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-xs text-blue-700 font-semibold">
          Demo mode: Dashboard uses the same mock dataset as Doc Hub. Set NEXT_PUBLIC_DASHBOARD_SOURCE=backend for live aggregation.
        </div>
      )}

      {(!useBackendData || (!isLoading && !error)) && effectiveSummary && (
        <>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Open Documents</span>
            <LuFileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{effectiveSummary.kpis.open_documents}</div>
          <div className="text-xs text-neutral-500 mt-1">Closed: {effectiveSummary.kpis.closed_documents}</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Active Jobs</span>
            <LuBriefcase className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{effectiveSummary.kpis.active_jobs}</div>
          <div className="text-xs text-neutral-500 mt-1">Closed: {effectiveSummary.kpis.closed_jobs}</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Avg. Cycle Time</span>
            <LuClock3 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{effectiveSummary.kpis.avg_cycle_days}d</div>
          <div className="text-xs text-neutral-500 mt-1">Bridge runs done: {effectiveSummary.kpis.bridge_runs_done}</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Compliance Pass Rate</span>
            <LuTrendingUp className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{effectiveSummary.kpis.compliance_pass_rate}%</div>
          <div className="text-xs text-neutral-500 mt-1">Within selected timeframe</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500 mb-5 flex items-center gap-2">
            <LuShield className="w-4 h-4 text-blue-600" />
            Risk Classification
          </h2>

          {riskTotal === 0 ? (
            <p className="text-sm text-neutral-500">No classified documents in this timeframe.</p>
          ) : (
            <div className="space-y-4">
              {([
                ['High', effectiveSummary.risk_distribution.high, 'bg-rose-500'],
                ['Limited', effectiveSummary.risk_distribution.limited, 'bg-amber-500'],
                ['Minimal', effectiveSummary.risk_distribution.minimal, 'bg-emerald-500'],
              ] as const).map(([label, value, colorClass]) => {
                const width = Math.max(6, Math.round((value / riskTotal) * 100));
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-neutral-700">{label}</span>
                      <span className="text-neutral-500">{value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div className={`h-full ${colorClass}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-neutral-400 mt-6 leading-relaxed">
            Classification aligns with internal EU AI Act screening categories for audit preparation.
          </p>
        </div>

        <div className="xl:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500 mb-4">Document Standards Coverage</h2>

          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-neutral-400 border-b border-neutral-100">
                <th className="py-2 pr-4">Document</th>
                <th className="py-2 pr-4">Risk</th>
                <th className="py-2 pr-4">Cycle</th>
                <th className="py-2 pr-4">Standards / Articles</th>
                <th className="py-2">Status by Standard</th>
              </tr>
            </thead>
            <tbody>
              {effectiveSummary.documents.map((row) => (
                <tr key={row.document_id} className="border-b border-neutral-50 align-top">
                  <td className="py-3 pr-4">
                    <div className="font-bold text-neutral-800">{row.title}</div>
                    <div className="text-[11px] text-neutral-400">{row.document_id}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                        row.risk_class === 'High'
                          ? 'bg-rose-100 text-rose-700'
                          : row.risk_class === 'Limited'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {row.risk_class}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-neutral-600 font-semibold">{row.cycle_days}d</td>
                  <td className="py-3 pr-4 space-y-1">
                    {row.checks.slice(0, 3).map((check) => (
                      <div
                        key={`${row.document_id}-${check.standard}-${check.article}`}
                        className="h-5 flex items-center text-xs text-neutral-600"
                      >
                        <span className="font-semibold">{check.standard}</span> · {check.article}
                      </div>
                    ))}
                  </td>
                  <td className="py-3">
                    <div className="space-y-1">
                      {row.checks.slice(0, 3).map((check) => (
                        <div
                          key={`${row.document_id}-status-${check.standard}-${check.article}`}
                          className={`h-5 flex items-center gap-1.5 text-xs font-semibold ${
                            check.passed ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {check.passed ? <LuCheck className="w-4 h-4" /> : <LuX className="w-4 h-4" />}
                          <span className="text-neutral-700">{check.standard}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {effectiveSummary.documents.length === 0 && (
            <div className="py-8 text-sm text-neutral-500">No documents found for the selected timeframe.</div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-900 flex items-start gap-3">
        <LuCheck className="w-4 h-4 mt-0.5" />
        <p>
          Focus: operational KPIs, risk distribution, cycle-time and standards evidence. For deeper analysis, use Document Hub and Auditor Vault.
        </p>
      </div>
      </>
      )}
    </div>
  );
};

export default DashboardPage;
