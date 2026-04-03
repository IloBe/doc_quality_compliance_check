import React from 'react';
import { LuListChecks } from 'react-icons/lu';
import { QaEntry } from '../../lib/helpCenterViewModel';

type HelpQaDetailPanelProps = {
  entry: QaEntry | null;
};

const HelpQaDetailPanel = ({ entry }: HelpQaDetailPanelProps) => {
  if (!entry) {
    return <div className="bg-white border border-neutral-200 rounded-2xl p-5 text-sm text-neutral-500">No Q&A entries found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Question</div>
        <h2 className="text-xl font-black text-neutral-900">{entry.question}</h2>
        <div className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Answer</div>
        <p className="text-sm text-neutral-700 leading-relaxed">{entry.answer}</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3 inline-flex items-center gap-2">
          <LuListChecks className="w-4 h-4" />
          Examples
        </h3>
        <div className="space-y-3">
          {entry.examples.map((example) => (
            <div key={example} className="text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl p-3">
              {example}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HelpQaDetailPanel;
