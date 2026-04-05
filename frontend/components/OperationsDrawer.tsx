
import React from 'react';
import { useRouter } from 'next/router';
import { useMockStore } from '../lib/mockStore';
import { 
  LuX, 
  LuLoader, 
  LuCircleCheck, 
  LuTriangleAlert, 
  LuClock,
  LuFileText,
  LuExternalLink,
  LuTrash2
} from 'react-icons/lu';

type OperationsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

const OperationsDrawer = ({ isOpen, onClose }: OperationsDrawerProps) => {
  const router = useRouter();

  const exportJobs = useMockStore(state => state.exports);
  const bridgeRuns = useMockStore(state => state.bridgeRuns);
  const isOperationsRunning = useMockStore(state => state.isOperationsRunning);
  const getDocById = useMockStore(state => state.getDocById);
  const removeExportJob = useMockStore(state => state.removeExportJob);
  const removeBridgeRun = useMockStore(state => state.removeBridgeRun);
  const clearCompletedOperations = useMockStore(state => state.clearCompletedOperations);

  type ActiveOp =
  | {
      kind: 'export';
      id: string;
      docId: string;
      type: string;
      timestamp: string;
      status: 'running' | 'pending' | 'completed' | 'error';
      url?: string;
    }
  | {
      kind: 'bridge';
      id: string;
      product: string;
      type: string;
      timestamp: string;
      status: 'running' | 'pending' | 'completed' | 'error';
    };

  type OpStatus = 'running' | 'pending' | 'completed' | 'error';

  const activeOperations: ActiveOp[] = [
    ...exportJobs.map((job) => ({
      id: job.id,
      kind: 'export' as const,
      docId: job.docId,
      type: `Export ${job.type}`,
      timestamp: job.completedAt ?? job.createdAt,
      status: (
        job.status === 'Running' ? 'running' :
        job.status === 'Queued' ? 'pending' :
        job.status === 'Ready' ? 'completed' :
        'error'
      ) as OpStatus,
      url: job.url,
    })),
    ...bridgeRuns.map((run) => ({
      id: run.id,
      kind: 'bridge' as const,
      product: run.product,
      type: `Bridge Run`,
      timestamp: run.startedAt,
      status: (
        run.status === 'Running' ? 'running' :
        run.status === 'Idle' ? 'pending' :
        run.status === 'Done' ? 'completed' :
        'error'
      ) as OpStatus,
    })),
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-blue-500';
      case 'completed': return 'text-emerald-500';
      case 'error': return 'text-rose-500';
      case 'pending': return 'text-amber-500';
      default: return 'text-neutral-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return <LuLoader className="w-5 h-5 animate-spin-slow" />;
      case 'completed': return <LuCircleCheck className="w-5 h-5" />;
      case 'error': return <LuTriangleAlert className="w-5 h-5" />;
      case 'pending': return <LuClock className="w-5 h-5" />;
      default: return <LuClock className="w-5 h-5" />;
    }
  };

  const openOperationReport = (operation: ActiveOp) => {
    onClose();

    if (operation.kind === 'export') {
      void router.push({
        pathname: '/exports',
        query: {
          docId: operation.docId,
          exportId: operation.id,
        },
      });
      return;
    }

    void router.push(`/artifact-lab/${encodeURIComponent(operation.id)}`);
  };

  const removeOperation = (operation: ActiveOp) => {
    if (operation.kind === 'export') {
      removeExportJob(operation.id);
      return;
    }
    removeBridgeRun(operation.id);
  };

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-80 bg-white border-l border-neutral-200 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-800 tracking-tight">Active Jobs</span>
            {isOperationsRunning && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-black uppercase rounded-full">
                Processing
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-neutral-200 rounded transition text-neutral-500 hover:text-neutral-800"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          {activeOperations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-40">
              <LuLoader className="w-12 h-12 text-neutral-200 mb-4" />
              <p className="text-sm font-medium text-neutral-500">No active operations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOperations.map((op) => {
                const doc = op.kind === 'export' ? getDocById(op.docId) : undefined;
                return (
                  <div 
                    key={op.id} 
                    className={`group relative p-4 rounded-xl border border-neutral-100 shadow-sm transition hover:bg-neutral-50 ${
                      op.status === 'running' ? 'bg-blue-50/30' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={getStatusColor(op.status)}>
                        {getStatusIcon(op.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest truncate max-w-[120px]">
                            {op.type}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                             {op.timestamp}
                          </span>
                        </div>
                        
                        <p className="text-sm font-bold text-neutral-700 truncate mb-1">
                          {doc?.title || (op.kind === 'export' ? op.docId : op.product)}
                        </p>
                        
                        <div className="flex items-center gap-1.5 opacity-60 text-[11px] font-medium uppercase tracking-tight">
                           <LuFileText className="w-3 h-3" />
                          {op.kind === 'export' ? op.docId : op.product}
                        </div>

                        {op.status === 'running' && (
                           <div className="mt-3 relative h-1 bg-neutral-100 rounded-full overflow-hidden">
                              <div className="absolute inset-y-0 left-0 bg-blue-500 w-1/3 animate-shimmer" />
                           </div>
                        )}
                        
                        {op.status === 'completed' && (
                          <div className="mt-3 flex items-center gap-2">
                             <button
                               type="button"
                               onClick={() => openOperationReport(op)}
                               className="flex-1 text-[11px] font-bold tracking-tighter text-blue-600 bg-blue-100 hover:bg-blue-200 py-1.5 rounded transition uppercase flex items-center justify-center gap-1"
                             >
                                View Report <LuExternalLink className="w-3 h-3" />
                             </button>
                             <button
                               type="button"
                               title="Remove from activity list"
                               onClick={() => removeOperation(op)}
                               className="p-1.5 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 rounded transition"
                             >
                                <LuTrash2 className="w-3 h-3" />
                             </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeOperations.some(op => op.status === 'completed') && (
           <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
             <button
               type="button"
               onClick={clearCompletedOperations}
               className="w-full py-2.5 bg-white border border-neutral-200 text-neutral-600 text-xs font-bold hover:bg-neutral-100 rounded-lg transition uppercase tracking-widest shadow-sm"
             >
                Clear Finished
             </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default OperationsDrawer;
