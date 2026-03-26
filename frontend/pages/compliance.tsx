
import React from 'react';
import { 
  LuShieldCheck, 
  LuFileCheck, 
  LuCircleAlert, 
  LuCpu, 
  LuGlobe, 
  LuMicrochip,
  LuExternalLink,
  LuChevronRight,
  LuBookOpen,
  LuCircleCheck
} from 'react-icons/lu';

const ComplianceStandards = () => {
  const standards = [
    { 
      id: 'ISO27001', 
      title: 'ISO/IEC 27001:2022', 
      desc: 'Information security, cybersecurity and privacy protection.', 
      status: 'Active',
      color: 'blue'
    },
    { 
      id: 'GDPR', 
      title: 'EU GDPR / BDSG', 
      desc: 'General Data Protection Regulation for document handling.', 
      status: 'Active',
      color: 'emerald'
    },
    { 
      id: 'SOC2', 
      title: 'SOC 2 Type II', 
      desc: 'Trust Services Criteria: Security, Availability, Integrity.', 
      status: 'In Review',
      color: 'amber'
    },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Overview Header */}
      <div className="max-w-2xl">
         <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Compliance Mapping System</span>
         </div>
         <h1 className="text-5xl font-black text-neutral-900 tracking-tighter mb-4 leading-none">Global Governance.</h1>
         <p className="text-lg text-neutral-500 font-medium leading-relaxed">
           Manage the regulatory schemas used by agents to validate documents. 
           Connect to Perplexity-enhanced research nodes for real-time compliance updates.
         </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
         <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {standards.map((s, idx) => (
                <div key={idx} className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden group">
                   <div className="flex items-start justify-between mb-8">
                      <div className={`w-12 h-12 rounded-2xl bg-${s.color}-50 flex items-center justify-center text-${s.color}-600`}>
                         <LuShieldCheck className="w-6 h-6" />
                      </div>
                      <div className={`px-3 py-1 bg-${s.color}-100 text-${s.color}-700 text-[10px] font-black uppercase rounded-full`}>
                         {s.status}
                      </div>
                   </div>
                   
                   <h3 className="text-xl font-black text-neutral-900 mb-2">{s.title}</h3>
                   <p className="text-sm font-medium text-neutral-400 mb-8 line-clamp-2 italic">{s.desc}</p>
                   
                   <div className="flex items-center justify-between pt-6 border-t border-neutral-50">
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900 text-xs">
                         <LuCpu className="w-4 h-4 text-blue-500" />
                         Agent Verified
                      </div>
                      <LuChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-900 transition translate-x-0 group-hover:translate-x-1" />
                   </div>
                </div>
              ))}
              
              <div className="bg-neutral-900 rounded-[2.5rem] p-10 flex flex-col justify-center items-center text-center space-y-6 shadow-2xl relative overflow-hidden ring-4 ring-neutral-900/5 transition group hover:-translate-y-1 duration-500">
                 <div className="absolute top-0 right-0 p-8 opacity-20">
                    <LuGlobe className="w-24 h-24 text-white" />
                 </div>
                 <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-4">
                    <LuFileCheck className="w-8 h-8" />
                 </div>
                 <h4 className="text-xl font-black text-white leading-tight">Request New Standard Mapping</h4>
                 <p className="text-xs text-neutral-400 font-medium px-4 opacity-70">
                   Submit a specific SOP or regulatory requirement for agent training.
                 </p>
                 <button className="w-full py-4 bg-white text-neutral-900 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 hover:text-white transition shadow-lg">
                    Contact Architect
                 </button>
              </div>
            </div>
         </div>

         {/* Sidebar Stats / Info */}
         <div className="space-y-6">
            <div className="bg-white rounded-[2rem] p-8 border border-neutral-100 shadow-xl overflow-hidden relative">
               <div className="bg-emerald-50 text-emerald-600 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-6">
                  <LuCircleCheck className="w-3.5 h-3.5" />
                  Real-time Feed Active
               </div>
               
               <h3 className="text-lg font-black text-neutral-900 mb-4 tracking-tight">Recent Compliance Alerts</h3>
               <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 p-4 hover:bg-neutral-50 rounded-2xl transition cursor-pointer border border-transparent hover:border-neutral-100">
                       <div className="mt-1">
                          <LuCircleAlert className="w-4 h-4 text-amber-500" />
                       </div>
                       <div className="space-y-1">
                          <p className="text-xs font-bold text-neutral-800 leading-tight">ISO 27001 Amendment v24.2 released.</p>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-tighter">Updated 2h ago &bull; Public Source</p>
                       </div>
                    </div>
                  ))}
               </div>
               
               <div className="mt-8 pt-8 border-t border-neutral-50">
                  <button className="flex items-center justify-between w-full text-[11px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition">
                     View Alert Archive
                     <LuExternalLink className="w-4 h-4" />
                  </button>
               </div>
            </div>

            <div className="bg-blue-50/50 rounded-[2rem] p-8 border border-blue-100/50">
               <div className="flex items-center gap-3 mb-4">
                  <LuBookOpen className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-blue-900 tracking-tight">Governance Manual</span>
               </div>
               <p className="text-xs text-blue-700/70 font-medium leading-relaxed mb-6">
                  Phase 0 Note: Live regulatory updates require a valid PERPLEXITY_API_KEY in the backend environment.
               </p>
               <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
                  <div className="w-2/3 h-full bg-blue-500 rounded-full" />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ComplianceStandards;
