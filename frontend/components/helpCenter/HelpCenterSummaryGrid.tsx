import React from 'react';
import { HelpCenterSummary } from '../../lib/helpCenterViewModel';

type HelpCenterSummaryGridProps = {
  summary: HelpCenterSummary;
};

const HelpCenterSummaryGrid = ({ summary }: HelpCenterSummaryGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Knowledge destinations</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{summary.destinations}</div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Q&A entries</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{summary.qaEntries}</div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Glossary terms</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{summary.glossaryTerms}</div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Snippet highlights</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{summary.snippets}</div>
      </div>
    </div>
  );
};

export default HelpCenterSummaryGrid;
