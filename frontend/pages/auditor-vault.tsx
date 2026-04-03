import React, { useMemo, useState } from 'react';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import TimeframeSelector from '../components/dashboard/TimeframeSelector';
import { DashboardTimeframe } from '../lib/dashboardClient';
import { useMockStore } from '../lib/mockStore';
import {
  buildVaultEvidenceRows,
  buildVaultSnapshot,
  getHealthBadgeClass,
} from '../lib/auditorVaultViewModel';

const AuditorVaultPage = () => {
  const documents = useMockStore((state) => state.documents);
  const exports = useMockStore((state) => state.exports);
  const bridgeRuns = useMockStore((state) => state.bridgeRuns);

  const [timeframe, setTimeframe] = useState<DashboardTimeframe>('month');

  const rows = useMemo(
    () => buildVaultEvidenceRows(documents, exports, bridgeRuns, timeframe),
    [documents, exports, bridgeRuns, timeframe],
  );

  const snapshot = useMemo(() => buildVaultSnapshot(rows), [rows]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Pipeline / Evidence Governance"
        title="Auditor Vault"
        subtitle="Central evidence inventory for audit readiness, recency monitoring, and traceable retrieval."
        whyDescription="Auditor Vault is the controlled evidence shelf across documents, exports, and bridge runs. It reduces audit preparation time by giving one consistent place to verify artifact freshness, approval state, and traceability context before formal reviews."
        rightContent={<TimeframeSelector value={timeframe} onChange={setTimeframe} />}
      />

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-xs text-blue-700 font-semibold">
        Vault view is read-only and evidence-oriented: use source pages to edit records, then return here for consolidated audit retrieval.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-500">Total Evidence</p>
          <p className="text-3xl font-black text-neutral-900 mt-2">{snapshot.totalEvidence}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-500">Approved / Ready</p>
          <p className="text-3xl font-black text-emerald-700 mt-2">{snapshot.approvedArtifacts}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-500">Pending Review</p>
          <p className="text-3xl font-black text-amber-700 mt-2">{snapshot.pendingReviews}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-500">Readiness Score</p>
          <p className="text-3xl font-black text-blue-700 mt-2">{snapshot.readinessScore}%</p>
          <p className="text-xs text-neutral-500 mt-1">Stale items in window: {snapshot.staleEvidence}</p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-600">Evidence inventory</h2>
          <p className="text-xs text-neutral-500 mt-1">Unified list of governed artifacts across document control, exports, and bridge sessions.</p>
        </div>

        {rows.length === 0 ? (
          <div className="p-6 text-sm text-neutral-500">No evidence rows in selected timeframe.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Health</th>
                  <th className="px-4 py-3 text-left">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.source}-${row.id}`} className="border-t border-neutral-100 hover:bg-neutral-50/70">
                    <td className="px-4 py-3 font-semibold text-neutral-800">{row.id}</td>
                    <td className="px-4 py-3 text-neutral-700">{row.title}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.source}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.product}</td>
                    <td className="px-4 py-3 text-neutral-700">{row.status}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getHealthBadgeClass(row.health)}`}>
                        {row.health}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{row.updatedAt} · {row.updatedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FooterInfoCard title="Governance note" accent="blue">
        Auditor Vault improves audit execution by centralizing evidence retrieval, exposing freshness risk early, and reducing context-switching between operational pages when preparing or defending compliance decisions.
      </FooterInfoCard>
    </div>
  );
};

export default AuditorVaultPage;
