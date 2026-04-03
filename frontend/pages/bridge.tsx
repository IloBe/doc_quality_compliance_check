import React, { useState } from 'react';
import { useRouter } from 'next/router';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import BridgeOverviewStatCard from '../components/bridge/BridgeOverviewStatCard';
import BridgeSystemStatusCard from '../components/bridge/BridgeSystemStatusCard';
import { bridgeOverviewStats } from '../lib/bridgeOverview';
import { reloadBridgeAgents } from '../lib/bridgeClient';
import { 
  LuExternalLink, 
   LuLoader,
  LuRefreshCcw,
} from 'react-icons/lu';

const BridgePage = () => {
   const router = useRouter();
   const [isReloading, setIsReloading] = useState(false);
   const [reloadInfo, setReloadInfo] = useState<string | null>(null);
   const [reloadError, setReloadError] = useState<string | null>(null);

   const useBackendBridge = process.env.NEXT_PUBLIC_BRIDGE_SOURCE === 'backend';

   const handleReloadAgents = async () => {
      setIsReloading(true);
      setReloadInfo(null);
      setReloadError(null);

      if (!useBackendBridge) {
         setReloadInfo('Demo mode: agent runtime was refreshed from mock bridge topology.');
         setIsReloading(false);
         return;
      }

      try {
         const result = await reloadBridgeAgents();
         const readyCount = result.agents.filter((agent) => agent.status.toLowerCase() === 'ready').length;
         setReloadInfo(
            `${result.message} ${readyCount}/${result.agents.length} agents ready. Requirements version: ${result.requirements_version}.`
         );
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Failed to reload bridge agents.';
         setReloadError(message);
      } finally {
         setIsReloading(false);
      }
   };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
         <PageHeaderWithWhy
            eyebrow="Bridge Architecture"
            title="Workflow Orchestration"
            subtitle="Multi-agent orchestration pipeline for document compliance and quality analysis."
            whyDescription="The Bridge page is the orchestration view for document checks. It shows how a document moves through Inspection, Compliance, Research, and final Quality Gate steps. This helps QA, auditors, and product leads verify process sequence, understand decision context, and produce traceable evidence for audits."
            rightContent={
               <div className="flex items-center gap-3">
                  <button
                     type="button"
                     onClick={handleReloadAgents}
                     disabled={isReloading}
                     className={`flex items-center gap-2 px-5 py-3 bg-white border border-neutral-200 text-neutral-600 font-bold rounded-2xl hover:bg-neutral-50 transition uppercase text-[10px] tracking-widest shadow-sm ${
                        isReloading ? 'opacity-60 cursor-not-allowed' : ''
                     }`}
                  >
                     {isReloading ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuRefreshCcw className="w-4 h-4" />}
                     {isReloading ? 'Reloading...' : 'Reload Agents'}
                  </button>
                  <button
                     onClick={() => router.push('/doc/DOC-001/bridge')}
                     className="flex items-center gap-2 px-5 py-3 bg-neutral-900 text-white font-bold rounded-2xl transition hover:bg-blue-600 uppercase text-[10px] tracking-widest"
                  >
                     <LuExternalLink className="w-4 h-4" />
                     Open Demo Bridge Run
                  </button>
               </div>
            }
         />

         {reloadInfo ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
               {reloadInfo}
            </div>
         ) : null}

         {reloadError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
               {reloadError}
            </div>
         ) : null}

      {/* Hero: Live Agent Mesh Visualization Stub */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {bridgeOverviewStats.map((stat) => (
           <BridgeOverviewStatCard key={stat.id} stat={stat} />
         ))}
      </div>

      <BridgeSystemStatusCard />

         <FooterInfoCard title="Governance note" accent="blue">
             Bridge orchestrates the controlled analysis sequence. Any downstream approval or rejection decision should reference the corresponding pipeline evidence and session trace.
         </FooterInfoCard>
    </div>
  );
};

export default BridgePage;
