import React from 'react';
import { AuditorFollowUpTask, formatTs } from '../../lib/auditorWorkstationViewModel';

type AuditorFollowUpPanelProps = {
  openFollowUps: AuditorFollowUpTask[];
};

const AuditorFollowUpPanel = ({ openFollowUps }: AuditorFollowUpPanelProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Open follow-up tasks</h2>
      {openFollowUps.length === 0 ? (
        <div className="text-sm text-neutral-500">No open follow-up tasks in current window.</div>
      ) : (
        <div className="space-y-2">
          {openFollowUps.map((task) => (
            <div key={task.runId} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
              <div className="font-semibold text-neutral-900">{task.documentId} · {task.runId}</div>
              <div className="text-neutral-600 mt-1">{task.type} · assignee: {task.assignee}</div>
              <div className="text-neutral-600">{task.instructions}</div>
              <div className="text-xs text-neutral-500 mt-1">Rejected at {formatTs(task.reviewedAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditorFollowUpPanel;
