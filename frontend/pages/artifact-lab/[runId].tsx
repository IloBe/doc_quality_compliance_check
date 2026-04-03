import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useMemo, useState } from 'react';
import {
  LuBookOpen,
  LuBot,
  LuCheck,
  LuDownload,
  LuExternalLink,
  LuFileText,
  LuLoader,
  LuMessageSquare,
  LuSave,
  LuSend,
  LuShieldCheck,
  LuX,
  LuFlag,
} from 'react-icons/lu';
import FooterInfoCard from '../../components/FooterInfoCard';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';
import { getButtonClass } from '../../components/buttonStyles';
import { exportArtifactMarkdown, exportArtifactPdf, pushArtifactToWiki } from '../../lib/artifactExportClient';
import {
  applyLatestProposalToDrafts,
  ArtifactChatMsg,
  ArtifactDraft,
  buildInitialArtifactDrafts,
  computeCitationCoverage,
  createAskAuthorAssistantReply,
  resolveRunLinkedDocuments,
  resolveWorkflowDocumentForArtifact,
} from '../../lib/artifactLabViewModel';
import { useMockStore } from '../../lib/mockStore';
import { getSelectionStyles } from '../../lib/selectionStyles';

const ArtifactLabRunPage = () => {
  const router = useRouter();
  const runId = typeof router.query.runId === 'string' ? router.query.runId : '';

  const bridgeRuns = useMockStore((state) => state.bridgeRuns);
  const documents = useMockStore((state) => state.documents);
  const enqueueExport = useMockStore((state) => state.enqueueExport);

  const [selectedArtifactId, setSelectedArtifactId] = useState('art-arc42');
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingMd, setIsExportingMd] = useState(false);
  const [isPushingWiki, setIsPushingWiki] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [isAskOverlayOpen, setIsAskOverlayOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [askSessionDecision, setAskSessionDecision] = useState<'not_decided' | 'resolved' | 'escalate'>('not_decided');
  const [askDecisionRationale, setAskDecisionRationale] = useState('');
  const [askSessionError, setAskSessionError] = useState<string | null>(null);
  const [isProposalApplied, setIsProposalApplied] = useState(false);
  const [chat, setChat] = useState<ArtifactChatMsg[]>([
    {
      id: 'msg-1',
      role: 'assistant',
      text: 'I can refine sections, add missing controls, or convert findings into audit-ready wording. What should be improved?',
      at: new Date().toLocaleTimeString(),
    },
  ]);

  const run = useMemo(() => bridgeRuns.find((item) => item.id === runId), [bridgeRuns, runId]);
  const resolvedRunId = run?.id ?? runId;

  const { linkedDocuments: runDocs, primaryDocument: primaryDoc } = useMemo(
    () => resolveRunLinkedDocuments(run, documents),
    [documents, run],
  );

  const [artifactDrafts, setArtifactDrafts] = useState<ArtifactDraft[]>(() => buildInitialArtifactDrafts());

  const selectedArtifact = artifactDrafts.find((x) => x.id === selectedArtifactId) || artifactDrafts[0];
  const workflowDoc = useMemo(
    () => resolveWorkflowDocumentForArtifact(selectedArtifact.kind, runDocs, primaryDoc),
    [primaryDoc, runDocs, selectedArtifact.kind],
  );

  const coverage = useMemo(() => {
    return computeCitationCoverage(selectedArtifact.citations);
  }, [selectedArtifact.citations]);

  const updateContent = (newValue: string) => {
    setArtifactDrafts((prev) => prev.map((item) => (item.id === selectedArtifact.id ? { ...item, content: newValue } : item)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorInfo(null);
    setSaveInfo(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setSaveInfo(`Saved ${selectedArtifact.title} at ${new Date().toLocaleTimeString()}`);
    } catch {
      setErrorInfo('Saving failed. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!primaryDoc) {
      setErrorInfo('No linked document found for PDF export.');
      return;
    }

    setIsExportingPdf(true);
    setErrorInfo(null);
    try {
      enqueueExport(primaryDoc.id);

      const result = await exportArtifactPdf({
        runId: resolvedRunId,
        artifactId: selectedArtifact.id,
        artifactTitle: selectedArtifact.title,
        artifactContent: selectedArtifact.content,
        documentId: primaryDoc.id,
      });

      if (!result.ok) {
        setErrorInfo(`PDF export failed: ${result.message}`);
        return;
      }

      const modeHint = result.degradedToDemo
        ? ' Demo fallback is active (backend endpoint not configured).'
        : '';
      setSaveInfo(`${result.message}. Export job queued for ${primaryDoc.title}.${modeHint}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportMarkdown = async () => {
    setIsExportingMd(true);
    setErrorInfo(null);
    try {
      const result = await exportArtifactMarkdown({
        runId: resolvedRunId,
        artifactId: selectedArtifact.id,
        artifactTitle: selectedArtifact.title,
        artifactContent: selectedArtifact.content,
        documentId: primaryDoc?.id,
      });

      if (!result.ok) {
        setErrorInfo(`Markdown export failed: ${result.message}`);
        return;
      }

      const modeHint = result.degradedToDemo
        ? ' Demo fallback is active (backend endpoint not configured).'
        : '';
      setSaveInfo(`${result.message}.${modeHint}`);
    } finally {
      setIsExportingMd(false);
    }
  };

  const handlePushWiki = async () => {
    setIsPushingWiki(true);
    setErrorInfo(null);
    try {
      const result = await pushArtifactToWiki({
        runId: resolvedRunId,
        artifactId: selectedArtifact.id,
        artifactTitle: selectedArtifact.title,
        artifactContent: selectedArtifact.content,
        documentId: primaryDoc?.id,
      });

      if (!result.ok) {
        setErrorInfo(`Wiki push failed: ${result.message}`);
        return;
      }

      const modeHint = result.degradedToDemo
        ? ' Demo fallback is active (stored in local wiki queue).'
        : '';
      setSaveInfo(`${result.message}.${modeHint}`);
    } finally {
      setIsPushingWiki(false);
    }
  };

  const submitAskAuthor = () => {
    const text = chatInput.trim();
    if (!text) {
      return;
    }

    const userMsg: ArtifactChatMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      at: new Date().toLocaleTimeString(),
    };
    const assistantMsg: ArtifactChatMsg = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: createAskAuthorAssistantReply(selectedArtifact.title),
      at: new Date().toLocaleTimeString(),
    };

    setChat((prev) => [...prev, userMsg, assistantMsg]);
    setChatInput('');
  };

  const openAskOverlay = () => {
    setIsAskOverlayOpen(true);
    setAskSessionDecision('not_decided');
    setAskDecisionRationale('');
    setAskSessionError(null);
    setIsProposalApplied(false);
  };

  const applyLatestProposal = () => {
    const stamp = new Date().toLocaleTimeString();
    setArtifactDrafts((prev) => applyLatestProposalToDrafts(prev, selectedArtifact.id, stamp));

    setIsProposalApplied(true);
    setAskSessionError(null);
    setChat((prev) => [
      ...prev,
      {
        id: `a-applied-${Date.now()}`,
        role: 'assistant',
        text: 'Proposal applied to the artifact draft. Please review, then either resolve or escalate this session with a rationale.',
        at: stamp,
      },
    ]);
    setSaveInfo('Author proposal applied to draft. Review the updated content before finishing the session.');
  };

  const finishAskSession = () => {
    const rationale = askDecisionRationale.trim();
    if (askSessionDecision === 'not_decided') {
      setAskSessionError('Select a session outcome: Resolved or Escalate to HITL reviewer.');
      return;
    }
    if (rationale.length < 10) {
      setAskSessionError('Provide a short rationale (at least 10 characters) before ending the session.');
      return;
    }

    const outcome = askSessionDecision === 'resolved' ? 'resolved in Artifact Lab' : 'escalated to HITL review';
    const proposalNote = isProposalApplied ? 'Proposal applied.' : 'No proposal applied.';
    setSaveInfo(`Ask the Author session ${outcome}. ${proposalNote} Rationale recorded.`);
    setAskSessionError(null);
    setIsAskOverlayOpen(false);
  };

  if (!runId) {
    return <div className="text-sm text-neutral-600">Loading run context...</div>;
  }

  if (!run) {
    return (
      <div className="space-y-6">
        <PageHeaderWithWhy
          eyebrow="Generation & Push"
          title="Artifact Lab"
          subtitle="Run not found"
          whyDescription="Artifact Lab requires a valid Bridge run context to keep generated artifacts and citations traceable."
        />
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
          <p className="text-neutral-700 mb-4">No run found for ID: {runId}</p>
          <Link
            href="/artifact-lab"
            className={getButtonClass({ variant: 'primary', size: 'md', extra: 'text-sm normal-case tracking-normal font-semibold' })}
          >
            Back to Artifact Lab
            <LuExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Generation & Push"
        title="Artifact Lab"
        subtitle={`Run ${run.id} · ${run.product} · Status: ${run.status}`}
        whyDescription="Artifact Lab provides split-view generation and refinement. It links artifact content with compliance citations, enables rapid author feedback via Ask the Author, and supports export handoff with traceability."
        rightContent={
          <div className="flex items-center gap-2">
            <Link
              href="/artifact-lab"
              className={getButtonClass({ variant: 'neutral', size: 'sm' })}
            >
              Exit workflow
            </Link>
            <button
              type="button"
              onClick={openAskOverlay}
              className={getButtonClass({ variant: 'primary', size: 'md' })}
            >
              <LuMessageSquare className="w-4 h-4" />
              Ask the Author
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <aside className="xl:col-span-3 bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500">Artifacts</h2>
          <div className="space-y-2">
            {artifactDrafts.map((item) => {
              const active = item.id === selectedArtifact.id;
              const selectionStyles = getSelectionStyles({
                isSelected: active,
                tone: 'blue',
                defaultRowClass: 'border-neutral-200 bg-white',
                idleRowClass: 'hover:bg-neutral-50',
                defaultPrimaryTextClass: 'text-neutral-800',
                defaultSecondaryTextClass: 'text-neutral-400',
              });
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedArtifactId(item.id)}
                  className={`w-full text-left rounded-xl border p-3 transition ${selectionStyles.rowClass}`}
                >
                  <div className={`text-xs font-black uppercase tracking-wider mb-1 ${selectionStyles.secondaryTextClass}`}>{item.kind}</div>
                  <div className={`font-semibold text-sm leading-snug ${selectionStyles.primaryTextClass}`}>{item.title}</div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-neutral-100">
            <div className="text-[11px] uppercase tracking-widest text-neutral-400 mb-2 font-black">Linked documents</div>
            <div className="space-y-2">
              {runDocs.slice(0, 3).map((doc) => (
                <Link
                  key={doc.id}
                  href={`/doc/${encodeURIComponent(doc.id)}/content`}
                  className="block rounded-lg border border-neutral-200 px-3 py-2 hover:bg-neutral-50 transition"
                >
                  <div className="text-xs font-semibold text-neutral-800 line-clamp-1">{doc.title}</div>
                  <div className="text-[11px] text-neutral-500">{doc.id} · {doc.updatedAt}</div>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <main className="xl:col-span-6 bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-neutral-900 tracking-tight">{selectedArtifact.title}</h2>
              <p className="text-xs text-neutral-500 mt-1">Editable draft workspace (Markdown)</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={getButtonClass({ variant: 'primary', size: 'sm' })}
              >
                {isSaving ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuSave className="w-4 h-4" />}
                Save draft
              </button>
            </div>
          </div>

          {saveInfo && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700 font-semibold">{saveInfo}</div>}
          {errorInfo && <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700 font-semibold">{errorInfo}</div>}

          <textarea
            value={selectedArtifact.content}
            onChange={(e) => updateContent(e.target.value)}
            className="w-full min-h-[420px] rounded-xl border border-neutral-200 p-4 text-sm leading-relaxed text-neutral-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
            <div className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-2">Export center</div>
            <div className="overflow-x-auto">
              <div className="flex flex-nowrap items-center gap-2 min-w-max">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className={getButtonClass({ variant: 'soft-blue', size: 'sm' })}
              >
                {isExportingPdf ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuDownload className="w-4 h-4" />}
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleExportMarkdown}
                disabled={isExportingMd}
                className={getButtonClass({ variant: 'neutral', size: 'sm' })}
              >
                {isExportingMd ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuFileText className="w-4 h-4" />}
                Export MD
              </button>
              <button
                type="button"
                onClick={handlePushWiki}
                disabled={isPushingWiki}
                className={getButtonClass({ variant: 'soft-violet', size: 'sm' })}
              >
                {isPushingWiki ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuBookOpen className="w-4 h-4" />}
                Push to Wiki
              </button>
              {workflowDoc && (
                <Link
                  href={`/doc/${encodeURIComponent(workflowDoc.id)}/bridge`}
                  className={getButtonClass({ variant: 'soft-emerald', size: 'sm' })}
                >
                  <LuExternalLink className="w-4 h-4" />
                  Open workflow
                </Link>
              )}
              </div>
            </div>
          </div>
        </main>

        <aside className="xl:col-span-3 bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500">Compliance citations</h2>

          <div className="rounded-xl border border-neutral-200 p-3 bg-neutral-50">
            <div className="text-[11px] text-neutral-500 uppercase tracking-widest font-black mb-1">Coverage</div>
            <div className="text-2xl font-black text-neutral-900">{coverage.pct}%</div>
            <div className="text-xs text-neutral-500">{coverage.mapped} of {coverage.all} mapped</div>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {selectedArtifact.citations.map((citation) => (
              <div key={citation.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-xs font-black uppercase tracking-widest text-neutral-400">{citation.source}</div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                      citation.status === 'mapped' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {citation.status === 'mapped' ? <LuCheck className="w-3 h-3" /> : <LuX className="w-3 h-3" />}
                    {citation.status}
                  </span>
                </div>
                <div className="text-sm font-semibold text-neutral-800 mb-1">{citation.section}</div>
                <div className="text-xs text-neutral-600 leading-relaxed">{citation.note}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 leading-relaxed">
            <div className="font-black uppercase tracking-wider text-blue-600 mb-1">Traceability hint</div>
            Each citation should map to explicit evidence in document workflow and audit trail before final approval.
          </div>
        </aside>
      </div>

      {isAskOverlayOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 p-4 flex items-end md:items-center justify-center">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-neutral-900 tracking-tight">Ask the Author</div>
                <div className="text-xs text-neutral-500">Goal: resolve missing/failed topics or escalate with rationale.</div>
              </div>
              <button
                type="button"
                onClick={() => setIsAskOverlayOpen(false)}
                className="p-1 rounded-xl text-neutral-500 hover:bg-neutral-100"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-neutral-100 bg-blue-50">
              <div className="text-[11px] font-black uppercase tracking-widest text-blue-700 mb-1">Session objective</div>
              <p className="text-xs text-blue-800 leading-relaxed">
                1) Describe missing/failed topic. 2) Apply proposal if acceptable. 3) End session with decision + rationale.
              </p>
            </div>

            <div className="p-5 space-y-3 max-h-[50vh] overflow-auto bg-neutral-50">
              {chat.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-3 text-sm ${
                    msg.role === 'assistant'
                      ? 'bg-white border border-neutral-200 text-neutral-700'
                      : 'bg-blue-600 text-white ml-auto max-w-[80%]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 text-[11px] opacity-80 font-semibold">
                    {msg.role === 'assistant' ? <LuBot className="w-3.5 h-3.5" /> : <LuMessageSquare className="w-3.5 h-3.5" />}
                    {msg.role === 'assistant' ? 'Author Agent' : 'You'} · {msg.at}
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-neutral-100 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitAskAuthor();
                  }
                }}
                placeholder="Ask for a section rewrite or additional citation…"
                className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={submitAskAuthor}
                className={getButtonClass({ variant: 'primary', size: 'sm', extra: 'text-sm normal-case tracking-normal font-semibold' })}
              >
                <LuSend className="w-4 h-4" />
                Send
              </button>
            </div>

            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={applyLatestProposal}
                  className={getButtonClass({ variant: 'soft-blue', size: 'sm', extra: 'normal-case tracking-normal text-xs' })}
                >
                  <LuCheck className="w-4 h-4" />
                  Apply latest proposal
                </button>
                <button
                  type="button"
                  onClick={() => setIsAskOverlayOpen(false)}
                  className={getButtonClass({ variant: 'neutral', size: 'sm', extra: 'normal-case tracking-normal text-xs' })}
                >
                  <LuX className="w-4 h-4" />
                  Stop chat (continue later)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={askSessionDecision}
                  onChange={(e) => setAskSessionDecision(e.target.value as 'not_decided' | 'resolved' | 'escalate')}
                  className="md:col-span-1 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="not_decided">Select outcome</option>
                  <option value="resolved">Resolved in Artifact Lab</option>
                  <option value="escalate">Escalate to HITL reviewer</option>
                </select>
                <input
                  value={askDecisionRationale}
                  onChange={(e) => setAskDecisionRationale(e.target.value)}
                  placeholder="Decision rationale (required)"
                  className="md:col-span-2 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {askSessionError ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-700 font-semibold">
                  {askSessionError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={finishAskSession}
                className={getButtonClass({ variant: 'soft-emerald', size: 'sm', fullWidth: true, extra: 'normal-case tracking-normal text-xs' })}
              >
                <LuFlag className="w-4 h-4" />
                Finish chat session
              </button>
            </div>
          </div>
        </div>
      )}

      <FooterInfoCard title="Governance note" accent="blue">
        Generated and refined artifacts should be reviewed through HITL before release. Use linked document workflow pages for decision recording, then monitor exports in the registry.
      </FooterInfoCard>
    </div>
  );
};

export default ArtifactLabRunPage;
