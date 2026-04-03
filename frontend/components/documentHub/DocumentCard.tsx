import Link from 'next/link';
import React from 'react';
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
  const isLockedByCurrentUser = Boolean(document.lockedBy) && document.lockedBy === currentUserId;
  const lockDisabled = !canEditDocuments || (Boolean(document.lockedBy) && !isLockedByCurrentUser);

  return (
    <div className="group relative bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-6">
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getDocumentStatusBadgeClass(document.status)}`}>
          {document.status}
        </div>
        <button type="button" className="p-2 text-neutral-300 hover:text-neutral-800 hover:bg-neutral-50 rounded-xl transition" aria-label="More options">
          <LuEllipsisVertical className="w-5 h-5" />
        </button>
      </div>

      <h3 className="text-xl font-black text-neutral-800 tracking-tight mb-2 group-hover:text-blue-600 transition">{document.title}</h3>

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
