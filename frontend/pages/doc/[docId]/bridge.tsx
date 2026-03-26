
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useMockStore } from '../../lib/mockStore';
import { useCan } from '../../lib/authContext';
import { 
  LuFileText, 
  LuLoader, 
  LuCheckCircle, 
  LuPlay, 
  LuStopCircle,
  LuTrash2,
  LuArrowRight,
  LuHistory,
  LuChevronRight,
  LuLayoutGrid,
  LuCpu
} from 'react-icons/lu';

const BridgeControl = () => {
  const router = useRouter();
  const { docId } = router.query;
  const { getDocById, acquireLock, releaseLock, updateDocStatus, isOperationsRunning } = useMockStore();
   const canRunBridge = useCan('bridge.run');
  
  const [doc, setDoc] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (docId) {
      setDoc(getDocById(docId));
    }
  }, [docId, getDocById]);

  const steps = [
    { id: 'inspect', title: 'Inspection Agent', desc: 'Scan text for logical structure and quality.' },
    { id: 'compliance', title: 'Compliance Agent', desc: 'Verify adherence to ISO/SOP standards.' },
    { id: 'research', title: 'Research Agent', desc: 'Cross-reference external regulations.' },
    { id: 'approval', title: 'Quality Gate', desc: 'Final scoring and report generation.' }
  ];

  const handleStartRun = () => {
    if (!doc) return;
    setIsProcessing(true);
    addLog(`Initiating Bridge Run for ${doc.id}...`);
    
    // Simulating sequence
    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        setActiveStep(current);
        addLog(`Step ${current + 1}: ${steps[current].title} active...`);
        current++;
      } else {
        clearInterval(interval);
        setIsProcessing(false);
        updateDocStatus(doc.id, 'Approved');
        addLog('Bridge Run successfully completed. Generating Report.');
      }
    }, 2000);
  };

  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  if (!doc) return <div className="p-20 text-center animate-pulse text-neutral-400">Loading Document...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 bg-white border border-neutral-100 rounded-3xl shadow-xl flex items-center justify-center text-blue-600">
              <LuFileText className="w-8 h-8" />
           </div>
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest bg-neutral-100 px-2 py-0.5 rounded">
                   BRIDGE / WORKFLOW
                 </span>
                 <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-50 border border-amber-100">
                    Live Session
                 </span>
              </div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">{doc.title}</h1>
              <p className="text-neutral-500 font-medium">Document compliance session ID: <span className="text-neutral-900 font-mono tracking-tighter">{doc.id}</span></p>
           </div>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={() => router.back()}
             className="px-6 py-3 bg-white border border-neutral-200 text-neutral-600 font-bold rounded-2xl hover:bg-neutral-50 transition active:scale-95 uppercase text-xs tracking-widest shadow-sm"
           >
              Exit Workflow
           </button>
           <button 
             onClick={handleStartRun}
                   disabled={isProcessing || !canRunBridge}
                   title={canRunBridge ? 'Execute Bridge Run' : 'Insufficient role permissions'}
             className={`flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition active:scale-95 uppercase text-xs tracking-widest shadow-xl shadow-blue-200 ${
                      isProcessing || !canRunBridge ? 'opacity-50 cursor-not-allowed' : ''
             }`}
           >
              {isProcessing ? (
                <>
                  <LuLoader className="w-4 h-4 animate-spin-slow" />
                  Running Bridge...
                </>
              ) : (
                <>
                  <LuPlay className="w-4 h-4 fill-current" />
                  Execute Bridge Run
                </>
              )}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Workflow Track */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
           <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-neutral-50 bg-neutral-50/30 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <LuCpu className="w-5 h-5 text-blue-500" />
                    <span className="font-bold text-neutral-800 tracking-tight">Agent Pipeline</span>
                 </div>
                 <div className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">
                    4 Agents Active
                 </div>
              </div>

              <div className="p-10 space-y-4 relative">
                 {/* Connection lines would go here */}
                 {steps.map((step, idx) => {
                    const isDone = idx < activeStep || (activeStep === steps.length - 1 && !isProcessing);
                    const isActive = idx === activeStep && isProcessing;
                    
                    return (
                        <div 
                          key={step.id} 
                          className={`group flex items-center gap-6 p-6 rounded-3xl border-2 transition-all duration-300 ${
                            isActive 
                              ? 'border-blue-500 bg-blue-50/50 shadow-xl shadow-blue-100 ring-4 ring-blue-50' 
                              : isDone 
                                ? 'border-emerald-100 bg-emerald-50/30' 
                                : 'border-neutral-50 border-dashed opacity-50'
                          }`}
                        >
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                             isActive 
                               ? 'bg-blue-500 text-white shadow-xl shadow-blue-400 rotate-6' 
                               : isDone 
                                 ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-400' 
                                 : 'bg-neutral-100 text-neutral-400'
                           }`}>
                              {isDone ? <LuCheckCircle className="w-6 h-6" /> : <span className="font-black text-lg">{idx + 1}</span>}
                           </div>

                           <div className="flex-1">
                              <h3 className={`font-black text-lg tracking-tight mb-1 ${
                                isActive ? 'text-blue-900' : isDone ? 'text-emerald-900' : 'text-neutral-400'
                              }`}>
                                 {step.title}
                              </h3>
                              <p className="text-sm font-medium text-neutral-400 group-hover:text-neutral-500 transition line-clamp-1 italic">
                                 {step.desc}
                              </p>
                           </div>

                           {isActive && (
                             <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">
                                <LuLoader className="w-3 h-3 animate-spin-slow" />
                                Processing...
                             </div>
                           )}
                        </div>
                    );
                 })}
              </div>
           </div>
        </div>

        {/* Real-time Logs / Side Info */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
           <div className="bg-neutral-900 text-neutral-300 p-8 rounded-[2.5rem] shadow-2xl h-full flex flex-col border border-neutral-800 ring-4 ring-neutral-900/5 transition">
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-neutral-800">
                 <div className="flex items-center gap-2">
                    <LuHistory className="w-5 h-5 text-neutral-500" />
                    <span className="font-bold text-white tracking-tight">Stream Log</span>
                 </div>
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[11px] leading-relaxed scrollbar-hide">
                 {logs.length === 0 ? (
                    <div className="text-neutral-600 italic">Waiting for execution...</div>
                 ) : (
                    logs.map((log, i) => (
                      <div key={i} className={`p-3 rounded-lg border border-transparent hover:border-neutral-800 transition ${i === 0 ? 'bg-neutral-800 text-white shadow-lg' : ''}`}>
                         {log}
                      </div>
                    ))
                 )}
              </div>

              <div className="mt-8 pt-8 border-t border-neutral-800">
                 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">
                    Context Parameters
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-neutral-800 pb-2">
                       <span className="text-[11px] font-bold">AAMAD_ADAPTER</span>
                       <span className="text-[11px] text-blue-400 font-mono">vscode_adapter</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-neutral-800 pb-2">
                       <span className="text-[11px] font-bold">COMPLIANCE_LEVEL</span>
                       <span className="text-[11px] text-amber-400 font-mono">Strict ISO/IEC 27001</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-neutral-800 pb-2">
                       <span className="text-[11px] font-bold">MODEL_PRIMARY</span>
                       <span className="text-[11px] text-neutral-400 font-mono">gemini-1.5-pro</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default BridgeControl;
