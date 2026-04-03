import React, { useEffect, useMemo, useState } from 'react';
import { LuInfo, LuLoader } from 'react-icons/lu';
import KpiGrid from '../components/dashboard/KpiGrid';
import RiskDistributionCard from '../components/dashboard/RiskDistributionCard';
import StandardsCoverageTable from '../components/dashboard/StandardsCoverageTable';
import TimeframeSelector from '../components/dashboard/TimeframeSelector';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import { buildMockDashboardSummary, getRiskTotal } from '../lib/dashboardSummaryBuilder';
import { useMockStore } from '../lib/mockStore';
import { DashboardSummary, DashboardTimeframe, fetchDashboardSummary } from '../lib/dashboardClient';

const DashboardPage = () => {
  const documents = useMockStore((state) => state.documents);
  const exports = useMockStore((state) => state.exports);
  const bridgeRuns = useMockStore((state) => state.bridgeRuns);

  const [timeframe, setTimeframe] = useState<DashboardTimeframe>('month');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return buildMockDashboardSummary(documents, exports, bridgeRuns, timeframe);
  }, [bridgeRuns, documents, exports, timeframe]);

  const effectiveSummary = useMemo(() => {
    if (!useBackendData) {
      return mockSummary;
    }
    return summary ?? mockSummary;
  }, [mockSummary, summary, useBackendData]);

  const riskTotal = useMemo(() => {
    return getRiskTotal(effectiveSummary);
  }, [effectiveSummary]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Quality & Audit Insights"
        title="Dashboard"
        subtitle="Operational overview for document compliance, risk and audit readiness."
        whyDescription="The Dashboard provides audit-readiness visibility at a glance. It consolidates document status, risk class, and pass/fail control results so stakeholders can prioritize remediation and make release decisions using evidence, not assumptions."
        rightContent={
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        }
      />

      {useBackendData && isLoading && !summary && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center gap-3 text-neutral-600">
          <LuLoader className="w-5 h-5 animate-spin" />
          Loading dashboard analytics...
        </div>
      )}

      {useBackendData && error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800 flex items-start gap-2">
          <LuInfo className="w-4 h-4 mt-0.5" />
          <div>
            <div className="font-semibold">Live analytics currently unavailable. Showing demo-consistent dataset.</div>
            <div className="mt-1">{error}</div>
          </div>
        </div>
      )}

      {!useBackendData && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-xs text-blue-700 font-semibold">
          Demo mode: Dashboard uses the same mock dataset as Doc Hub. Set NEXT_PUBLIC_DASHBOARD_SOURCE=backend for live aggregation.
        </div>
      )}

      {useBackendData && !error && summary && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-xs text-emerald-700 font-semibold">
          Live mode: Dashboard values are loaded from backend aggregation endpoint.
        </div>
      )}

      {effectiveSummary && (
        <>

      <KpiGrid summary={effectiveSummary} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <RiskDistributionCard summary={effectiveSummary} riskTotal={riskTotal} />
        <StandardsCoverageTable summary={effectiveSummary} />
      </div>

      <FooterInfoCard title="Governance note" accent="blue">
        Focus: operational KPIs, risk distribution, cycle-time and standards evidence. For deeper analysis, use Document Hub and Auditor Vault.
      </FooterInfoCard>
      </>
      )}
    </div>
  );
};

export default DashboardPage;
