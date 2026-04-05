import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { LuArrowUpRight, LuClock, LuEllipsisVertical, LuLock, LuLockOpen } from 'react-icons/lu';
import { Document } from '../../lib/mockStore';
import { getDocumentStatusBadgeClass } from '../../lib/documentHub';

type DocumentCardProps = {
  document: Document;
  canEditDocuments: boolean;
  canRunBridge: boolean;
  currentUserId: string;
  onLockAction: (document: Document) => void;
};

const DocumentCard = ({ document, canEditDocuments, canRunBridge, currentUserId, onLockAction }: DocumentCardProps) => {
  const router = useRouter();
  const isLockedByCurrentUser = Boolean(document.lockedBy) && document.lockedBy === currentUserId;
  const lockDisabled = !canEditDocuments || (Boolean(document.lockedBy) && !isLockedByCurrentUser);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [quickActionInfo, setQuickActionInfo] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const onDocumentMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    globalThis.document.addEventListener('mousedown', onDocumentMouseDown);
    return () => {
      globalThis.document.removeEventListener('mousedown', onDocumentMouseDown);
    };
  }, [isMenuOpen]);

  const handleOpenExports = () => {
    setIsMenuOpen(false);
    void router.push({
      pathname: '/exports',
      query: {
        docId: document.id,
      },
    });
  };

  const handleOpenBridge = () => {
    if (!canRunBridge) {
      return;
    }

    setIsMenuOpen(false);
    void router.push(`/doc/${document.id}/bridge`);
  };

  const handleCopyDocumentId = async () => {
    try {
      await navigator.clipboard.writeText(document.id);
      setQuickActionInfo(`Copied ${document.id} to clipboard.`);
    } catch {
      setQuickActionInfo('Clipboard access was blocked by the browser.');
    } finally {
      setIsMenuOpen(false);
      setTimeout(() => setQuickActionInfo(null), 2200);
    }
  };

  return (
    <div className={`group relative bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-300 hover:-translate-y-1 ${isMenuOpen ? 'z-30' : ''}`}>
      <div className="flex items-start justify-between mb-6">
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getDocumentStatusBadgeClass(document.status)}`}>
          {document.status}
        </div>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            className="p-2 text-neutral-300 hover:text-neutral-800 hover:bg-neutral-50 rounded-xl transition"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <LuEllipsisVertical className="w-5 h-5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border border-neutral-200 bg-white p-2 shadow-2xl">
              <button
                type="button"
                onClick={handleOpenExports}
                className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Open Exports Registry
              </button>
              <button
                type="button"
                onClick={handleOpenBridge}
                disabled={!canRunBridge}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold ${
                  canRunBridge
                    ? 'text-neutral-700 hover:bg-neutral-50'
                    : 'cursor-not-allowed text-neutral-300'
                }`}
              >
                Open Bridge Workflow
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCopyDocumentId();
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Copy Document ID
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-xl font-black text-neutral-800 tracking-tight mb-2 group-hover:text-blue-600 transition">{document.title}</h3>

      {quickActionInfo ? <p className="mb-2 text-[11px] font-semibold text-blue-700">{quickActionInfo}</p> : null}

      <div className="flex items-center gap-4 text-neutral-400 text-[11px] font-bold uppercase tracking-tighter mb-6">
        <span className="flex items-center gap-1.5 bg-neutral-50 px-2 py-0.5 rounded">ID: {document.id}</span>
        <span className="flex items-center gap-1.5">
          <LuClock className="w-3 h-3" /> Updated: {document.updatedAt}
        </span>
      </div>

      <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">
            {document.updatedBy?.[0] ?? '?'}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-neutral-800 leading-none mb-0.5">{document.updatedBy ?? 'Unknown'}</span>
            <span className="text-[9px] text-neutral-400 uppercase font-medium">Lead Author</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-neutral-800 leading-none mb-0.5">{document.type}</span>
          <span className="text-[9px] text-neutral-400 uppercase font-medium">Schema</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onLockAction(document)}
          disabled={lockDisabled}
          title={!canEditDocuments ? 'Insufficient role permissions' : undefined}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition shadow-sm ${
            lockDisabled
              ? 'bg-amber-50 text-amber-600 border border-amber-100 cursor-not-allowed'
              : isLockedByCurrentUser
                ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 active:scale-95'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50 active:scale-95'
          }`}
        >
          {document.lockedBy && !isLockedByCurrentUser ? (
            <>
              <LuLock className="w-3.5 h-3.5" />
              Locked by {document.lockedBy === 'system-process' ? 'System' : document.lockedBy}
            </>
          ) : isLockedByCurrentUser ? (
            <>
              <LuLockOpen className="w-3.5 h-3.5" />
              Release Lock
            </>
          ) : (
            <>
              <LuLockOpen className="w-3.5 h-3.5" />
              Acquire Lock
            </>
          )}
        </button>

        {canRunBridge ? (
          <Link
            href={`/doc/${document.id}/bridge`}
            className="p-3 rounded-xl transition shadow-lg group/btn bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"
            title="Open Bridge workflow"
          >
            <LuArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            title="Insufficient role permissions"
            className="p-3 rounded-xl bg-neutral-200 text-neutral-500"
          >
            <LuArrowUpRight className="w-5 h-5" />
          </span>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;
