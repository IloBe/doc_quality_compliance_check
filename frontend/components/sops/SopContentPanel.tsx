import React from 'react';
import { SopItem } from '../../lib/sopsViewModel';
import { markdownContentClass } from '../../lib/markdownStyles';

type SopContentPanelProps = {
  sop?: SopItem;
};

const SopContentPanel = ({ sop }: SopContentPanelProps) => {
  return (
    <div className="xl:col-span-2 bg-white border border-neutral-200 rounded-2xl shadow-sm p-6">
      {sop ? (
        <>
          <div className="border-b border-neutral-100 pb-4 mb-4">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{sop.title}</h2>
            <p className="text-sm text-neutral-500 mt-1">
              {sop.documentId || 'Document ID not set'} • {sop.fileName}
            </p>
          </div>
          <div className={markdownContentClass} dangerouslySetInnerHTML={{ __html: sop.html }} />
        </>
      ) : (
        <p className="text-neutral-500">No SOP markdown files found in templates/sop.</p>
      )}
    </div>
  );
};

export default SopContentPanel;
