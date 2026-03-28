import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useMockStore } from '../lib/mockStore';
import { useCan } from '../lib/authContext';
import WhyThisPageMatters from './WhyThisPageMatters';
import {
  BridgeRunResponse,
  executeBridgeEuAiActRun,
  fetchBridgeEuAiActAlert,
} from '../lib/bridgeClient';
import {
  LuTriangle,
  LuCheck,
  LuCircleCheck,
  LuCpu,
  LuFileText,
  LuHistory,
  LuInfo,
  LuLoader,
  LuPlay,
  LuX,
} from 'react-icons/lu';

const DocBridgePage = () => {
  const router = useRouter();
  const { docId } = router.query;

  const { getDocById, updateDocStatus } = useMockStore();
  const canRunBridge = useCan('bridge.run');

  const [doc, setDoc] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showWhyThisPageMatters, setShowWhyThisPageMatters] = useState(false);
  const [backendRun, setBackendRun] = useState<BridgeRunResponse | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [showRegulatoryPopup, setShowRegulatoryPopup] = useState(false);
  const [runStartedAtLeastOnce, setRunStartedAtLeastOnce] = useState(false);
  const autoRunStarted = useRef(false);

  const useBackendBridge = process.env.NEXT_PUBLIC_BRIDGE_SOURCE === 'backend';

  useEffect(() => {
    if (docId) {
      autoRunStarted.current = false;
      setRunStartedAtLeastOnce(false);
      setBackendRun(null);
      setActiveStep(0);
      setLogs([]);

      const resolved = getDocById(docId as string);
      if (resolved) {
        setDoc(resolved);
        return;
      }

      if (useBackendBridge) {
        setDoc({
          id: docId as string,
          title: `Document ${docId as string}`,
          type: 'Generic',
        });
      }
    }
  }, [docId, getDocById, useBackendBridge]);

  useEffect(() => {
    if (!doc || !useBackendBridge) {
      return;
    }

    let mounted = true;
    const loadAlert = async () => {
      try {
        const alert = await fetchBridgeEuAiActAlert(doc.id);
        if (mounted && alert.regulatory_update.requires_document_update) {
          setShowRegulatoryPopup(true);
        }
      } catch {
        // silent fallback
      }
    };

    loadAlert();
    return () => {
      mounted = false;
    };
  }, [doc, useBackendBridge]);

  const steps = [
    { id: 'inspect', title: 'Inspection Agent', desc: 'Scan text for logical structure and quality.' },
    { id: 'compliance', title: 'Compliance Agent', desc: 'Verify adherence to ISO/SOP standards.' },
    { id: 'research', title: 'Research Agent', desc: 'Cross-reference external regulations.' },
    { id: 'approval', title: 'Quality Gate', desc: 'Final scoring and report generation.' },
  ];

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const inferDomainInfo = () => {
    const docType = (doc?.type ?? '').toLowerCase();
    if (docType === 'rmf' || docType === 'fmea') {
      return {
        domain: 'medical devices',
        description: `Risk management workflow for ${doc?.title ?? 'AI product'}`,
        uses_ai_ml: true,
        intended_use: 'Risk classification and quality assurance support',
        target_market: 'EU',
      };
    }
    if (docType === 'sop') {
      return {
        domain: 'quality management',
        description: `Quality process control document: ${doc?.title ?? ''}`,
        uses_ai_ml: true,
        intended_use: 'Governed process execution and documentation control',
        target_market: 'EU',
      };
    }
    return {
      domain: 'general',
      description: `${doc?.title ?? 'Technical document'} governance assessment`,
      uses_ai_ml: true,
      intended_use: 'Compliance and documentation quality support',
      target_market: 'EU',
    };
  };

  const getComplianceChecks = () => {
    if (backendRun) {
      return backendRun.requirements.map((req) => ({
        name: `${req.requirement_id} — ${req.title}`,
        passed: req.passed,
      }));
    }

    const docType = (doc?.type ?? '').toLowerCase();
    if (docType === 'sop') {
      return [
        { name: 'ISO 9001:2015 — Clause 7.5 (Documented Information)', passed: true },
        { name: 'ISO 13485:2016 — Clause 4.2.4 (Control of Documents)', passed: true },
        { name: 'SOP-QMS-DOC-001 — Document Approval Workflow', passed: false },
      ];
    }
    if (docType === 'rmf' || docType === 'fmea') {
      return [
        { name: 'ISO 14971:2019 — Risk Management Process', passed: true },
        { name: 'ISO 9001:2015 — Clause 6.1 (Risk & Opportunities)', passed: true },
        { name: 'SOP-RISK-002 — Risk Review Sign-off', passed: false },
      ];
    }
    return [
      { name: 'ISO 9001:2015 — Clause 7.5 (Documented Information)', passed: true },
      { name: 'ISO/IEC 27001:2022 — A.8.15 (Logging)', passed: false },
      { name: 'SOP-QMS-DOC-001 — Document Approval Workflow', passed: true },
    ];
  };

  const getResearchChecks = () => {
    const docType = (doc?.type ?? '').toLowerCase();
    if (docType === 'sop') {
      return [
        { name: 'EU AI Act — Art. 9 (Risk Management System)', passed: true },
        { name: 'EU AI Act — Art. 12 (Record-Keeping)', passed: true },
        { name: 'MDR 2017/745 — Annex IX (QMS Technical Documentation)', passed: false },
      ];
    }
    if (docType === 'rmf' || docType === 'fmea') {
      return [
        { name: 'EU AI Act — Art. 10 (Data and Data Governance)', passed: true },
        { name: 'EU AI Act — Art. 14 (Human Oversight)', passed: false },
        { name: 'ISO 14971:2019 — Risk Control Verification', passed: true },
      ];
    }
    return [
      { name: 'EU AI Act — Annex IV (Technical Documentation)', passed: false },
      { name: 'ISO/IEC 27001:2022 — A.5.36 (Compliance with Policies)', passed: true },
      { name: 'NIST AI RMF — Govern Function Mapping', passed: true },
    ];
  };

  const complianceChecks = getComplianceChecks();
  const researchChecks = getResearchChecks();

  const qualityGateSummary = useMemo(() => {
    const allChecks = [...complianceChecks, ...researchChecks];
    const passed = allChecks.filter((check) => check.passed).length;
    const failed = allChecks.length - passed;

    if (isProcessing) {
      return {
        heading: 'Final decision pending',
        text: 'The Quality Gate is consolidating control outcomes and evidence references from prior agents. A final score and report package will be generated after all mandatory checks are completed.',
      };
    }

    if (activeStep < steps.length - 1) {
      return {
        heading: 'Awaiting Quality Gate execution',
        text: 'Scoring has not started yet because earlier workflow stages are still in progress. Final report generation will begin once Compliance and Research checks are finalized.',
      };
    }

    if (failed > 0) {
      return {
        heading: 'Conditional result: remediation required',
        text: `The Quality Gate recorded ${passed} passed and ${failed} failed controls, so release recommendation remains restricted until remediation is documented. A report draft was generated with failure traceability for audit follow-up.`,
      };
    }

    return {
      heading: 'Result: quality gate passed',
      text: `The Quality Gate recorded ${passed} passed and ${failed} failed controls, meeting the configured acceptance criteria for this artifact. A complete report package was generated with traceable evidence for release and audit review.`,
    };
  }, [activeStep, complianceChecks, isProcessing, researchChecks]);

  const handleStartRun = async () => {
    if (!doc) {
      return;
    }

    setRunStartedAtLeastOnce(true);
    setActiveStep(0);
    setLogs([]);
    setBridgeError(null);
    setBackendRun(null);
    setIsProcessing(true);
    setShowRegulatoryPopup(false);
    addLog(`Initiating Bridge Run for ${doc.id}...`);

    let runResult: BridgeRunResponse | null = null;

    try {
      for (let current = 0; current < steps.length; current += 1) {
        setActiveStep(current);
        addLog(`Step ${current + 1}: ${steps[current].title} active...`);

        if (useBackendBridge && current === 1) {
          runResult = await executeBridgeEuAiActRun(doc.id, inferDomainInfo());
          setBackendRun(runResult);
          addLog(`EU AI Act check complete. Score: ${Math.round((runResult.compliance_score || 0) * 100)}%.`);
        }

        await sleep(1200);
      }

      if (runResult && runResult.approved) {
        updateDocStatus(doc.id, 'Approved');
      }

      if (runResult?.regulatory_update?.requires_document_update) {
        setShowRegulatoryPopup(true);
      }

      addLog('Bridge Run successfully completed. Generating Report.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bridge run failed';
      setBridgeError(message);
      addLog(`Bridge Run failed: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!useBackendBridge || !doc || isProcessing || !canRunBridge || autoRunStarted.current) {
      return;
    }

    autoRunStarted.current = true;
    void handleStartRun();
  }, [canRunBridge, doc, isProcessing, useBackendBridge]);

  if (!doc) {
    return <div className="p-20 text-center animate-pulse text-neutral-400">Loading Document...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white border border-neutral-100 rounded-3xl shadow-xl flex items-center justify-center text-blue-600">
            <LuFileText className="w-8 h-8" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Bridge / Workflow</div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">{doc.title}</h1>
              <button
                type="button"
                onClick={() => setShowWhyThisPageMatters((prev) => !prev)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-blue-700 hover:bg-blue-50 transition"
                title="Why this page matters"
              >
                <LuInfo className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-50 border border-amber-100">
                Live Session
              </span>
            </div>
            <p className="text-neutral-500 font-medium">
              Document compliance session ID: <span className="text-neutral-900 font-mono tracking-tighter">{doc.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-white border border-neutral-200 text-neutral-600 font-bold rounded-2xl hover:bg-neutral-50 transition active:scale-95 uppercase text-xs tracking-widest shadow-sm"
          >
            Exit Workflow
          </button>
          <button
            onClick={handleStartRun}
            disabled={isProcessing || !canRunBridge}
            title={canRunBridge ? 'Execute Bridge Run' : 'Insufficient role permissions'}
            className={`flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition active:scale-95 uppercase text-xs tracking-widest shadow-xl shadow-blue-200 ${
              isProcessing || !canRunBridge ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isProcessing ? (
              <>
                <LuLoader className="w-4 h-4 animate-spin-slow" />
                Running Bridge...
              </>
            ) : (
              <>
                <LuPlay className="w-4 h-4 fill-current" />
                Execute Bridge Run
              </>
            )}
          </button>
        </div>
      </div>

      {showWhyThisPageMatters && (
        <WhyThisPageMatters description="This page executes and documents a single Bridge run for one artifact. It provides step-level visibility and timestamped logs so teams can demonstrate how a compliance conclusion was produced for that exact document." />
      )}

      {bridgeError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{bridgeError}</div>}

      {useBackendBridge && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700">
          Backend mode: EU AI Act compliance checks are executed via API and persisted with run evidence.
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-neutral-50 bg-neutral-50/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LuCpu className="w-5 h-5 text-blue-500" />
                <span className="font-bold text-neutral-800 tracking-tight">Agent Pipeline</span>
              </div>
              <div className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">4 Agents Active</div>
            </div>

            <div className="p-10 space-y-4 relative">
              {steps.map((step, idx) => {
                const isDone = idx < activeStep || (activeStep === steps.length - 1 && !isProcessing);
                const isActive = idx === activeStep && isProcessing;
                const hasComplianceOutput = runStartedAtLeastOnce && activeStep >= 1 && (!useBackendBridge || backendRun !== null);
                const hasResearchOutput = runStartedAtLeastOnce && activeStep >= 2;
                const hasApprovalOutput = runStartedAtLeastOnce && activeStep >= 3;

                return (
                  <div
                    key={step.id}
                    className={`group flex items-center gap-6 p-6 rounded-3xl border-2 transition-all duration-300 ${
                      isActive
                        ? 'border-blue-500 bg-blue-50/50 shadow-xl shadow-blue-100 ring-4 ring-blue-50'
                        : isDone
                          ? 'border-emerald-100 bg-emerald-50/30'
                          : 'border-neutral-50 border-dashed opacity-50'
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-blue-500 text-white shadow-xl shadow-blue-400 rotate-6'
                          : isDone
                            ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-400'
                            : 'bg-neutral-100 text-neutral-400'
                      }`}
                    >
                      {isDone ? <LuCircleCheck className="w-6 h-6" /> : <span className="font-black text-lg">{idx + 1}</span>}
                    </div>

                    <div className="flex-1">
                      <h3 className={`font-black text-lg tracking-tight mb-1 ${isActive ? 'text-blue-900' : isDone ? 'text-emerald-900' : 'text-neutral-400'}`}>
                        {step.title}
                      </h3>
                      <p className="text-sm font-medium text-neutral-400 group-hover:text-neutral-500 transition line-clamp-1 italic">{step.desc}</p>

                      {step.id === 'compliance' && hasComplianceOutput && (
                        <div className="mt-3 space-y-2">
                          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Checked ISO/SOP controls</div>
                          {complianceChecks.map((check) => (
                            <div key={check.name} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-white/80 px-3 py-2">
                              <span className="text-xs font-medium text-neutral-700 leading-tight">{check.name}</span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                                  check.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {check.passed ? <LuCheck className="w-3 h-3" /> : <LuX className="w-3 h-3" />}
                                {check.passed ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {step.id === 'research' && hasResearchOutput && (
                        <div className="mt-3 space-y-2">
                          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Cross-referenced regulations</div>
                          {researchChecks.map((check) => (
                            <div key={check.name} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-white/80 px-3 py-2">
                              <span className="text-xs font-medium text-neutral-700 leading-tight">{check.name}</span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                                  check.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {check.passed ? <LuCheck className="w-3 h-3" /> : <LuX className="w-3 h-3" />}
                                {check.passed ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {step.id === 'approval' && hasApprovalOutput && (
                        <div className="mt-3 space-y-2">
                          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Final result summary</div>
                          <div className="rounded-lg border border-neutral-100 bg-white/80 px-3 py-3">
                            <div className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">{qualityGateSummary.heading}</div>
                            <p className="text-xs text-neutral-700 leading-relaxed">{qualityGateSummary.text}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {isActive && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">
                        <LuLoader className="w-3 h-3 animate-spin-slow" />
                        Processing...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-neutral-900 text-neutral-300 p-8 rounded-[2.5rem] shadow-2xl h-full flex flex-col border border-neutral-800 ring-4 ring-neutral-900/5 transition">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <LuHistory className="w-5 h-5 text-neutral-500" />
                <span className="font-bold text-white tracking-tight">Stream Log</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[11px] leading-relaxed scrollbar-hide">
              {logs.length === 0 ? (
                <div className="text-neutral-600 italic">Waiting for execution...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`p-3 rounded-lg border border-transparent hover:border-neutral-800 transition ${i === 0 ? 'bg-neutral-800 text-white shadow-lg' : ''}`}>
                    {log}
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-neutral-800">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Context Parameters</div>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-neutral-800 pb-2">
                  <span className="text-[11px] font-bold">AAMAD_ADAPTER</span>
                  <span className="text-[11px] text-blue-400 font-mono">vscode_adapter</span>
                </div>
                <div className="flex justify-between items-end border-b border-neutral-800 pb-2">
                  <span className="text-[11px] font-bold">COMPLIANCE_LEVEL</span>
                  <span className="text-[11px] text-amber-400 font-mono">Strict ISO/IEC 27001</span>
                </div>
                <div className="flex justify-between items-end border-b border-neutral-800 pb-2">
                  <span className="text-[11px] font-bold">MODEL_PRIMARY</span>
                  <span className="text-[11px] text-neutral-400 font-mono">gemini-1.5-pro</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRegulatoryPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/45 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-amber-200 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-amber-700">
                <LuTriangle className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-widest">EU AI Act update detected</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegulatoryPopup(false)}
                className="p-1.5 rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                title="Close"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 text-sm text-neutral-700 space-y-3">
              <p>{backendRun?.regulatory_update?.message || 'EU AI Act requirements changed since the last approved bridge run.'}</p>
              <p>Please review and update this approved document, then execute a new Bridge run to maintain compliance traceability.</p>
            </div>

            <div className="px-5 pb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRegulatoryPopup(false)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-widest"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocBridgePage;
