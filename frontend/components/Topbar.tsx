
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useRouter } from 'next/router';

const ACTIVE_PROJECT_KEY = 'dq.activeProject';

const Topbar = ({ className, onOpsClick, onExitClick, onFocusModeChange, currentUser }) => {
  const router = useRouter();
  const isOperationsRunning = useMockStore(state => state.isOperationsRunning);
  const documents = useMockStore(state => state.documents);
  const exports = useMockStore(state => state.exports);
  const bridgeRuns = useMockStore(state => state.bridgeRuns);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const displayName = currentUser?.email ?? 'Unknown User';
  const firstInitial = displayName?.[0]?.toUpperCase() ?? '?';
  const primaryRole = currentUser?.roles?.[0] ?? 'user';

  const containerRef = useRef<HTMLDivElement | null>(null);

  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((doc) => set.add(doc.product));
    bridgeRuns.forEach((run) => set.add(run.product));
    return ['All Projects', ...Array.from(set.values())];
  }, [documents, bridgeRuns]);

  const [activeProject, setActiveProject] = useState('All Projects');

  const helpContent = useMemo(() => {
    const common = {
      controls: [
        'Active Project: scope all checks to the selected product/program.',
        'Search: locate documents by Doc ID or title in the active scope.',
        'Operations: verify background jobs before approving outcomes.',
      ],
      rules: [
        'Never approve findings while operations are still running.',
        'Verify project scope before recording compliance decisions.',
      ],
    };

    if (router.pathname === '/') {
      return {
        title: 'Document Hub Guidance',
        sop: 'Use SOP-driven review order: identify document, validate lock ownership, then start review workflow.',
        fieldDefinitions: [
          'Status: Draft, In Review, Approved',
          'Schema: document type (SOP, RMF, arc42, Form)',
          'Lock holder: current editor ownership',
        ],
        controls: common.controls,
        rules: [
          ...common.rules,
          'Approved artifacts should reference traceable evidence and reviewer identity.',
        ],
      };
    }

    if (router.pathname === '/dashboard') {
      return {
        title: 'Dashboard Guidance',
        sop: 'Use dashboard KPIs for readiness screening before release gates and formal audits.',
        fieldDefinitions: [
          'Open Documents: not yet approved records',
          'Compliance Pass Rate: passed checks / total checks',
          'Risk Class: High, Limited, Minimal based on mapped controls',
        ],
        controls: common.controls,
        rules: [
          ...common.rules,
          'Investigate failed controls before sign-off and document remediation owner.',
        ],
      };
    }

    if (router.pathname === '/bridge' || router.pathname === '/doc/[docId]/bridge') {
      return {
        title: 'Bridge Workflow Guidance',
        sop: 'Execute sequentially: Inspection → Compliance → Research → Quality Gate; capture decision rationale in logs.',
        fieldDefinitions: [
          'Agent Pipeline: ordered processing stages',
          'Stream Log: timestamped processing evidence',
          'Session ID: workflow trace reference',
        ],
        controls: common.controls,
        rules: [
          ...common.rules,
          'Do not finalize quality gate when any mandatory control remains failed.',
        ],
      };
    }

    return {
      title: 'Context Guidance',
      sop: 'Follow the page-specific SOP sequence and document all compliance decisions with traceable evidence.',
      fieldDefinitions: [
        'Role: current authority context for actions',
        'Operations state: running, completed, error',
      ],
      controls: common.controls,
      rules: common.rules,
    };
  }, [router.pathname]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    return documents
      .filter((doc) => activeProject === 'All Projects' || doc.product === activeProject)
      .filter((doc) => {
        const haystack = `${doc.id} ${doc.title} ${doc.type} ${doc.product}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 6);
  }, [activeProject, documents, query]);

  const alerts = useMemo(() => {
    const runningExports = exports.filter((x) => x.status === 'Running').length;
    const failedExports = exports.filter((x) => x.status === 'Failed').length;
    const runningBridges = bridgeRuns.filter((x) => x.status === 'Running').length;

    return [
      {
        id: 'ops-running',
        title: `Operations in progress: ${runningExports + runningBridges}`,
        detail: 'Background compliance workflows are active.',
        severity: runningExports + runningBridges > 0 ? 'info' : 'ok',
      },
      {
        id: 'export-failures',
        title: `Failed exports: ${failedExports}`,
        detail: failedExports > 0 ? 'Review export registry for remediation.' : 'No failed exports in mock session.',
        severity: failedExports > 0 ? 'warn' : 'ok',
      },
    ];
  }, [bridgeRuns, exports]);

  useEffect(() => {
    const fromStorage = typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_PROJECT_KEY) : null;
    if (fromStorage && projectOptions.includes(fromStorage)) {
      setActiveProject(fromStorage);
    }
  }, [projectOptions]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsProjectOpen(false);
        setIsNotificationOpen(false);
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!onFocusModeChange) {
      return;
    }
    onFocusModeChange(isFocusMode);
  }, [isFocusMode, onFocusModeChange]);

  const handleProjectSelect = (project: string) => {
    setActiveProject(project);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, project);
    }
    setIsProjectOpen(false);
    router.push({ pathname: '/', query: project === 'All Projects' ? {} : { project } });
  };

  const submitSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const nextQuery: Record<string, string> = { q: trimmed };
    if (activeProject !== 'All Projects') {
      nextQuery.project = activeProject;
    }
    router.push({ pathname: '/', query: nextQuery });
    setIsSearchOpen(false);
  };

  const openDocumentWorkflow = (docId: string) => {
    setIsSearchOpen(false);
    setQuery('');
    router.push(`/doc/${docId}/bridge`);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <header ref={containerRef} className={`${className} flex items-center justify-between shadow-sm z-30 relative`}>
      {/* Left Area: Project & Context */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-tight">
            Active Project
          </label>
          <button
            type="button"
            onClick={() => {
              setIsProjectOpen((prev) => !prev);
              setIsNotificationOpen(false);
            }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded text-sm group-hover:bg-neutral-200 transition">
              {activeProject}
            </span>
            <LuChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600" />
          </button>

          {isProjectOpen && (
            <div className="absolute top-14 left-8 mt-2 w-56 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 z-50">
              {projectOptions.map((option) => {
                const selected = option === activeProject;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleProjectSelect(option)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selected ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="h-8 w-px bg-neutral-100" />
        
        <div className="relative group focus-within:w-64 w-48 transition-all duration-300">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search Doc ID / Title..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                submitSearch(query);
              }
            }}
            className="w-full bg-neutral-50 border border-transparent focus:border-blue-300 focus:bg-white pl-10 pr-4 py-1.5 rounded-full text-sm outline-none transition"
          />

          {isSearchOpen && query.trim().length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 z-50 max-h-72 overflow-auto">
              {searchResults.length === 0 ? (
                <div className="px-3 py-2 text-sm text-neutral-500">No matching documents.</div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => openDocumentWorkflow(doc.id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-50"
                    >
                      <div className="text-sm font-semibold text-neutral-800">{doc.title}</div>
                      <div className="text-[11px] text-neutral-500">{doc.id} • {doc.product}</div>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => submitSearch(query)}
                className="mt-2 w-full px-3 py-2 text-xs font-bold uppercase tracking-widest text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
              >
                Show all matches in Document Hub
              </button>
            </div>
          )}
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
            type="button"
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-full transition relative"
            title="Notifications"
            onClick={() => {
              setIsNotificationOpen((prev) => !prev);
              setIsProjectOpen(false);
            }}
          >
            <LuBell className="w-5 h-5" />
            {alerts.some((item) => item.severity === 'warn') && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute top-14 right-44 mt-2 w-80 bg-white border border-neutral-200 rounded-xl shadow-xl p-3 z-50 space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-neutral-400 font-black px-1">Session alerts</div>
              {alerts.map((item) => (
                <div key={item.id} className="px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-100">
                  <div className="text-sm font-semibold text-neutral-800">{item.title}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{item.detail}</div>
                </div>
              ))}
            </div>
          )}

          <button 
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-full transition"
            title="Focus Mode"
            onClick={() => setIsFocusMode((prev) => !prev)}
          >
            {isFocusMode ? <LuMinimize className="w-5 h-5" /> : <LuLayoutGrid className="w-5 h-5" />}
          </button>
          
          <button 
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-full transition"
            title="Help"
            onClick={() => setIsHelpOpen((prev) => !prev)}
          >
            <LuCircleHelp className="w-5 h-5" />
          </button>
          
          <button 
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-full transition"
            title="Toggle Fullscreen"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <LuMinimize className="w-5 h-5" /> : <LuMaximize className="w-5 h-5" />}
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

      {isHelpOpen && (
        <div className="absolute top-14 right-8 mt-2 w-[420px] bg-white border border-neutral-200 rounded-2xl shadow-2xl p-5 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500">{helpContent.title}</h3>
            <button
              type="button"
              onClick={() => setIsHelpOpen(false)}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-800"
            >
              Close
            </button>
          </div>

          <p className="text-sm text-neutral-700 mb-3">{helpContent.sop}</p>

          <div className="mb-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Field definitions</div>
            <ul className="space-y-1 text-sm text-neutral-700">
              {helpContent.fieldDefinitions.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="mb-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Control usage</div>
            <ul className="space-y-1 text-sm text-neutral-700">
              {helpContent.controls.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Compliance rules</div>
            <ul className="space-y-1 text-sm text-neutral-700">
              {helpContent.rules.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </header>
  );
};

export default Topbar;
