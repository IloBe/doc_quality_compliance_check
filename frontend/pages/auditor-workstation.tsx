import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { LuArrowRight, LuLoader, LuRefreshCw } from 'react-icons/lu';
import AuditorDecisionPanel from '../components/auditorWorkstation/AuditorDecisionPanel';
import AuditorFollowUpPanel from '../components/auditorWorkstation/AuditorFollowUpPanel';
import AuditorPendingQueuePanel from '../components/auditorWorkstation/AuditorPendingQueuePanel';
import AuditorWorkstationKpiGrid from '../components/auditorWorkstation/AuditorWorkstationKpiGrid';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import { getHeaderControlClass, getHeaderToggleGroupClass } from '../components/buttonStyles';
import { AuditTrailEvent, fetchAuditTrailEvents } from '../lib/auditTrailClient';
import {
  BridgeHumanReviewResponse,
  fetchBridgeHumanReview,
  submitBridgeHumanReview,
} from '../lib/bridgeClient';
import { useAuth, useCan } from '../lib/authContext';
import {
  AUDITOR_WINDOWS,
  buildAuditorQueueKpis,
  buildCandidates,
  buildOpenFollowUps,
  createInitialDecisionDraft,
  createLocalBridgeReview,
  createMockAuditorEvents,
  getSelectedCandidate,
  getSelectedDisplayScore,
} from '../lib/auditorWorkstationViewModel';
import { syncQueryParam } from '../lib/queryState';
import { getSelectionButtonClass } from '../lib/selectionStyles';

function readQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function pickSelectedRunId(
  candidates: Array<{ runId: string }>,
  currentRunId: string | null,
): string | null {
  if (candidates.length === 0) {
    return null;
  }
  return currentRunId && candidates.some((candidate) => candidate.runId === currentRunId)
    ? currentRunId
    : candidates[0].runId;
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
  const [showScorePopover, setShowScorePopover] = useState(false);
  const scorePopoverRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(createInitialDecisionDraft());

  const useBackendData = process.env.NEXT_PUBLIC_AUDIT_TRAIL_SOURCE === 'backend';
  const mockEvents = useMemo<AuditTrailEvent[]>(() => createMockAuditorEvents(), []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sourceEvents = useBackendData
        ? await fetchAuditTrailEvents({ windowHours, limit: 500, eventType: 'bridge.run.recommendation' }).then((payload) => payload.items || [])
        : mockEvents;

      setEvents(sourceEvents);

      const baseCandidates = buildCandidates(sourceEvents, {});
      let reviewMap: Record<string, BridgeHumanReviewResponse> = {};

      if (useBackendData) {
        const resolvedReviews = await Promise.all(
          baseCandidates.map(async (candidate) => {
            try {
              const review = await fetchBridgeHumanReview(candidate.runId);
              return [candidate.runId, review] as const;
            } catch {
              return null;
            }
          }),
        );

        const indexed = resolvedReviews.reduce<Record<string, BridgeHumanReviewResponse>>((accumulator, row) => {
          if (!row) {
            return accumulator;
          }
          accumulator[row[0]] = row[1];
          return accumulator;
        }, {});
        reviewMap = indexed;
      } else {
        reviewMap = {};
      }

      setReviewsByRunId(reviewMap);

      const candidates = buildCandidates(sourceEvents, reviewMap);
      if (!candidates.length) {
        setShowScorePopover(false);
        return;
      }

      const queryRunId = readQueryValue(router.query.runId);
      const effectiveRunId = pickSelectedRunId(candidates, queryRunId || null);
      const defaultRunId = candidates[0]?.runId ?? '';
      syncQueryParam(router, 'runId', effectiveRunId ?? '', {
        omitWhen: (value) => value === defaultRunId,
      });
      setShowScorePopover(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load auditor workstation data');
    } finally {
      setIsLoading(false);
    }
  }, [mockEvents, router, useBackendData, windowHours]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  useEffect(() => {
    if (!showScorePopover) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (scorePopoverRef.current && !scorePopoverRef.current.contains(event.target as Node)) {
        setShowScorePopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showScorePopover]);

  const candidates = useMemo(() => buildCandidates(events, reviewsByRunId), [events, reviewsByRunId]);
  const selectedRunId = useMemo(() => {
    const queryRunId = readQueryValue(router.query.runId);
    return pickSelectedRunId(candidates, queryRunId || null);
  }, [candidates, router.query.runId]);

  useEffect(() => {
    const defaultRunId = candidates[0]?.runId ?? '';
    syncQueryParam(router, 'runId', selectedRunId ?? '', {
      omitWhen: (value) => value === defaultRunId,
    });
  }, [candidates, router, selectedRunId]);

  const pending = useMemo(() => candidates.filter((item) => !item.review), [candidates]);
  const reviewed = useMemo(() => candidates.filter((item) => item.review), [candidates]);
  const kpis = useMemo(() => buildAuditorQueueKpis(pending, reviewed), [pending, reviewed]);
  const selected = useMemo(() => getSelectedCandidate(candidates, pending, reviewed, selectedRunId), [candidates, pending, reviewed, selectedRunId]);
  const openFollowUps = useMemo(() => buildOpenFollowUps(reviewed), [reviewed]);
  const selectedDisplayScore = useMemo(() => getSelectedDisplayScore(selected), [selected]);

  const commitSelectedRunId = useCallback((nextRunId: string | null) => {
    if (!router.isReady) {
      return;
    }

    const currentRunId = readQueryValue(router.query.runId);
    const desiredRunId = nextRunId ?? '';
    if (currentRunId === desiredRunId) {
      return;
    }

    const nextQuery: Record<string, string> = {};
    Object.entries(router.query).forEach(([key, rawValue]) => {
      if (key === 'runId') {
        return;
      }
      const normalized = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      if (normalized) {
        nextQuery[key] = normalized;
      }
    });

    const defaultRunId = candidates[0]?.runId ?? '';
    if (desiredRunId && desiredRunId !== defaultRunId) {
      nextQuery.runId = desiredRunId;
    }

    void router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true, scroll: false },
    );
  }, [candidates, router]);

  const handleSelectRun = (runId: string, recommendation: 'approved' | 'rejected') => {
    commitSelectedRunId(runId);
    setShowScorePopover(false);
    setDraft((current) => ({ ...current, decision: recommendation }));
  };

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
            next_task_assignee:
              draft.decision === 'rejected' && draft.nextTaskType === 'manual_follow_up'
                ? draft.nextTaskAssignee.trim()
                : undefined,
            next_task_instructions: draft.decision === 'rejected' ? draft.nextTaskInstructions.trim() || undefined : undefined,
            assignee_notified: draft.decision === 'rejected',
          })
        : createLocalBridgeReview({
            runId: selected.runId,
            documentId: selected.documentId,
            decision: draft.decision,
            reason,
            reviewerEmail: currentUser?.email || 'local-user',
            reviewerRoles: currentUser?.roles || ['local'],
            nextTaskType: draft.nextTaskType,
            nextTaskAssignee: draft.nextTaskAssignee,
            nextTaskInstructions: draft.nextTaskInstructions,
          });

      setReviewsByRunId((current) => ({ ...current, [selected.runId]: saved }));
      const nextPending = pending.find((item) => item.runId !== selected.runId);
      if (nextPending) {
        commitSelectedRunId(nextPending.runId);
      }
      setDraft(createInitialDecisionDraft());
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
            <div className={getHeaderToggleGroupClass()}>
              {AUDITOR_WINDOWS.map((option) => {
                const active = option.value === windowHours;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setWindowHours(option.value)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${getSelectionButtonClass({
                      isSelected: active,
                      tone: 'blue',
                      selectedClass: 'bg-blue-600 text-white',
                    })}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className={getHeaderControlClass('neutral')}
            >
              <LuRefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => router.push('/audit-trail')}
              className={getHeaderControlClass('neutral')}
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

      <AuditorWorkstationKpiGrid kpis={kpis} />

      {isLoading && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center gap-3 text-neutral-600">
          <LuLoader className="w-5 h-5 animate-spin" />
          Loading workstation data...
        </div>
      )}

      {!isLoading && error && <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-sm text-rose-700">{error}</div>}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <AuditorPendingQueuePanel pending={pending} selectedRunId={selected?.runId || null} onSelectRun={handleSelectRun} />

          <div className="xl:col-span-2 space-y-4">
            <AuditorDecisionPanel
              selected={selected}
              selectedDisplayScore={selectedDisplayScore}
              showScorePopover={showScorePopover}
              scorePopoverRef={scorePopoverRef}
              onToggleScorePopover={() => setShowScorePopover((current) => !current)}
              onCloseScorePopover={() => setShowScorePopover(false)}
              canApprove={canApprove}
              draft={draft}
              onDraftChange={(updater) => setDraft((current) => updater(current))}
              submitError={submitError}
              isSubmitting={isSubmitting}
              onSubmitDecision={() => void submitDecision()}
            />
            <AuditorFollowUpPanel openFollowUps={openFollowUps} />
          </div>
        </div>
      )}

      <FooterInfoCard title="Governance note" accent="indigo">
        Audit Trail remains read-only chronology for governance evidence. Auditor Workstation is the operational decision page for HITL approvals and rejection follow-up assignment.
      </FooterInfoCard>
    </div>
  );
};

export default AuditorWorkstationPage;
