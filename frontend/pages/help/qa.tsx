import React, { useMemo, useState } from 'react';
import { LuListChecks } from 'react-icons/lu';
import FooterInfoCard from '../../components/FooterInfoCard';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';

type QaEntry = {
  id: string;
  question: string;
  answer: string;
  examples: string[];
};

const entries: QaEntry[] = [
  {
    id: 'audit-payload-insight',
    question: 'What is the insight of the payload card of the audit trail page?',
    answer:
      'The payload card is the event-evidence drilldown. The timeline already shows who, what, and when; the payload card shows the event-specific context needed for governance review, compliance evidence, and post-incident analysis.',
    examples: [
      'Example 1: For event_type `bridge.run.approved`, payload can show `{ "verdict": "approved", "risk_level": "high", "comments": "Escalation path validated." }`, which documents why and under which risk context approval happened.',
      'Example 2: For event_type `auth.recovery.password_reset`, payload can show `{ "reset_via": "recovery_token", "token_single_use": true }`, which proves recovery-control behavior relevant for audit and security reviews.',
    ],
  },
  {
    id: 'bridge-behavior-purpose',
    question: 'What is the bridge behaviour used for?',
    answer:
      'Bridge behavior is used to orchestrate the governed multi-step workflow across agents and controls. It coordinates sequence, applies policy checks, and records traceable outcomes so compliance decisions are reproducible and auditable.',
    examples: [
      'Example: During a document run, Bridge executes inspection and compliance analysis, routes high-risk findings to HITL approval, and logs events like `bridge.run.completed` and `bridge.run.approved` with correlation context for audit evidence.',
    ],
  },
  {
    id: 'arc42-purpose',
    question: 'What is the purpose of the arc42 documentation?',
    answer:
      'arc42 provides a structured architecture documentation template so teams can explain system context, building blocks, runtime behavior, decisions, risks, and quality goals in a consistent way. It reduces ambiguity, improves review quality, and supports traceability across engineering, QA, and audit stakeholders.',
    examples: [
      'Example: In an AI quality platform, arc42 section 5 (Building Block View) can document which service performs compliance checks and which service handles HITL review persistence, so responsibilities are clear during audits and incident analysis.',
    ],
  },
  {
    id: 'sop-definition-usage',
    question: 'What are SOPs and what are they used for?',
    answer:
      'SOPs (Standard Operating Procedures) are controlled, versioned instructions that define how critical processes must be executed. They are used to ensure repeatability, role clarity, and evidence-ready execution for quality management and regulatory requirements.',
    examples: [
      'Example: An SOP for document approval can define required reviewers, approval criteria, and required audit events before release, ensuring every release follows the same governed process.',
    ],
  },
  {
    id: 'risk-hazard-mitigation-definitions',
    question: 'What are the definitions of Risk, Hazardous Situation and Risk Mitigation? Why are they important?',
    answer:
      'Risk is the combination of the probability of harm and the severity of that harm. A hazardous situation is a circumstance in which people, property, or operations are exposed to a hazard. Risk mitigation is the set of measures used to reduce risk to an acceptable level. These concepts are important because they drive prioritization, escalation, and control design in regulated workflows.',
    examples: [
      'Low-risk example: A typo in a dashboard label creates minor confusion (low severity, low probability of harm). Mitigation can be a normal correction in the next patch cycle.',
      'High-risk example: A compliance report misclassifies a mandatory EU AI Act control as passed when it actually failed. This can lead to unsafe release decisions (high severity). Mitigation requires immediate escalation, manual HITL review, corrected logic, and re-validation before approval.',
    ],
  },
  {
    id: 'governance-vs-compliance',
    question: 'What does governance mean and why is it different to compliance?',
    answer:
      'Governance is the decision-and-control framework: who decides, by which rules, with what accountability, and how evidence is tracked. Compliance is the state of meeting specific external or internal requirements. Governance defines the system for making and enforcing decisions; compliance is one outcome measured against those rules and regulations.',
    examples: [
      'Example 1 (governance): Defining that high-risk bridge outcomes require Risk Manager sign-off plus immutable audit logging before release.',
      'Example 2 (compliance): Demonstrating that a released document satisfies required EU AI Act and SOP controls, with evidence proving each mandatory check passed.',
    ],
  },
  {
    id: 'hitl-bridge-process-explained',
    question: 'How does the HITL process for bridge run works, how is it connected with the automatic process?',
    answer:
      'The Bridge run starts with automatic checks: the system analyzes the document, checks key rules, and prepares a suggested result. After that, a human review step is required: a person must approve or reject and give a short reason. If rejected, the reviewer proposes the next action, such as running the check again or assigning a specific person for manual follow-up. This keeps the process fast through automation, but safe and accountable through human decision-making.',
    examples: [
      'Main parts in order: automatic analysis → quality gate summary → human approval/rejection with reason → optional follow-up task and assignment if rejected → stored audit record (who decided, when, and why).',
    ],
  },
];

const HelpQaPage = () => {
  const [selectedId, setSelectedId] = useState(entries[0]?.id ?? '');

  const selected = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null,
    [selectedId],
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Help & Snippets / Q&A"
        title="Q&A"
        subtitle="Focused answers for recurring governance and reporting questions."
        whyDescription="Q&A entries convert operational uncertainty into repeatable guidance so teams respond consistently during audits and compliance checks."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Questions</h2>
          <div className="space-y-2">
            {entries.map((entry) => {
              const active = entry.id === selected?.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm border transition ${
                    active
                      ? 'bg-blue-50 text-blue-800 border-blue-200 font-semibold'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {entry.question}
                </button>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 text-sm text-neutral-500">No Q&A entries found.</div>
          ) : (
            <>
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Question</div>
                <h2 className="text-xl font-black text-neutral-900">{selected.question}</h2>
                <div className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Answer</div>
                <p className="text-sm text-neutral-700 leading-relaxed">{selected.answer}</p>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3 inline-flex items-center gap-2">
                  <LuListChecks className="w-4 h-4" />
                  Examples
                </h3>
                <div className="space-y-3">
                  {selected.examples.map((example) => (
                    <div key={example} className="text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl p-3">
                      {example}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <FooterInfoCard title="Editorial rule" accent="indigo">
        Each Q&A item should include concrete examples with event types and payload fields to keep guidance audit-ready.
      </FooterInfoCard>
    </div>
  );
};

export default HelpQaPage;
