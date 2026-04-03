import React from 'react';
import Link from 'next/link';
import { LuArrowRight } from 'react-icons/lu';
import { HelpSnippet } from '../../lib/helpCenterViewModel';

type HelpSnippetHighlightsProps = {
  snippets: HelpSnippet[];
};

const HelpSnippetHighlights = ({ snippets }: HelpSnippetHighlightsProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Quick snippets</div>
          <h2 className="text-lg font-black text-neutral-900 mt-1">Operational guidance highlights</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {snippets.map((snippet) => (
          <Link
            key={snippet.id}
            href={snippet.href}
            className="border border-neutral-200 rounded-2xl p-4 hover:bg-neutral-50 transition"
          >
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-700">{snippet.label}</div>
            <div className="text-sm font-black text-neutral-900 mt-2">{snippet.title}</div>
            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{snippet.summary}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-neutral-500">
              Open entry
              <LuArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HelpSnippetHighlights;
