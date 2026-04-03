import React from 'react';
import { LuDownload } from 'react-icons/lu';
import { LlmPromptOutputPair } from '../../../lib/observabilityClient';

type ObservabilityPromptPairsPanelProps = {
  promptPairs: LlmPromptOutputPair[];
  onExportCsv: () => void;
};

const ObservabilityPromptPairsPanel = ({ promptPairs, onExportCsv }: ObservabilityPromptPairsPanelProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-black text-neutral-900">Recent GenAI Prompt / Output Pairs</h2>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={promptPairs.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LuDownload className="w-4 h-4" />
          Export CSV
        </button>
      </div>
      {promptPairs.length === 0 ? (
        <div className="text-sm text-neutral-500">No captured prompt/output pairs in this window. Pairs are listed when LLM-backed flows emit telemetry.</div>
      ) : (
        <div className="space-y-4">
          {promptPairs.map((item, index) => (
            <div key={`${item.event_time}-${index}`} className="border border-neutral-200 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 mb-3">
                <span className="font-semibold text-neutral-700">{item.source_component}</span>
                <span>Provider: {item.provider || 'n/a'}</span>
                <span>Model: {item.model_used || 'n/a'}</span>
                <span>{new Date(item.event_time).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-1">Prompt</div>
                  <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded p-3 whitespace-pre-wrap break-words max-h-48 overflow-auto">{item.prompt}</pre>
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-1">Output</div>
                  <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded p-3 whitespace-pre-wrap break-words max-h-48 overflow-auto">{item.output}</pre>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-1">Rich GenAI Trace Payload</div>
                {Object.keys(item.rich_payload || {}).length === 0 ? (
                  <div className="text-xs text-neutral-500">No additional payload fields captured for this trace.</div>
                ) : (
                  <pre className="text-xs bg-indigo-50 border border-indigo-200 rounded p-3 whitespace-pre-wrap break-words max-h-56 overflow-auto">{JSON.stringify(item.rich_payload, null, 2)}</pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ObservabilityPromptPairsPanel;
