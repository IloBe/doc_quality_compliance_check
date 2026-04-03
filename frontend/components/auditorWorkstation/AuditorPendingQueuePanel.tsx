import React from 'react';
import { CandidateWithReview, formatTs } from '../../lib/auditorWorkstationViewModel';
import { getSelectionStyles } from '../../lib/selectionStyles';

type AuditorPendingQueuePanelProps = {
  pending: CandidateWithReview[];
  selectedRunId: string | null;
  onSelectRun: (runId: string, recommendation: 'approved' | 'rejected') => void;
};

const AuditorPendingQueuePanel = ({ pending, selectedRunId, onSelectRun }: AuditorPendingQueuePanelProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Pending queue</h2>
      {!pending.length ? (
        <div className="text-sm text-neutral-500">No pending bridge recommendations in this window.</div>
      ) : (
        <div className="space-y-2">
          {pending.map((item) => {
            const active = selectedRunId === item.runId;
            const selectionStyles = getSelectionStyles({
              isSelected: active,
              tone: 'blue',
              defaultRowClass: 'border-neutral-200 bg-white',
              idleRowClass: 'hover:bg-neutral-50',
              defaultPrimaryTextClass: 'text-neutral-900',
              defaultSecondaryTextClass: 'text-neutral-500',
            });

            return (
              <button
                key={item.runId}
                type="button"
                onClick={() => onSelectRun(item.runId, item.recommendation)}
                className={`w-full text-left rounded-xl border px-3 py-2 transition ${selectionStyles.rowClass}`}
              >
                <div className={`text-xs font-black ${selectionStyles.primaryTextClass}`}>{item.documentId}</div>
                <div className={`text-[11px] mt-1 ${selectionStyles.secondaryTextClass}`}>Run: {item.runId}</div>
                <div className={`text-[11px] ${selectionStyles.secondaryTextClass}`}>{formatTs(item.eventTime)}</div>
                <div className="mt-1 text-[10px] uppercase font-black tracking-widest text-amber-600">Recommended: {item.recommendation}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuditorPendingQueuePanel;
