
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import WhyThisPageMatters from '../components/WhyThisPageMatters';
import { 
  LuFileSearch, 
  LuShieldAlert, 
  LuLayers, 
  LuExternalLink, 
   LuInfo,
  LuRefreshCcw,
  LuLayoutDashboard,
  LuCpu
} from 'react-icons/lu';

const WorkflowInsight = () => {
   const router = useRouter();
   const [showWhyThisPageMatters, setShowWhyThisPageMatters] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Overview Header */}
      <div className="flex items-center justify-between">
        <div>
               <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Bridge Architecture</div>
               <div className="flex items-center gap-2">
                  <h1 className="text-4xl font-black text-neutral-900 tracking-tighter">Workflow Orchestration</h1>
                  <button
                     type="button"
                     onClick={() => setShowWhyThisPageMatters((prev) => !prev)}
                     className="p-1.5 rounded-full text-neutral-400 hover:text-blue-700 hover:bg-blue-50 transition"
                     title="Why this page matters"
                  >
                     <LuInfo className="w-4 h-4" />
                  </button>
               </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-5 py-3 bg-white border border-neutral-200 text-neutral-600 font-bold rounded-2xl hover:bg-neutral-50 transition uppercase text-[10px] tracking-widest shadow-sm">
              <LuRefreshCcw className="w-4 h-4" />
              Reload Agents
           </button>
           <button
             onClick={() => router.push('/doc/DOC-001/bridge')}
             className="flex items-center gap-2 px-5 py-3 bg-neutral-900 text-white font-bold rounded-2xl transition hover:bg-blue-600 uppercase text-[10px] tracking-widest"
           >
              <LuExternalLink className="w-4 h-4" />
              Open Demo Bridge Run
           </button>
        </div>
      </div>

         {showWhyThisPageMatters && (
            <WhyThisPageMatters
               description="The Bridge page is the orchestration view for document checks. It shows how a document moves through Inspection, Compliance, Research, and final Quality Gate steps. This helps QA, auditors, and product leads verify process sequence, understand decision context, and produce traceable evidence for audits."
            />
         )}

      {/* Hero: Live Agent Mesh Visualization Stub */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { icon: LuFileSearch, title: 'Inspection', count: 12, color: 'blue' },
           { icon: LuShieldAlert, title: 'Compliance', count: 8, color: 'amber' },
           { icon: LuLayers, title: 'Template Core', count: 4, color: 'emerald' },
           { icon: LuCpu, title: 'Research RAG', count: 21, color: 'rose' }
         ].map((stat, i) => (
           <div key={i} className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm hover:shadow-xl transition duration-500">
              <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-500 mb-6`}>
                 <stat.icon className="w-7 h-7" />
              </div>
              <div className="flex items-end justify-between">
                 <div>
                    <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-1">{stat.title}</h3>
                    <p className="text-4xl font-black text-neutral-900 tracking-tighter">{stat.count}</p>
                 </div>
                 <div className={`px-2 py-1 bg-${stat.color}-100 text-${stat.color}-600 text-[10px] font-black rounded-lg uppercase tracking-tighter`}>
                    +15%
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* System Status */}
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
      </div>
    </div>
  );
};

export default WorkflowInsight;
