import React from 'react';
import { LuLayoutDashboard } from 'react-icons/lu';

const BridgeSystemStatusCard = () => {
  return (
    <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-xl overflow-hidden p-10">
      <div className="flex items-start justify-between mb-12">
        <div className="max-w-md">
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight mb-4 flex items-center gap-3">
            <LuLayoutDashboard className="text-blue-500" />
            Dynamic Agent Routing
          </h2>
          <p className="text-neutral-500 font-medium leading-relaxed italic">
            "Phase 0 Mock: The Bridge system automatically distributes document artifacts to specialized personas based on identified schema headers."
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-3xl">
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Infrastructure Status</span>
            <span className="text-sm font-bold text-neutral-800">Operational: CrewAI Node CL-04</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-12 text-center">
        <div className="flex-1 space-y-2">
          <div className="text-5xl font-black text-neutral-900 tracking-tighter">0.8s</div>
          <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">P50 Latency</div>
        </div>
        <div className="w-px h-16 bg-neutral-100" />
        <div className="flex-1 space-y-2">
          <div className="text-5xl font-black text-neutral-900 tracking-tighter">100%</div>
          <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Audit Integrity</div>
        </div>
        <div className="w-px h-16 bg-neutral-100" />
        <div className="flex-1 space-y-2">
          <div className="text-5xl font-black text-neutral-900 tracking-tighter">24</div>
          <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Active Credits</div>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">HITL handoff</div>
        <p className="text-sm text-blue-800 leading-relaxed">
          After the Quality Gate step is finished on the run page, a mandatory human approval/rejection block appears with required reason and follow-up task proposal.
        </p>
      </div>
    </div>
  );
};

export default BridgeSystemStatusCard;
