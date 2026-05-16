// Mock Store - In-memory state store for development

import React, { useState } from 'react';

export interface Document {
  id: string;
  title: string;
  type?: string;
  product?: string;
  version?: string;
  content?: string;
  status: string;
  updatedAt?: string;
  updatedBy?: string;
  lockedBy?: string;
}

export interface ExportJob {
  id: string;
  name?: string;
  docId?: string;
  docTitle?: string;
  type?: string;
  sourceStatus?: string;
  status: string;
  createdAt?: string;
  completedAt?: string;
  url?: string;
}

export interface BridgeRun {
  id: string;
  product?: string;
  status: string;
  startedAt?: string;
  verdict?: string;
  classificationWhy?: string;
  evidenceCount?: number;
  createdAt?: string;
}

// Global mock state
const mockState: Record<string, any> = {
  isOperationsRunning: false,
  currentUserId: 'user_default',
  documents: [] as Document[],
  exportJobs: [] as ExportJob[],
  exports: [] as ExportJob[],
  bridgeRuns: [] as BridgeRun[],
  acquireLock: (_id: string) => true,
  releaseLock: (_id: string) => true,
  setDocumentLock: (_id: string, _userId: string | null) => {},
  addDocument: (_doc: Document) => {},
  enqueueExport: (_docId: string) => {},
  updateDocStatus: (_id: string, _status: string) => {},
};

export function useMockStore<T>(selector?: (state: any) => T): T | any {
  const [, setTrigger] = useState(0);

  React.useEffect(() => {
    // In a real implementation, this would subscribe to state changes
    // For now, just return the current state
  }, []);

  if (selector) {
    return selector(mockState);
  }

  return {
    ...mockState,
    getDocById: (id: string) => mockState.documents.find((d: Document) => d.id === id) || null,
    updateDocStatus: (_id: string, _status: string) => {
      setTrigger((x) => x + 1);
    },
    enqueueExport: (_docId: string) => {
      setTrigger((x) => x + 1);
    },
  };
}

// Legacy function signature support
export function useMockStoreLegacy<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(initialValue);
  return [state, setState];
}
