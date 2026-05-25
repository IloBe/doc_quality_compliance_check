import React from 'react';
import { LuLayoutDashboard } from 'react-icons/lu';
import type { BridgeRuntimeTopology } from '../../lib/bridgeClient';
import { formatDateTime } from '../../lib/dateTime';

type BridgeSystemStatusCardProps = {
  topology: BridgeRuntimeTopology | null;
  loading: boolean;
  error: string | null;
};

const BridgeSystemStatusCard = ({ topology, loading, error }: BridgeSystemStatusCardProps) => {
  const agentCount = topology?.agents.length ?? 0;
  const healthyAgents = topology?.agents.filter((item) => item.health_status.toLowerCase() === 'healthy').length ?? 0;
  const runtimeSource = topology?.topology_source || 'n/a';
  const checkedAt = topology ? formatDateTime(topology.checked_at) : 'n/a';
  const strictProof = topology?.explicitly_proven === true;
  const cardTone = strictProof ? 'emerald' : 'amber';
  const toneBoxClass =
    cardTone === 'emerald'
      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
      : 'bg-amber-50 border-amber-100 text-amber-700';
  const toneValueClass = cardTone === 'emerald' ? 'text-emerald-700' : 'text-amber-700';

  return (
    <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-xl overflow-hidden p-10">
      <div className="flex items-start justify-between mb-12">
        <div className="max-w-md">
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight mb-4 flex items-center gap-3">
            <LuLayoutDashboard className="text-blue-500" />
            Dynamic Agent Routing
          </h2>
          {loading ? (
            <p className="text-neutral-500 font-medium leading-relaxed italic">
              Live runtime topology check is in progress.
            </p>
          ) : (
            <p className="text-neutral-500 font-medium leading-relaxed italic">
              Live bridge runtime topology proof for orchestrator-managed, containerized agent sandboxes.
            </p>
          )}
        </div>
        <div className={`border px-6 py-4 rounded-3xl ${toneBoxClass}`}>
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-black uppercase tracking-widest mb-1">Infrastructure Status</span>
            <span className={`text-sm font-bold ${toneValueClass}`}>
              {strictProof ? 'Topology Proven' : 'Topology Attention Needed'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-12 text-center">
        <div className="flex-1 space-y-2">
          <div className="text-5xl font-black text-neutral-900 tracking-tighter">{agentCount}</div>
          <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Agent Containers</div>
        </div>
        <div className="w-px h-16 bg-neutral-100" />
        <div className="flex-1 space-y-2">
          <div className="text-5xl font-black text-neutral-900 tracking-tighter">{healthyAgents}</div>
          <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Healthy Containers</div>
        </div>
        <div className="w-px h-16 bg-neutral-100" />
        <div className="flex-1 space-y-2">
          <div className="text-2xl font-black text-neutral-900 tracking-tight break-words">{runtimeSource}</div>
          <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Proof Source</div>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Runtime topology proof</div>
        {error ? (
          <p className="text-sm text-rose-700 leading-relaxed">
            {error}
          </p>
        ) : topology ? (
          <div className="space-y-2">
            <p className="text-sm text-blue-800 leading-relaxed">
              Checked at {checkedAt}. Orchestrator: {topology.orchestrator_name} ({topology.orchestrator_mode}).
            </p>
            {topology.issues.length > 0 ? (
              <ul className="text-xs text-blue-800 list-disc pl-5 space-y-1">
                {topology.issues.slice(0, 3).map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-blue-800">
                All 4 bridge agents are running in isolated orchestrated containers.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-blue-800 leading-relaxed">
            Runtime topology data is not available yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default BridgeSystemStatusCard;

