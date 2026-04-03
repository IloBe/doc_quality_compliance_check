import React from 'react';
import { QaEntry } from '../../lib/helpCenterViewModel';
import { getSelectionStyles } from '../../lib/selectionStyles';

type HelpQaSidebarProps = {
  entries: QaEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const HelpQaSidebar = ({ entries, selectedId, onSelect }: HelpQaSidebarProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Questions</h2>
      <div className="space-y-2">
        {entries.map((entry) => {
          const active = entry.id === selectedId;
          const selectionStyles = getSelectionStyles({
            isSelected: active,
            tone: 'blue',
            defaultRowClass: 'bg-white border-neutral-200',
            idleRowClass: 'hover:bg-neutral-50',
            defaultPrimaryTextClass: 'text-neutral-700',
          });
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm border transition ${selectionStyles.rowClass} ${active ? 'font-semibold' : ''}`}
            >
              <span className={selectionStyles.primaryTextClass}>{entry.question}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HelpQaSidebar;
