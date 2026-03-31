import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { LuArrowRight, LuCheckCircle2, LuClock3, LuInfo, LuLoader, LuRefreshCw, LuShieldAlert, LuUserCheck, LuX } from 'react-icons/lu';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import { AuditTrailEvent, fetchAuditTrailEvents } from '../lib/auditTrailClient';
import { BridgeHumanReviewResponse, fetchBridgeHumanReview, submitBridgeHumanReview } from '../lib/bridgeClient';
import { useAuth, useCan } from '../lib/authContext';

type DecisionDraft = {
  decision: 'approved' | 'rejected';
  reason: string;
  nextTaskType: 'rerun_bridge' | 'manual_follow_up';
  nextTaskAssignee: string;
  nextTaskInstructions: string;
};

type ComplianceCheck = {
  topic: string;
  result: 'passed' | 'failed';
};

type ReviewCandidate = {
  runId: string;
  documentId: string;
  eventId: string;
  eventTime: string;
  recommendation: 'approved' | 'rejected';
  score: number | null;
  complianceChecks: ComplianceCheck[];
  requirementsVersion: string | null;
  requirementsSignature: string | null;
  payload: Record<string, unknown>;
};

type CandidateWithReview = ReviewCandidate & {
  review: BridgeHumanReviewResponse | null;
};

function formatTs(value: string): string {
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? value : dt.toLocaleString();
}

function toReviewCandidate(event: AuditTrailEvent): ReviewCandidate | null {
  if (event.event_type !== 'bridge.run.recommendation') {
    return null;
  }

  const payload = event.payload || {};
  const payloadRunId = typeof payload.run_id === 'string' ? payload.run_id : null;
  const runId = payloadRunId || event.correlation_id;
  if (!runId) {
    return null;
  }

  const recommendation = payload.automatic_recommendation === 'rejected' ? 'rejected' : 'approved';
  const score = typeof payload.compliance_score === 'number' ? payload.compliance_score : null;
  const complianceChecks: ComplianceCheck[] = Array.isArray(payload.compliance_checks)
    ? (payload.compliance_checks as Array<Record<string, unknown>>).map((c) => ({
        topic: typeof c.topic === 'string' ? c.topic : String(c.topic),
        result: c.result === 'failed' ? 'failed' : 'passed',
      }))
    : [];

  return {
    runId,
    documentId: event.subject_id,
    eventId: event.event_id,
    eventTime: event.event_time,
    recommendation,
    score,
    complianceChecks,
    requirementsVersion: typeof payload.requirements_version === 'string' ? payload.requirements_version : null,
    requirementsSignature: typeof payload.requirements_signature === 'string' ? payload.requirements_signature : null,
    payload,
  };
}

