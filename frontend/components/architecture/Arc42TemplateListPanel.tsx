import React from 'react';
import { LuChevronRight, LuHexagon } from 'react-icons/lu';
import { Arc42Item } from '../../lib/architectureViewModel';
import { getSelectionStyles } from '../../lib/selectionStyles';

type Arc42TemplateListPanelProps = {
  templates: Arc42Item[];
  activeTemplateId: string;
  onSelect: (templateId: string) => void;
};

const Arc42TemplateListPanel = ({ templates, activeTemplateId, onSelect }: Arc42TemplateListPanelProps) => {
  return (
    <div className="xl:col-span-1 space-y-4">
      {templates.map((tmpl) => {
        const active = activeTemplateId === tmpl.id;
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
            key={tmpl.id}
            type="button"
            onClick={() => onSelect(tmpl.id)}
            className={`w-full text-left border rounded-2xl p-4 transition-all ${selectionStyles.rowClass}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest mb-2">
                  <LuHexagon className="w-3.5 h-3.5" />
                  arc42
                </div>
                <h3 className={`text-sm font-black leading-snug ${selectionStyles.primaryTextClass}`}>{tmpl.title}</h3>
                {tmpl.version && <p className={`text-[11px] mt-1 ${selectionStyles.secondaryTextClass}`}>v{tmpl.version}</p>}
                {tmpl.status && <p className={`text-[11px] mt-0.5 ${selectionStyles.secondaryTextClass}`}>{tmpl.status}</p>}
                <p className={`text-[11px] mt-1 truncate ${selectionStyles.secondaryTextClass}`}>{tmpl.fileName}</p>
              </div>
              <LuChevronRight className={`w-4 h-4 mt-1 flex-shrink-0 ${active ? 'text-blue-600' : 'text-neutral-300'}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default Arc42TemplateListPanel;
