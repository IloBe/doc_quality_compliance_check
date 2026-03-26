
import React, { useState } from 'react';
import { useMockStore } from '../lib/mockStore';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import OperationsDrawer from './OperationsDrawer';
import BlockingModal from './BlockingModal';
import { logoutSession } from '../lib/authClient';

const AppShell = ({ children, currentUser }) => {
  const [isOpsOpen, setIsOpsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('exit');
  
  const isOperationsRunning = useMockStore(state => state.isOperationsRunning);

  const performLogout = async () => {
    try {
      await logoutSession();
    } finally {
      window.location.href = '/login';
    }
  };

  const handleExitClick = () => {
    if (isOperationsRunning) {
      setModalType('exit');
      setIsModalOpen(true);
    } else {
      performLogout();
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] antialiased">
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-gradient-to-br from-blue-100/20 via-white to-emerald-100/30" />
      
      {/* Sidebar - Fixed width, sticky scroll if needed */}
      <Sidebar className="w-[280px] h-full border-r border-neutral-200 bg-white" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Topbar - Persistent navigation and profile */}
        <Topbar 
          className="h-16 px-8 border-b border-neutral-200 bg-white" 
          onOpsClick={() => setIsOpsOpen(!isOpsOpen)}
          onExitClick={handleExitClick}
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
        onClose={() => setIsOpsOpen(false)} 
      />

      {/* Mandatory Blocking Modal */}
      <BlockingModal 
        isOpen={isModalOpen}
        type={modalType}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => {
          setIsModalOpen(false);
          performLogout();
        }}
      />
    </div>
  );
};

export default AppShell;
