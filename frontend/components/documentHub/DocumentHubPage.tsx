import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LuCircleAlert, LuCircleCheck, LuFilePlus, LuFilter, LuSearch } from 'react-icons/lu';
import { useRouter } from 'next/router';
import { useCan } from '../../lib/authContext';
import {
  ACCEPTED_UPLOAD_TYPES_LABEL,
  uploadDocument,
  validateUploadFileType,
} from '../../lib/documentUploadClient';
import { acquireDocumentLock, releaseDocumentLock } from '../../lib/documentLockClient';
import { listDocuments } from '../../lib/documentRetrievalClient';
import { buildDocumentHubQuery, filterDocuments, getDocumentHubFilters } from '../../lib/documentHub';
import { Document, useMockStore } from '../../lib/mockStore';
import FooterInfoCard from '../FooterInfoCard';
import PageHeaderWithWhy from '../PageHeaderWithWhy';
import DocumentCard from './DocumentCard';

type DocumentHubPageProps = {
  eyebrow?: string;
};

const DocumentHubPage = ({ eyebrow = 'Home' }: DocumentHubPageProps) => {
  const router = useRouter();
  const documents = useMockStore((state) => state.documents);
  const acquireLock = useMockStore((state) => state.acquireLock);
  const releaseLock = useMockStore((state) => state.releaseLock);
  const setDocumentLock = useMockStore((state) => state.setDocumentLock);
  const addDocument = useMockStore((state) => state.addDocument);
  const currentUserId = useMockStore((state) => state.currentUserId);

  const canEditDocuments = useCan('doc.edit');
  const canRunBridge = useCan('bridge.run');

  const [localFilter, setLocalFilter] = useState('');
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingPersistent, setIsLoadingPersistent] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { queryFilter, projectFilter } = useMemo(() => getDocumentHubFilters(router.query), [router.query]);

  useEffect(() => {
    setLocalFilter(queryFilter);
  }, [queryFilter]);

  // Load persisted documents from backend on mount
  useEffect(() => {
    const loadPersistentDocuments = async () => {
      setIsLoadingPersistent(true);
      const result = await listDocuments();
      if (result.ok && result.documents.length > 0) {
        // Add persisted documents to the mock store if not already present
        result.documents.forEach((doc) => {
          if (!documents.find((d) => d.id === doc.id)) {
            addDocument(doc);
          }
        });
      }
      setIsLoadingPersistent(false);
    };

    loadPersistentDocuments();
  }, []);

  const filteredDocuments = useMemo(
    () => filterDocuments(documents, localFilter, projectFilter),
    [documents, localFilter, projectFilter],
  );

  const commitSearch = (searchValue: string, currentProjectFilter: string) => {
    const nextQuery = buildDocumentHubQuery(searchValue, currentProjectFilter);
    router.replace({ pathname: '/', query: nextQuery }, undefined, { shallow: true });
  };

  const handleLockAction = async (document: Document) => {
    if (document.lockedBy && document.lockedBy === currentUserId) {
      const releaseResult = await releaseDocumentLock(document.id, currentUserId);
      if (!releaseResult.ok) {
        const holder = releaseResult.lockedBy ? `Locked by ${releaseResult.lockedBy}.` : '';
        setActionError(`${releaseResult.message} ${holder}`.trim());
        setActionInfo(null);
        return;
      }

      releaseLock(document.id);
      setDocumentLock(document.id, undefined);
      setActionInfo(`Lock released for ${document.id}.${releaseResult.degradedToDemo ? ' Demo fallback active.' : ''}`);
      setActionError(null);
      return;
    }

    const acquireResult = await acquireDocumentLock(document.id, currentUserId);
    if (!acquireResult.ok) {
      if (acquireResult.lockedBy) {
        setDocumentLock(document.id, acquireResult.lockedBy);
      }
      const holder = acquireResult.lockedBy ? `Locked by ${acquireResult.lockedBy}.` : '';
      setActionError(`${acquireResult.message} ${holder}`.trim());
      setActionInfo(null);
      return;
    }

    const localResult = acquireLock(document.id);
    if (!localResult.success) {
      if (localResult.holder) {
        setDocumentLock(document.id, localResult.holder);
      }
      const holder = localResult.holder ? `Locked by ${localResult.holder}.` : 'Lock could not be acquired.';
      setActionError(`${holder} Please retry later or coordinate with the owner.`);
      setActionInfo(null);
      return;
    }

    setDocumentLock(document.id, currentUserId);
    setActionInfo(`Lock acquired for ${document.id}. You can now edit this document.${acquireResult.degradedToDemo ? ' Demo fallback active.' : ''}`);
    setActionError(null);
  };

  const handleUploadButtonClick = () => {
    if (!canEditDocuments || isUploading) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const validation = validateUploadFileType(file);
    if (!validation.ok) {
      const extensionLabel = validation.extension ? `.${validation.extension}` : 'unknown';
      setActionError(
        `Document type ${extensionLabel} is not allowed for current compliance/check workflows. Accepted types: ${ACCEPTED_UPLOAD_TYPES_LABEL}.`,
      );
      setActionInfo(null);
      event.target.value = '';
      return;
    }

    setIsUploading(true);
    setActionError(null);
    setActionInfo(null);

    try {
      const result = await uploadDocument(file, currentUserId);
      if (!result.ok || !result.document) {
        setActionError(result.message || 'Upload failed. Please retry.');
        return;
      }

      addDocument(result.document);
      const degradeNote = result.degradedToDemo ? ' (demo fallback active)' : '';
      setActionInfo(`${result.message}${degradeNote}`);
      commitSearch(localFilter, projectFilter);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Upload failed. Please retry.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeaderWithWhy
        eyebrow={eyebrow}
        title="Document Hub"
        subtitle="Manage and monitor technical documentation compliance."
        whyDescription="The Document Hub is the controlled entry point for governed artifacts. It helps teams find the right document version, verify ownership and status, and start traceable review workflows before compliance or release decisions."
        rightContent={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleUploadButtonClick}
              disabled={!canEditDocuments || isUploading}
              title={canEditDocuments ? 'Upload Document' : 'Insufficient role permissions'}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition uppercase text-xs tracking-widest ${
                canEditDocuments && !isUploading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                  : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <LuFilePlus className="w-4 h-4" />
              {isUploading ? 'Uploading…' : 'Upload Document'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.pdf,.docx"
              onChange={handleFileSelected}
              className="hidden"
            />
          </div>
        }
      />

      <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-white shadow-xl shadow-neutral-100/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter by title..."
              value={localFilter}
              onChange={(event) => setLocalFilter(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitSearch(localFilter, projectFilter);
                }
              }}
              className="bg-white border border-neutral-100 pl-10 pr-4 py-2 rounded-xl text-sm w-64 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-neutral-500 font-bold text-xs uppercase hover:bg-white rounded-xl transition">
            <LuFilter className="w-4 h-4" />
            Status: All
          </button>
        </div>
        <div className="text-[10px] font-black text-neutral-300 uppercase tracking-[0.2em] pr-4">
          Total {filteredDocuments.length} Assets
        </div>
      </div>

      {(projectFilter || queryFilter) && (
        <div className="text-xs text-neutral-500">
          Showing results {projectFilter ? <span>for project <strong>{projectFilter}</strong></span> : <span>across all projects</span>}
          {queryFilter ? <span> and search <strong>"{queryFilter}"</strong></span> : null}.
        </div>
      )}

      {actionInfo && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <LuCircleCheck className="w-4 h-4" />
          {actionInfo}
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold flex items-center gap-2">
          <LuCircleAlert className="w-4 h-4" />
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDocuments.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            canEditDocuments={canEditDocuments}
            canRunBridge={canRunBridge}
            currentUserId={currentUserId}
            onLockAction={handleLockAction}
          />
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="rounded-2xl bg-white border border-neutral-200 p-8 text-center text-neutral-500">
          No documents match the current filters.
        </div>
      )}

      <FooterInfoCard title="Governance note" accent="blue">
        Document Hub is the controlled intake and retrieval surface. Ownership, status, and lock state should be validated here before initiating Bridge runs, approvals, or export workflows.
      </FooterInfoCard>
    </div>
  );
};

export default DocumentHubPage;