const AuditorWorkstationPage = () => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const canApprove = useCan('review.approve');

  const [windowHours, setWindowHours] = useState(24 * 30);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditTrailEvent[]>([]);
  const [reviewsByRunId, setReviewsByRunId] = useState<Record<string, BridgeHumanReviewResponse>>({});
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [showScorePopover, setShowScorePopover] = useState(false);
  const scorePopoverRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<DecisionDraft>({
    decision: 'approved',
    reason: '',
    nextTaskType: 'rerun_bridge',
    nextTaskAssignee: '',
    nextTaskInstructions: '',
  });

  const useBackendData = process.env.NEXT_PUBLIC_AUDIT_TRAIL_SOURCE === 'backend';

  const mockEvents = useMemo<AuditTrailEvent[]>(() => {
    const now = Date.now();
    return [
      {
        event_id: 'evt-rec-001',
        event_type: 'bridge.run.recommendation',
        actor_type: 'system',
        actor_id: 'bridge',
        subject_type: 'document',
        subject_id: 'DOC-001',
        trace_id: null,
        correlation_id: 'run-demo-001',
        tenant_id: 'default_tenant',
        org_id: 'qm',
        project_id: 'doc-quality',
        event_time: new Date(now - 1000 * 60 * 90).toISOString(),
        payload: {
          run_id: 'run-demo-001',
          automatic_recommendation: 'approved',
          compliance_score: 0.83,
          requirements_version: 'eu_ai_act:2026-03',
          requirements_signature: 'sig-demo-001',
          compliance_checks: [
            { topic: 'Risk Management System', result: 'passed' },
            { topic: 'Transparency & Explainability', result: 'passed' },
            { topic: 'Data Governance', result: 'passed' },
            { topic: 'Human Oversight', result: 'passed' },
            { topic: 'Accuracy & Robustness', result: 'passed' },
            { topic: 'Cybersecurity Measures', result: 'failed' },
          ],
        },
        created_at: new Date(now - 1000 * 60 * 90).toISOString(),
      },
      {
        event_id: 'evt-rec-002',
        event_type: 'bridge.run.recommendation',
        actor_type: 'system',
        actor_id: 'bridge',
        subject_type: 'document',
        subject_id: 'DOC-002',
        trace_id: null,
        correlation_id: 'run-demo-002',
        tenant_id: 'default_tenant',
        org_id: 'qm',
        project_id: 'doc-quality',
        event_time: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
        payload: {
          run_id: 'run-demo-002',
          automatic_recommendation: 'rejected',
          compliance_score: 0.33,
          requirements_version: 'eu_ai_act:2026-03',
          requirements_signature: 'sig-demo-002',
          compliance_checks: [
            { topic: 'Risk Management System', result: 'passed' },
            { topic: 'Transparency & Explainability', result: 'failed' },
            { topic: 'Data Governance', result: 'failed' },
            { topic: 'Human Oversight', result: 'failed' },
            { topic: 'Accuracy & Robustness', result: 'passed' },
            { topic: 'Cybersecurity Measures', result: 'failed' },
          ],
        },
        created_at: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
      },
    ];
  }, []);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    const sourceEvents = useBackendData
      ? await fetchAuditTrailEvents({ windowHours, limit: 500, eventType: 'bridge.run.recommendation' }).then((x) => x.items || [])
      : mockEvents;

    setEvents(sourceEvents);

    const candidates = sourceEvents
      .map((event) => toReviewCandidate(event))
      .filter((item): item is ReviewCandidate => item !== null);

    if (useBackendData) {
      const resolvedReviews = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const review = await fetchBridgeHumanReview(candidate.runId);
            return [candidate.runId, review] as const;
          } catch {
            return null;
          }
        }),
      );

      const indexed = resolvedReviews.reduce<Record<string, BridgeHumanReviewResponse>>((acc, row) => {
        if (!row) {
          return acc;
        }
        acc[row[0]] = row[1];
        return acc;
      }, {});
      setReviewsByRunId(indexed);
    }

    if (!selectedRunId && candidates.length > 0) {
      setSelectedRunId(candidates[0].runId);
      setDraft((prev) => ({ ...prev, decision: candidates[0].recommendation }));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    setShowScorePopover(false);
  }, [selectedRunId]);

  useEffect(() => {
    if (!showScorePopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (scorePopoverRef.current && !scorePopoverRef.current.contains(e.target as Node)) {
        setShowScorePopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showScorePopover]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load auditor workstation data');
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [windowHours, useBackendData]);

  const candidates = useMemo(() => {
    return events
      .map((event) => toReviewCandidate(event))
      .filter((item): item is ReviewCandidate => item !== null)
      .map((item) => ({ ...item, review: reviewsByRunId[item.runId] ?? null }));
  }, [events, reviewsByRunId]);

  const pending = useMemo(() => candidates.filter((item) => !item.review), [candidates]);
  const reviewed = useMemo(() => candidates.filter((item) => item.review), [candidates]);

  const overdueCount = useMemo(() => {
    const now = Date.now();
    return pending.filter((item) => now - new Date(item.eventTime).getTime() > 1000 * 60 * 60 * 24).length;
  }, [pending]);

  const rejectionRate = useMemo(() => {
    if (reviewed.length === 0) {
      return 0;
    }
    const rejected = reviewed.filter((item) => item.review?.decision === 'rejected').length;
    return Math.round((rejected / reviewed.length) * 100);
  }, [reviewed]);

  const selected = useMemo(() => {
    if (!selectedRunId) {
      return pending[0] ?? reviewed[0] ?? null;
    }
    return candidates.find((item) => item.runId === selectedRunId) ?? null;
  }, [candidates, pending, reviewed, selectedRunId]);

  const openFollowUps = useMemo(() => {
    return reviewed
      .filter((item) => item.review?.decision === 'rejected' && item.review?.next_task_type)
      .map((item) => ({
        runId: item.runId,
        documentId: item.documentId,
        reviewedAt: item.review?.reviewed_at || item.eventTime,
        type: item.review?.next_task_type || 'n/a',
        assignee: item.review?.next_task_assignee || 'unassigned',
        instructions: item.review?.next_task_instructions || 'no instructions',
      }));
  }, [reviewed]);

  // Derive displayed score from the topic checks whenever they are present.
  // This keeps the number in the evidence card and the popover topic list
  // mathematically consistent even when the raw payload score differs.
  const selectedDisplayScore = useMemo(() => {
    if (!selected) return null;
    if (selected.complianceChecks.length > 0) {
      const passed = selected.complianceChecks.filter((c) => c.result === 'passed').length;
      return Math.round((passed / selected.complianceChecks.length) * 100);
    }
    return selected.score === null ? null : Math.round(selected.score * 100);
  }, [selected]);

  const submitDecision = async () => {
    if (!selected || !canApprove) {
      return;
    }

    const reason = draft.reason.trim();
    if (reason.length < 5) {
      setSubmitError('Please provide a short reason (at least 5 characters).');
      return;
    }
    if (draft.decision === 'rejected' && draft.nextTaskType === 'manual_follow_up' && !draft.nextTaskAssignee.trim()) {
      setSubmitError('Please provide a responsible person for manual follow-up.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const saved = useBackendData
        ? await submitBridgeHumanReview(selected.runId, {
            document_id: selected.documentId,
            decision: draft.decision,
            reason,
            next_task_type: draft.decision === 'rejected' ? draft.nextTaskType : undefined,
            next_task_assignee: draft.decision === 'rejected' && draft.nextTaskType === 'manual_follow_up' ? draft.nextTaskAssignee.trim() : undefined,
            next_task_instructions: draft.decision === 'rejected' ? draft.nextTaskInstructions.trim() || undefined : undefined,
            assignee_notified: draft.decision === 'rejected',
          })
        : {
            review_id: `local-${Date.now()}`,
            run_id: selected.runId,
            document_id: selected.documentId,
            decision: draft.decision,
            reason,
            reviewer_email: currentUser?.email || 'local-user',
            reviewer_roles: currentUser?.roles || ['local'],
            reviewed_at: new Date().toISOString(),
            next_task_type: draft.decision === 'rejected' ? draft.nextTaskType : null,
            next_task_assignee: draft.decision === 'rejected' && draft.nextTaskType === 'manual_follow_up' ? draft.nextTaskAssignee.trim() : null,
            next_task_instructions: draft.decision === 'rejected' ? draft.nextTaskInstructions.trim() || null : null,
            assignee_notified: draft.decision === 'rejected',
          };

      setReviewsByRunId((prev) => ({ ...prev, [selected.runId]: saved }));
      setDraft({
        decision: 'approved',
        reason: '',
        nextTaskType: 'rerun_bridge',
        nextTaskAssignee: '',
        nextTaskInstructions: '',
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Reporting / Auditor Operations"
        title="Auditor Workstation"
        subtitle="Evidence and decision workspace for pending bridge approvals."
        whyDescription="This page is the action surface for auditors: review machine recommendation evidence, record approval/rejection rationale, and assign follow-up tasks when remediation is needed."
        rightContent={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWindowHours(24 * 7)}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide ${windowHours === 24 * 7 ? 'bg-blue-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600'}`}
            >
              7d
            </button>
            <button
              type="button"
              onClick={() => setWindowHours(24 * 30)}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide ${windowHours === 24 * 30 ? 'bg-blue-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600'}`}
            >
              30d
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <LuRefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => router.push('/audit-trail')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Read-only trail
              <LuArrowRight className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {!useBackendData && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-xs text-blue-700 font-semibold">
          Demo mode: workstation actions are stored locally for this browser session.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Pending decisions</div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{pending.length}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Reviewed in window</div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{reviewed.length}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Overdue (&gt;24h)</div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{overdueCount}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Rejection rate</div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{rejectionRate}%</div>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center gap-3 text-neutral-600">
          <LuLoader className="w-5 h-5 animate-spin" />
          Loading workstation data...
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-sm text-rose-700">{error}</div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Pending queue</h2>
            {!pending.length ? (
              <div className="text-sm text-neutral-500">No pending bridge recommendations in this window.</div>
            ) : (
              <div className="space-y-2">
                {pending.map((item) => (
                  <button
                    key={item.runId}
                    type="button"
                    onClick={() => {
                      setSelectedRunId(item.runId);
                      setDraft((prev) => ({ ...prev, decision: item.recommendation }));
                    }}
                    className={`w-full text-left rounded-xl border px-3 py-2 transition ${selected?.runId === item.runId ? 'border-blue-300 bg-blue-50' : 'border-neutral-200 hover:bg-neutral-50'}`}
                  >
                    <div className="text-xs font-black text-neutral-900">{item.documentId}</div>
                    <div className="text-[11px] text-neutral-500 mt-1">Run: {item.runId}</div>
                    <div className="text-[11px] text-neutral-500">{formatTs(item.eventTime)}</div>
                    <div className="mt-1 text-[10px] uppercase font-black tracking-widest text-amber-600">Recommended: {item.recommendation}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="xl:col-span-2 space-y-4">
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
                          onClick={() => setShowScorePopover((prev) => !prev)}
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
                              onClick={() => setShowScorePopover(false)}
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
                                      check.result === 'passed'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-rose-50 text-rose-700'
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
                          onClick={() => setDraft((prev) => ({ ...prev, decision: 'approved' }))}
                          className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest ${draft.decision === 'approved' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-neutral-200 text-neutral-500'}`}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft((prev) => ({ ...prev, decision: 'rejected' }))}
                          className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest ${draft.decision === 'rejected' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-white border-neutral-200 text-neutral-500'}`}
                        >
                          Reject
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Reason (required)</label>
                        <textarea
                          value={draft.reason}
                          onChange={(event) => setDraft((prev) => ({ ...prev, reason: event.target.value }))}
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
                              onChange={(event) => setDraft((prev) => ({ ...prev, nextTaskType: event.target.value as 'rerun_bridge' | 'manual_follow_up' }))}
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
                                onChange={(event) => setDraft((prev) => ({ ...prev, nextTaskAssignee: event.target.value }))}
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
                              onChange={(event) => setDraft((prev) => ({ ...prev, nextTaskInstructions: event.target.value }))}
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
                        onClick={() => void submitDecision()}
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
          </div>
        </div>
      )}

      <FooterInfoCard title="Two-page governance model" accent="indigo">
        Audit Trail remains read-only chronology for governance evidence. Auditor Workstation is the operational decision page for HITL approvals and rejection follow-up assignment.
      </FooterInfoCard>
    </div>
  );
};

export default AuditorWorkstationPage;
