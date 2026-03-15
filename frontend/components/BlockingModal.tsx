
import React from 'react';
import { 
  LuAlertTriangle, 
  LuLogOut, 
  LuLoader, 
  LuInfo,
  LuX
} from 'react-icons/lu';

const BlockingModal = ({ isOpen, type, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4 overflow-hidden animate-in fade-in duration-200">
      <div 
        role="dialog" 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
             {type === 'exit' ? (
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 ring-4 ring-rose-50">
                   <LuAlertTriangle className="w-6 h-6" />
                </div>
             ) : (
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 ring-4 ring-blue-50">
                   <LuInfo className="w-6 h-6" />
                </div>
             )}
             <button 
               onClick={onClose}
               className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-full transition"
             >
                <LuX className="w-5 h-5" />
             </button>
          </div>

          <h2 className="text-xl font-black text-neutral-800 tracking-tight mb-2">
            {type === 'exit' ? 'Interrupt Current Workflow?' : 'Access Restricted'}
          </h2>
          
          <p className="text-neutral-500 text-sm leading-relaxed mb-8">
            {type === 'exit' 
               ? "System-critical operations are currently running. Exiting now may result in data inconsistency or require re-running the validation from scratch. " 
               : "This section requires Doc-Owner permissions. Please request access from the system administrator."
            }
          </p>

          <div className="flex items-center gap-3">
             <button 
               onClick={onClose}
               className="flex-1 py-3 bg-neutral-100 text-neutral-600 font-bold rounded-xl hover:bg-neutral-200 transition uppercase text-xs tracking-widest"
             >
                Cancel Task
             </button>
             <button 
               onClick={onConfirm}
               className={`flex-1 py-3 font-bold rounded-xl transition uppercase text-xs tracking-widest shadow-lg ${
                 type === 'exit' 
                   ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200' 
                   : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
               }`}
             >
                {type === 'exit' ? 'Confirm Exit' : 'Upgrade Plan'}
             </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-neutral-50 px-6 py-3 border-t border-neutral-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <LuLoader className="w-3 h-3 text-blue-500 animate-spin" />
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                2 Ops Background
              </span>
           </div>
           <span className="text-[10px] font-medium text-neutral-300">
             Compliance Check v1.0
           </span>
        </div>
      </div>
    </div>
  );
};

export default BlockingModal;
