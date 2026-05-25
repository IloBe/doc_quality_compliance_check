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
  getDocById: (id: string) => mockState.documents.find((d: Document) => d.id === id) || null,
  acquireLock: (id: string) => {
    const item = mockState.documents.find((doc: Document) => doc.id === id);
    if (!item) {
      return { success: false };
    }
    if (item.lockedBy && item.lockedBy !== mockState.currentUserId) {
      return { success: false, holder: item.lockedBy };
    }
    mockState.documents = mockState.documents.map((doc: Document) =>
      doc.id === id ? { ...doc, lockedBy: mockState.currentUserId } : doc,
    );
    return { success: true };
  },
  releaseLock: (id: string) => {
    mockState.documents = mockState.documents.map((doc: Document) =>
      doc.id === id ? { ...doc, lockedBy: undefined } : doc,
    );
    return true;
  },
  setDocumentLock: (id: string, userId: string | null) => {
    mockState.documents = mockState.documents.map((doc: Document) =>
      doc.id === id ? { ...doc, lockedBy: userId || undefined } : doc,
    );
  },
  addDocument: (doc: Document) => {
    const exists = mockState.documents.some((item: Document) => item.id === doc.id);
    if (exists) {
      mockState.documents = mockState.documents.map((item: Document) =>
        item.id === doc.id ? { ...item, ...doc } : item,
      );
      return;
    }

    const normalizedTitle = String(doc.title || '').trim().toLowerCase();
    if (normalizedTitle) {
      const titleIndex = mockState.documents.findIndex(
        (item: Document) => String(item.title || '').trim().toLowerCase() === normalizedTitle,
      );
      if (titleIndex >= 0) {
        const previous = mockState.documents[titleIndex];
        const merged = { ...previous, ...doc };
        mockState.documents = [
          merged,
          ...mockState.documents.filter((_, index: number) => index !== titleIndex),
        ];
        return;
      }
    }

    mockState.documents = [doc, ...mockState.documents];
  },
  enqueueExport: (_docId: string) => {},
  updateDocStatus: (id: string, status: string) => {
    mockState.documents = mockState.documents.map((doc: Document) =>
      doc.id === id ? { ...doc, status } : doc,
    );
  },
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
    updateDocStatus: (id: string, status: string) => {
      mockState.updateDocStatus(id, status);
      setTrigger((x) => x + 1);
    },
    addDocument: (doc: Document) => {
      mockState.addDocument(doc);
      setTrigger((x) => x + 1);
    },
    setDocumentLock: (id: string, userId: string | null) => {
      mockState.setDocumentLock(id, userId);
      setTrigger((x) => x + 1);
    },
    enqueueExport: (docId: string) => {
      mockState.enqueueExport(docId);
      setTrigger((x) => x + 1);
    },
  };
}

// Legacy function signature support
export function useMockStoreLegacy<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(initialValue);
  return [state, setState];
}
