import React from 'react';
import { LuInfo, LuLoader, LuUserCheck, LuX } from 'react-icons/lu';
import { CandidateWithReview, DecisionDraft, formatTs } from '../../lib/auditorWorkstationViewModel';

type AuditorDecisionPanelProps = {
  selected: CandidateWithReview | null;
  selectedDisplayScore: number | null;
  showScorePopover: boolean;
  scorePopoverRef: React.RefObject<HTMLDivElement | null>;
  onToggleScorePopover: () => void;
  onCloseScorePopover: () => void;
  canApprove: boolean;
  draft: DecisionDraft;
  onDraftChange: (updater: (draft: DecisionDraft) => DecisionDraft) => void;
  submitError: string | null;
  isSubmitting: boolean;
  onSubmitDecision: () => void;
};

const AuditorDecisionPanel = ({
  selected,
  selectedDisplayScore,
  showScorePopover,
  scorePopoverRef,
  onToggleScorePopover,
  onCloseScorePopover,
  canApprove,
  draft,
  onDraftChange,
  submitError,
  isSubmitting,
  onSubmitDecision,
}: AuditorDecisionPanelProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Evidence and decision</h2>
      {!selected ? (
        <div className="text-sm text-neutral-500">Select a pending run to review evidence and record a decision.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Document</div>
              <div className="text-neutral-800">{selected.documentId}</div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Run and time</div>
              <div className="text-neutral-800">{selected.runId} · {formatTs(selected.eventTime)}</div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Automatic recommendation</div>
              <div className="text-neutral-800 uppercase font-bold">{selected.recommendation}</div>
            </div>
            <div className="relative rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2" ref={scorePopoverRef}>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Compliance score</span>
                <button
                  type="button"
                  onClick={onToggleScorePopover}
                  className="text-neutral-400 hover:text-blue-600 transition-colors"
                  title="Show evaluated topics"
                >
                  <LuInfo className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-neutral-800">{selectedDisplayScore === null ? 'n/a' : `${selectedDisplayScore}%`}</div>
              {showScorePopover && (
                <div className="absolute z-30 top-full left-0 mt-1 w-72 bg-white border border-neutral-200 rounded-xl shadow-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Evaluated topics</span>
                    <button
                      type="button"
                      onClick={onCloseScorePopover}
                      className="text-neutral-400 hover:text-neutral-700"
                    >
                      <LuX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {selected.complianceChecks.length === 0 ? (
                    <p className="text-xs text-neutral-500">No topic breakdown available for this run.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {selected.complianceChecks.map((check) => (
                        <li key={check.topic} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-neutral-700">{check.topic}</span>
                          <span
                            className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              check.result === 'passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {check.result}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {selected.review ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              Decision already recorded: <span className="font-bold uppercase">{selected.review.decision}</span> by {selected.review.reviewer_email} at {formatTs(selected.review.reviewed_at)}.
            </div>
          ) : (
            <>
              {!canApprove && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  You do not have `review.approve` permission. This workstation is visible, but decision actions are disabled.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onDraftChange((current) => ({ ...current, decision: 'approved' }))}
                  className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest ${draft.decision === 'approved' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-neutral-200 text-neutral-500'}`}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onDraftChange((current) => ({ ...current, decision: 'rejected' }))}
                  className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest ${draft.decision === 'rejected' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-white border-neutral-200 text-neutral-500'}`}
                >
                  Reject
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Reason (required)</label>
                <textarea
                  value={draft.reason}
                  onChange={(event) => onDraftChange((current) => ({ ...current, reason: event.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  placeholder="Explain why you approve or reject."
                  disabled={!canApprove}
                />
              </div>

              {draft.decision === 'rejected' && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Next task type</label>
                    <select
                      value={draft.nextTaskType}
                      onChange={(event) => onDraftChange((current) => ({ ...current, nextTaskType: event.target.value as 'rerun_bridge' | 'manual_follow_up' }))}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-white"
                      disabled={!canApprove}
                    >
                      <option value="rerun_bridge">Another automatic bridge run</option>
                      <option value="manual_follow_up">Manual follow-up by specific person</option>
                    </select>
                  </div>
                  {draft.nextTaskType === 'manual_follow_up' && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Responsible person</label>
                      <input
                        value={draft.nextTaskAssignee}
                        onChange={(event) => onDraftChange((current) => ({ ...current, nextTaskAssignee: event.target.value }))}
                        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-white"
                        placeholder="e.g. sven.riskmanager@qm.local"
                        disabled={!canApprove}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Task instructions</label>
                    <input
                      value={draft.nextTaskInstructions}
                      onChange={(event) => onDraftChange((current) => ({ ...current, nextTaskInstructions: event.target.value }))}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-white"
                      placeholder="Optional remediation instructions"
                      disabled={!canApprove}
                    />
                  </div>
                </div>
              )}

              {submitError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</div>}

              <button
                type="button"
                onClick={onSubmitDecision}
                disabled={isSubmitting || !canApprove}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white ${isSubmitting || !canApprove ? 'bg-neutral-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isSubmitting ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuUserCheck className="w-4 h-4" />}
                Submit decision
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditorDecisionPanel;
