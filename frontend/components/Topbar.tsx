
import React, { useState } from 'react';
import { useMockStore } from '../lib/mockStore';
import { 
  LuSearch, 
  LuLoader, 
  LuBell, 
  LuCircleHelp, 
  LuMaximize, 
  LuMinimize, 
  LuChevronDown, 
  LuLogOut,
  LuLayoutGrid
} from 'react-icons/lu';

const Topbar = ({ className, onOpsClick, onExitClick, currentUser }) => {
  const isOperationsRunning = useMockStore(state => state.isOperationsRunning);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const displayName = currentUser?.email ?? 'Unknown User';
  const firstInitial = displayName?.[0]?.toUpperCase() ?? '?';
  const primaryRole = currentUser?.roles?.[0] ?? 'user';

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header className={`${className} flex items-center justify-between shadow-sm z-30`}>
      {/* Left Area: Project & Context */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-tight">
            Active Project
          </label>
          <div className="flex items-center gap-2 cursor-pointer group">
            <span className="font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded text-sm group-hover:bg-neutral-200 transition">
              QM-CORE-STATION
            </span>
            <LuChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600" />
          </div>
        </div>
        
        <div className="h-8 w-px bg-neutral-100" />
        
        <div className="relative group focus-within:w-64 w-48 transition-all duration-300">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search Doc ID / Title..."
            className="w-full bg-neutral-50 border border-transparent focus:border-blue-300 focus:bg-white pl-10 pr-4 py-1.5 rounded-full text-sm outline-none transition"
          />
        </div>
      </div>

      {/* Right Area: Utility & User */}
      <div className="flex items-center gap-4">
        {/* Operations Indicator */}
        <button 
          onClick={onOpsClick}
          className={`relative p-2 rounded-full transition-all group ${
            isOperationsRunning ? 'bg-blue-50' : 'hover:bg-neutral-50'
          }`}
          aria-label="Toggle Operations Drawer"
        >
          {isOperationsRunning ? (
            <LuLoader className="w-5 h-5 text-blue-600 animate-spin-slow" />
          ) : (
            <LuLoader className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600" />
          )}
          {isOperationsRunning && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          )}
        </button>

        <div className="w-px h-6 bg-neutral-100" />

        {/* Global Utilities */}
        <div className="flex items-center gap-1">
          <button 
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-full transition"
            title="Focus Mode"
            onClick={() => setIsFocusMode(!isFocusMode)}
          >
            {isFocusMode ? <LuMinimize className="w-5 h-5" /> : <LuLayoutGrid className="w-5 h-5" />}
          </button>
          
          <button 
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-full transition"
            title="Help"
          >
            <LuCircleHelp className="w-5 h-5" />
          </button>
          
          <button 
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-full transition"
            title="Toggle Fullscreen"
            onClick={toggleFullscreen}
          >
            <LuMaximize className="w-5 h-5" />
          </button>
        </div>

        <div className="h-10 w-px bg-neutral-100" />

        {/* User Menu */}
        <div className="flex items-center gap-3 pl-2 cursor-pointer group">
          <div className="flex flex-col text-right">
            <span className="text-xs font-bold text-neutral-800 leading-tight group-hover:text-blue-600 transition">
              {displayName}
            </span>
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest leading-tight">
              {primaryRole}
            </span>
          </div>
          <div className="relative group-hover:ring-4 group-hover:ring-blue-50 rounded-full transition-all overflow-hidden border border-neutral-200">
             <div className="w-9 h-9 flex items-center justify-center bg-blue-100 text-blue-700 font-bold p-2 text-xs">
               {firstInitial}
             </div>
             <button 
               onClick={onExitClick}
               className="absolute inset-0 bg-neutral-900/0 hover:bg-neutral-900/60 flex items-center justify-center opacity-0 hover:opacity-100 text-white transition-opacity duration-200"
               title="Sign Out"
             >
                <LuLogOut className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
