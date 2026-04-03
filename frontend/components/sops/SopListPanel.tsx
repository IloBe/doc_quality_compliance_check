import React from 'react';
import { LuChevronRight, LuFileText } from 'react-icons/lu';
import { SopItem } from '../../lib/sopsViewModel';
import { getSelectionStyles } from '../../lib/selectionStyles';

type SopListPanelProps = {
  sops: SopItem[];
  activeSopId: string;
  onSelect: (sopId: string) => void;
};

const SopListPanel = ({ sops, activeSopId, onSelect }: SopListPanelProps) => {
  return (
    <div className="xl:col-span-1 space-y-4">
      {sops.map((sop) => {
        const active = activeSopId === sop.id;
        const selectionStyles = getSelectionStyles({
          isSelected: active,
          tone: 'blue',
          defaultRowClass: 'border-neutral-200 bg-white shadow-sm',
          idleRowClass: 'hover:border-blue-200 hover:shadow-md',
          defaultPrimaryTextClass: 'text-neutral-900',
          defaultSecondaryTextClass: 'text-neutral-500',
        });
        return (
          <button
            key={sop.id}
            type="button"
            onClick={() => onSelect(sop.id)}
            className={`w-full text-left border rounded-2xl p-4 transition-all ${selectionStyles.rowClass}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest mb-2">
                  <LuFileText className="w-3.5 h-3.5" />
                  SOP
                </div>
                <h3 className={`text-sm font-black leading-snug ${selectionStyles.primaryTextClass}`}>{sop.title}</h3>
                <p className={`text-[11px] mt-1 ${selectionStyles.secondaryTextClass}`}>{sop.documentId || 'Document ID not set'}</p>
                <p className={`text-[11px] mt-1 truncate ${selectionStyles.secondaryTextClass}`}>{sop.fileName}</p>
              </div>
              <LuChevronRight className={`w-4 h-4 mt-1 ${active ? 'text-blue-600' : 'text-neutral-300'}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default SopListPanel;
