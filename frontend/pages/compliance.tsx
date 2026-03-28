
import React, { useState } from 'react';
import WhyThisPageMatters from '../components/WhyThisPageMatters';
import { 
  LuShieldCheck, 
  LuFileCheck, 
  LuCircleAlert, 
  LuCpu, 
  LuGlobe, 
  LuExternalLink,
  LuChevronRight,
  LuBookOpen,
   LuCircleCheck,
   LuInfo
} from 'react-icons/lu';
import Link from 'next/link';


const ComplianceStandards = () => {
   const [showWhyThisPageMatters, setShowWhyThisPageMatters] = useState(false);

   // Standards and directives as per login page and PRD
   const standards = [
      {
         id: 'EUAIACT',
         title: 'EU AI Act (2024/1689)',
         desc: 'Comprehensive regulation for trustworthy AI systems. Risk-based obligations, transparency, and human oversight. Applies to all AI systems in the EU.',
         status: 'Active',
         color: 'violet',
         url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj'
      },
      {
         id: 'GDPR',
         title: 'EU GDPR / BDSG',
         desc: 'General Data Protection Regulation for document handling and privacy. Applies to all personal data processing in the EU.',
         status: 'Active',
         color: 'emerald',
         url: 'https://gdpr-info.eu/'
      },
      {
         id: 'ISO9001',
         title: 'ISO 9001:2015',
         desc: 'Quality management systems. Requirements for consistent product and service quality.',
         status: 'Active',
         color: 'blue',
         url: 'https://www.iso.org/iso-9001-quality-management.html'
      },
      {
         id: 'ISO27001',
         title: 'ISO/IEC 27001:2022',
         desc: 'Information security, cybersecurity and privacy protection.',
         status: 'Active',
         color: 'cyan',
         url: 'https://www.iso.org/isoiec-27001-information-security.html'
      },
      {
         id: 'NIS2',
         title: 'NIS2 Directive',
         desc: 'EU-wide cybersecurity requirements for essential and important entities. Applies to digital infrastructure and service providers.',
         status: 'Active',
         color: 'amber',
         url: 'https://digital-strategy.ec.europa.eu/en/policies/nis2-directive'
      },
      {
         id: 'MDR',
         title: 'EU MDR (Medical Devices)',
         desc: 'Regulation for medical devices/software. Applies only if document/SOP handling is for medical device/software. Note: Use only for medical domain.',
         status: 'Conditional',
         color: 'rose',
         url: 'https://eur-lex.europa.eu/eli/reg/2017/745/oj'
      },
   ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
         {/* Overview Header (dashboard style) */}
         <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
               <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Governance & Standards</div>
               <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Compliance Standards</h1>
                  <button
                     type="button"
                     onClick={() => setShowWhyThisPageMatters((prev) => !prev)}
                     className="p-1.5 rounded-full text-neutral-400 hover:text-blue-700 hover:bg-blue-50 transition"
                     title="Why this page matters"
                  >
                     <LuInfo className="w-4 h-4" />
                  </button>
               </div>
               <p className="text-neutral-500 font-medium mt-1">
                  This page lists the regulatory standards and mappings used for governance checks. It provides a transparent basis for agent-driven compliance validation and audit traceability.
               </p>
            </div>
         </div>

         {showWhyThisPageMatters && (
            <WhyThisPageMatters
               description="The Compliance page defines which standards and regulatory mappings are active for checks. It helps governance teams align validation rules with current obligations and gives reviewers a clear basis for pass/fail interpretation."
            />
         )}

         <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Main content */}
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
                        <h3 className="text-xl font-black text-neutral-900 mb-2 flex items-center gap-2">
                           {s.title}
                           <a href={s.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:underline" title="Open standard">
                              <LuExternalLink className="w-4 h-4 inline" />
                           </a>
                        </h3>
                                    <p className="text-sm font-medium text-neutral-400 mb-8 line-clamp-2 italic">{s.desc}</p>
                                    {/* No note for MDR card as requested */}
                                    <div className="flex-grow" />
                                    <div className="flex items-center justify-between pt-6 border-t border-neutral-50 mt-auto">
                                       <div className="flex items-center gap-1.5 font-bold text-neutral-900 text-xs">
                                          <LuCpu className="w-4 h-4 text-blue-500" />
                                          Agent Verified
                                       </div>
                                       <LuChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-900 transition translate-x-0 group-hover:translate-x-1" />
                                    </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Sidebar Stats / Info */}
            <div className="space-y-6">
            <div className="bg-white rounded-[2rem] p-6 border border-neutral-100 shadow-md overflow-hidden relative min-h-[200px] flex flex-col justify-between">
               <div className="bg-emerald-50 text-emerald-600 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-6">
                  <LuCircleCheck className="w-3.5 h-3.5" />
                  Real-time Feed Active
               </div>
               
                      <h3 className="text-lg font-black text-neutral-900 mb-4 tracking-tight">Recent Compliance Alerts</h3>
                      <div className="space-y-4">
                         {/* Example grouped and deduplicated alerts, newest first */}
                         <div className="flex gap-4 p-4 hover:bg-neutral-50 rounded-2xl transition cursor-pointer border border-transparent hover:border-neutral-100">
                            <div className="mt-1">
                               <LuCircleAlert className="w-4 h-4 text-violet-600" />
                            </div>
                            <div className="space-y-1">
                               <p className="text-xs font-bold text-neutral-800 leading-tight">EU AI Act: Final text published. Applies from August 2026.</p>
                               <p className="text-[10px] text-neutral-400 uppercase tracking-tighter">Updated 1d ago &bull; Official Journal</p>
                            </div>
                         </div>
                         <div className="flex gap-4 p-4 hover:bg-neutral-50 rounded-2xl transition cursor-pointer border border-transparent hover:border-neutral-100">
                            <div className="mt-1">
                               <LuCircleAlert className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="space-y-1">
                               <p className="text-xs font-bold text-neutral-800 leading-tight">GDPR: EDPB guidance on AI data minimization published.</p>
                               <p className="text-[10px] text-neutral-400 uppercase tracking-tighter">Updated 3d ago &bull; EDPB</p>
                            </div>
                         </div>
                         <div className="flex gap-4 p-4 hover:bg-neutral-50 rounded-2xl transition cursor-pointer border border-transparent hover:border-neutral-100">
                            <div className="mt-1">
                               <LuCircleAlert className="w-4 h-4 text-cyan-600" />
                            </div>
                            <div className="space-y-1">
                               <p className="text-xs font-bold text-neutral-800 leading-tight">ISO/IEC 27001:2022 — Amendment v24.2 released.</p>
                               <p className="text-[10px] text-neutral-400 uppercase tracking-tighter">Updated 2h ago &bull; ISO</p>
                            </div>
                         </div>
                         {/* If more than 2 alerts for same standard/article, show summary */}
                         <div className="flex gap-4 p-4 hover:bg-neutral-50 rounded-2xl transition cursor-pointer border border-transparent hover:border-neutral-100">
                            <div className="mt-1">
                               <LuCircleAlert className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="space-y-1">
                               <p className="text-xs font-bold text-neutral-800 leading-tight">ISO 9001: Multiple recent updates detected. <a href="https://www.iso.org/iso-9001-quality-management.html" className="text-blue-500 underline ml-1" target="_blank" rel="noopener noreferrer">See all</a></p>
                               <p className="text-[10px] text-neutral-400 uppercase tracking-tighter">3 updates in last 6 months</p>
                            </div>
                         </div>
                      </div>
               
               <div className="mt-8 pt-8 border-t border-neutral-50">
                  <button className="flex items-center justify-between w-full text-[11px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition">
                     View Alert Archive
                     <LuExternalLink className="w-4 h-4" />
                  </button>
               </div>
            </div>

                  <div className="bg-blue-50/50 rounded-[2rem] p-8 border border-blue-100/50 flex flex-col items-start">
                     <div className="flex items-center gap-3 mb-4">
                        <LuBookOpen className="w-5 h-5 text-blue-600" />
                        <Link
                           href="/doc/governance-manual"
                           className="font-bold text-blue-900 tracking-tight underline hover:text-blue-700"
                           title="Open full Governance Manual"
                        >
                           Governance Manual
                        </Link>
                     </div>
                     <p className="text-xs text-blue-700/70 font-medium leading-relaxed mb-4">
                        Phase 0 Note: Live regulatory updates require a valid PERPLEXITY_API_KEY in the backend environment.
                     </p>
                     <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-bold text-blue-900">100% Complete</span>
                        <div className="w-20 h-2 bg-blue-100 rounded-full overflow-hidden">
                           <div className="w-full h-full bg-blue-500 rounded-full" />
                        </div>
                     </div>
                  </div>
            {/* Request New Standard Mapping - now below Governance Manual */}
            <div className="bg-blue-50/50 rounded-[2rem] p-4 border border-blue-100/50 flex flex-col items-center text-center space-y-2 shadow-sm relative overflow-hidden mt-2">
              <div className="flex items-center gap-2 mb-1">
                <LuFileCheck className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-blue-900 tracking-tight text-sm">Request New Standard Mapping</span>
              </div>
              <p className="text-xs text-blue-700/70 font-medium leading-relaxed mb-1">
                Submit a specific SOP or regulatory requirement for agent training.
              </p>
              <button className="w-full py-1.5 bg-blue-100 text-blue-700 text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-blue-200 transition border border-blue-200 shadow-sm">
                Contact Architect
              </button>
            </div>
            </div>
         </div>
      </div>
   );
};

export default ComplianceStandards;
