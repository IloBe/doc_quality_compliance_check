
import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useMockStore } from '../lib/mockStore';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import OperationsDrawer from './OperationsDrawer';
import BlockingModal from './BlockingModal';
import { logoutSession } from '../lib/authClient';

function readQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function resolveModalType(value: string): 'exit' | null {
  return value === 'exit' ? 'exit' : null;
}

const AppShell = ({ children, currentUser }) => {
  const router = useRouter();
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  const isOperationsRunning = useMockStore(state => state.isOperationsRunning);

  const isOpsOpen = useMemo(
    () => readQueryValue(router.query.ops) === '1',
    [router.query.ops],
  );

  const modalType = useMemo(
    () => resolveModalType(readQueryValue(router.query.modal)),
    [router.query.modal],
  );

  const selectedOperationId = useMemo(
    () => readQueryValue(router.query.op) || null,
    [router.query.op],
  );

  const commitShellUiState = useCallback((next: {
    opsOpen?: boolean;
    modalType?: 'exit' | null;
    selectedOperationId?: string | null;
  }) => {
    if (!router.isReady) {
      return;
    }

    const currentOpsOpen = readQueryValue(router.query.ops) === '1';
    const currentModalType = resolveModalType(readQueryValue(router.query.modal));
    const currentOperationId = readQueryValue(router.query.op) || null;

    const desiredOpsOpen = next.opsOpen ?? currentOpsOpen;
    const desiredModalType = next.modalType !== undefined ? next.modalType : currentModalType;
    const desiredOperationId = next.selectedOperationId !== undefined ? next.selectedOperationId : currentOperationId;

    if (
      currentOpsOpen === desiredOpsOpen
      && currentModalType === desiredModalType
      && currentOperationId === desiredOperationId
    ) {
      return;
    }

    const nextQuery: Record<string, string> = {};
    Object.entries(router.query).forEach(([key, rawValue]) => {
      if (key === 'ops' || key === 'modal' || key === 'op') {
        return;
      }
      const normalized = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      if (normalized) {
        nextQuery[key] = normalized;
      }
    });

    if (desiredOpsOpen) {
      nextQuery.ops = '1';
    }
    if (desiredModalType) {
      nextQuery.modal = desiredModalType;
    }
    if (desiredOpsOpen && desiredOperationId) {
      nextQuery.op = desiredOperationId;
    }

    void router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true, scroll: false },
    );
  }, [router]);

  const performLogout = async () => {
    try {
      await logoutSession();
    } finally {
      window.location.href = '/login';
    }
  };

  const handleExitClick = () => {
    if (isOperationsRunning) {
      commitShellUiState({ modalType: 'exit' });
    } else {
      performLogout();
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] antialiased">
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-gradient-to-br from-blue-100/20 via-white to-emerald-100/30" />
      
      {/* Sidebar - Fixed width, sticky scroll if needed */}
      {!isFocusMode && <Sidebar className="w-[280px] h-full border-r border-neutral-200 bg-white" />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Topbar - Persistent navigation and profile */}
        <Topbar 
          className="h-16 px-8 border-b border-neutral-200 bg-white" 
          onOpsClick={() => commitShellUiState({ opsOpen: !isOpsOpen })}
          onExitClick={handleExitClick}
          onFocusModeChange={setIsFocusMode}
          currentUser={currentUser}
        />

        {/* Global Hub/Project Breadcrumbs could go here */}

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-8">
          <div className="max-w-[1400px] mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Operations Sidebar Drawer */}
      <OperationsDrawer 
        isOpen={isOpsOpen} 
        selectedOperationId={selectedOperationId}
        onSelectOperation={(operationId) => commitShellUiState({ opsOpen: true, selectedOperationId: operationId })}
        onClose={() => commitShellUiState({ opsOpen: false, selectedOperationId: null })} 
      />

      {/* Mandatory Blocking Modal */}
      <BlockingModal 
        isOpen={Boolean(modalType)}
        type={modalType}
        onClose={() => commitShellUiState({ modalType: null })}
        onConfirm={() => {
          commitShellUiState({ modalType: null });
          performLogout();
        }}
      />
    </div>
  );
};

export default AppShell;
