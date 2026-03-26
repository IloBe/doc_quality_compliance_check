
import React from 'react';
import { 
  LuFilePlus, 
  LuFilter, 
  LuLayoutGrid, 
  LuList, 
  LuSearch, 
  LuChevronRight,
  LuLock,
  LuLockOpen,
  LuClock,
  LuEllipsisVertical,
  LuArrowUpRight
} from 'react-icons/lu';
import { useMockStore } from '../lib/mockStore';
import { useCan } from '../lib/authContext';

const DocumentHub = () => {
  const documents = useMockStore(state => state.documents);
  const acquireLock = useMockStore(state => state.acquireLock);
  const canEditDocuments = useCan('doc.edit');
  const canRunBridge = useCan('bridge.run');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft': return 'bg-neutral-100 text-neutral-500';
      case 'In Review': return 'bg-amber-100 text-amber-600';
      case 'Approved': return 'bg-emerald-100 text-emerald-600';
      case 'Needs Revision': return 'bg-rose-100 text-rose-600';
      default: return 'bg-neutral-100 text-neutral-400';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Stats */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight mb-2">Document Hub</h1>
          <p className="text-neutral-500 font-medium">Manage and monitor technical documentation compliance.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex bg-white rounded-xl p-1 shadow-sm border border-neutral-200">
             <button className="p-2 bg-neutral-100 text-neutral-800 rounded-lg shadow-inner">
                <LuLayoutGrid className="w-5 h-5" />
             </button>
             <button className="p-2 text-neutral-400 hover:text-neutral-600 transition">
                <LuList className="w-5 h-5" />
             </button>
           </div>
           <button
             disabled={!canEditDocuments}
             title={canEditDocuments ? 'Upload Document' : 'Insufficient role permissions'}
             className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition uppercase text-xs tracking-widest ${
               canEditDocuments
                 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                 : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
             }`}
           >
              <LuFilePlus className="w-4 h-4" />
              Upload Document
           </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-white shadow-xl shadow-neutral-100/50">
         <div className="flex items-center gap-2">
            <div className="relative">
               <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
               <input 
                 type="text" 
                 placeholder="Filter by title..."
                 className="bg-white border border-neutral-100 pl-10 pr-4 py-2 rounded-xl text-sm w-64 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition"
               />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-neutral-500 font-bold text-xs uppercase hover:bg-white rounded-xl transition">
               <LuFilter className="w-4 h-4" />
               Status: All
            </button>
         </div>
         <div className="text-[10px] font-black text-neutral-300 uppercase tracking-[0.2em] pr-4">
            Total {documents.length} Assets
          </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {documents.map((doc) => (
          <div 
            key={doc.id} 
            className="group relative bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-300 hover:-translate-y-1"
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-6">
               <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusBadge(doc.status)}`}>
                  {doc.status}
               </div>
               <button className="p-2 text-neutral-300 hover:text-neutral-800 hover:bg-neutral-50 rounded-xl transition">
                  <LuEllipsisVertical className="w-5 h-5" />
               </button>
            </div>

            {/* Content */}
            <h3 className="text-xl font-black text-neutral-800 tracking-tight mb-2 group-hover:text-blue-600 transition">
              {doc.title}
            </h3>
            
            <div className="flex items-center gap-4 text-neutral-400 text-[11px] font-bold uppercase tracking-tighter mb-6">
               <span className="flex items-center gap-1.5 bg-neutral-50 px-2 py-0.5 rounded">
                  ID: {doc.id}
               </span>
               <span className="flex items-center gap-1.5">
                  <LuClock className="w-3 h-3" /> Updated: {doc.updatedAt}
               </span>
            </div>

            {/* Metadata / Owner */}
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl mb-6">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                    {doc.updatedBy?.[0] ?? '?'}
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-neutral-800 leading-none mb-0.5">{doc.updatedBy ?? 'Unknown'}</span>
                     <span className="text-[9px] text-neutral-400 uppercase font-medium">Lead Author</span>
                  </div>
               </div>
               
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-neutral-800 leading-none mb-0.5">{doc.type}</span>
                  <span className="text-[9px] text-neutral-400 uppercase font-medium">Schema</span>
               </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
               <button 
                 onClick={() => acquireLock(doc.id)}
                 disabled={doc.lockedBy !== null || !canEditDocuments}
                 title={!canEditDocuments ? 'Insufficient role permissions' : undefined}
                 className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition shadow-sm ${
                   doc.lockedBy || !canEditDocuments
                    ? 'bg-amber-50 text-amber-600 border border-amber-100 cursor-not-allowed' 
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50 active:scale-95'
                 }`}
               >
                  {doc.lockedBy ? (
                    <>
                      <LuLock className="w-3.5 h-3.5" />
                      Locked by {doc.lockedBy === 'system-process' ? 'System' : doc.lockedBy}
                    </>
                  ) : (
                    <>
                      <LuLockOpen className="w-3.5 h-3.5" />
                      Acquire Lock
                    </>
                  )}
               </button>
               
               <a 
                 href={canRunBridge ? `/doc/${doc.id}/bridge` : '#'}
                 aria-disabled={!canRunBridge}
                 title={canRunBridge ? 'Open Bridge workflow' : 'Insufficient role permissions'}
                 className={`p-3 rounded-xl transition shadow-lg group/btn ${
                   canRunBridge
                     ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                     : 'bg-neutral-200 text-neutral-500 pointer-events-none'
                 }`}
               >
                  <LuArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
               </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentHub;
