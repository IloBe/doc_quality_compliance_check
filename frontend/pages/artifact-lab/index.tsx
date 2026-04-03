import Link from 'next/link';
import React, { useMemo } from 'react';
import { LuArrowRight, LuBookOpenText, LuClock3, LuFlaskConical, LuFolderOpen } from 'react-icons/lu';
import { getButtonClass } from '../../components/buttonStyles';
import FooterInfoCard from '../../components/FooterInfoCard';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';
import { buildArtifactRunCards } from '../../lib/artifactLabViewModel';
import { useMockStore } from '../../lib/mockStore';

const ArtifactLabIndexPage = () => {
  const runs = useMockStore((state) => state.bridgeRuns);
  const docs = useMockStore((state) => state.documents);

  const runCards = useMemo(() => {
    return buildArtifactRunCards(runs, docs);
  }, [docs, runs]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Generation & Push"
        title="Artifact Lab"
        subtitle="Select a Bridge run to generate, refine and export audit-ready artifacts."
        whyDescription="Artifact Lab transforms Bridge findings into usable governance artifacts. It connects generated content, regulatory citations, and export flows so teams can move from analysis to auditable deliverables with full traceability."
      />

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700 font-semibold">
        Demo mode: run cards are derived from the existing Bridge runs and document data in the app.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Runs Available</span>
            <LuFlaskConical className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{runCards.length}</div>
          <div className="text-xs text-neutral-500 mt-1">Bridge runs ready for artifact work</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Done Runs</span>
            <LuBookOpenText className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{runCards.filter((r) => r.status === 'Done').length}</div>
          <div className="text-xs text-neutral-500 mt-1">Best candidates for final artifacts</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">In Progress</span>
            <LuClock3 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{runCards.filter((r) => r.status === 'Running').length}</div>
          <div className="text-xs text-neutral-500 mt-1">Artifacts can still be drafted</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Document Links</span>
            <LuFolderOpen className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{docs.length}</div>
          <div className="text-xs text-neutral-500 mt-1">Available as generation source</div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
        <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500 mb-4">Run Selection</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest text-neutral-400 border-b border-neutral-100">
              <th className="py-2 pr-4">Run</th>
              <th className="py-2 pr-4">Product</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Latest Document</th>
              <th className="py-2 pr-4">Evidence</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {runCards.map((run) => (
              <tr key={run.runId} className="border-b border-neutral-50 align-top">
                <td className="py-3 pr-4">
                  <div className="font-bold text-neutral-800">{run.runId}</div>
                  <div className="text-[11px] text-neutral-400">Started: {run.startedAt}</div>
                </td>
                <td className="py-3 pr-4 text-neutral-700 font-semibold">{run.product}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                      run.status === 'Done'
                        ? 'bg-emerald-100 text-emerald-700'
                        : run.status === 'Running'
                          ? 'bg-blue-100 text-blue-700'
                          : run.status === 'Error'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {run.status}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <div className="font-semibold text-neutral-700">{run.latestDocTitle}</div>
                  <div className="text-[11px] text-neutral-400">{run.latestDocId}</div>
                </td>
                <td className="py-3 pr-4 text-neutral-600 font-semibold">{run.evidenceCount}</td>
                <td className="py-3">
                  <Link
                    href={`/artifact-lab/${encodeURIComponent(run.runId)}`}
                    className={getButtonClass({ variant: 'primary', size: 'sm' })}
                  >
                    Open Lab
                    <LuArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {runCards.length === 0 && <div className="py-8 text-sm text-neutral-500">No Bridge runs available yet.</div>}
      </div>

      <FooterInfoCard title="Governance note" accent="blue">
        Artifact Lab is connected to existing runs and documents to keep demo data coherent. Open a run to access split-view editing, citations, Ask the Author, and export actions.
      </FooterInfoCard>
    </div>
  );
};

export default ArtifactLabIndexPage;
