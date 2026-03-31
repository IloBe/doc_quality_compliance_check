import React, { useState } from 'react';
import { LuBookOpen, LuFileSearch, LuPlus } from 'react-icons/lu';
import FooterInfoCard from '../../components/FooterInfoCard';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';
import { useSubstringFilter } from '../../lib/useSubstringFilter';

type GlossaryTerm = {
  term: string;
  definition: string;
  domain: string;
};

const terms: GlossaryTerm[] = [
  {
    term: 'Audit Trail',
    domain: 'Governance / Compliance',
    definition: 'Append-only chronology of events that records who performed what action, when, and in which context for audit evidence.',
  },
  {
    term: 'Payload',
    domain: 'Governance / Data',
    definition: 'Structured JSON details attached to an event. In Audit Trail, payload contains event-specific evidence fields for review and forensics.',
  },
  {
    term: 'Trace ID',
    domain: 'Observability / Governance',
    definition: 'Identifier used to connect related actions across components so one workflow can be reconstructed end-to-end.',
  },
  {
    term: 'Correlation ID',
    domain: 'Operations',
    definition: 'Request-level identifier linking backend/API actions that belong to the same user or service interaction.',
  },
  {
    term: 'HITL Review',
    domain: 'Compliance Process',
    definition: 'Human-in-the-loop validation step where a reviewer approves or requests modifications for compliance-critical outputs.',
  },
  {
    term: 'Rich Payload',
    domain: 'Telemetry',
    definition: 'Extended metadata bundle in an event/trace (e.g., tokens, latency, risk flags) beyond fixed top-level fields.',
  },
  {
    term: 'Governance Evidence',
    domain: 'Audit Readiness',
    definition: 'Documented and queryable proof that decisions, approvals, and controls were executed according to policy and regulation.',
  },
];

const GlossaryPage = () => {
  const [glossaryItems, setGlossaryItems] = useState<GlossaryTerm[]>(terms);
  const [newTerm, setNewTerm] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newDefinition, setNewDefinition] = useState('');

  const {
    filterQuery,
    setFilterQuery,
    hasActiveFilters,
    clearFilters,
    filteredItems: visibleItems,
  } = useSubstringFilter<GlossaryTerm>({
    items: glossaryItems,
    getSearchText: (item) => `${item.term} ${item.domain} ${item.definition}`,
  });

  const addGlossaryItem = () => {
    const term = newTerm.trim();
    const domain = newDomain.trim();
    const definition = newDefinition.trim();
    if (!term || !domain || !definition) {
      return;
    }

    setGlossaryItems((prev) => [
      {
        term,
        domain,
        definition,
      },
      ...prev,
    ]);

    setNewTerm('');
    setNewDomain('');
    setNewDefinition('');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Help & Snippets / Glossary"
        title="Glossary"
        subtitle="Shared terminology for quality, governance, and audit workflows."
        whyDescription="A shared glossary reduces ambiguity between engineering, QM, audit, and risk teams and improves consistency in compliance decisions."
      />

      <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400">Add glossary item</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <input
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="Term"
            className="px-3 py-2 rounded-xl border border-neutral-200 text-sm"
          />
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="Domain"
            className="px-3 py-2 rounded-xl border border-neutral-200 text-sm"
          />
          <input
            value={newDefinition}
            onChange={(e) => setNewDefinition(e.target.value)}
            placeholder="Definition"
            className="px-3 py-2 rounded-xl border border-neutral-200 text-sm"
          />
        </div>
        <div>
          <button
            type="button"
            onClick={addGlossaryItem}
            disabled={!newTerm.trim() || !newDomain.trim() || !newDefinition.trim()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LuPlus className="w-4 h-4" />
            Add item
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-4">
        <div className="grid grid-cols-1 gap-3">
          <input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter by substring across term, domain, and definition"
            className="px-3 py-2 rounded-xl border border-neutral-200 text-sm"
          />
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LuFileSearch className="w-4 h-4" />
            Remove filters
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <h2 className="text-lg font-black text-neutral-900 mb-4 inline-flex items-center gap-2">
          <LuBookOpen className="w-5 h-5" />
          Terms and Definitions
        </h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200">
                <th className="py-2 pr-3">Term</th>
                <th className="py-2 pr-3">Domain</th>
                <th className="py-2 pr-3">Definition</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-sm text-neutral-500">No glossary items match the current filter.</td>
                </tr>
              ) : (
                visibleItems.map((item, idx) => (
                  <tr key={`${item.term}-${item.domain}-${idx}`} className="border-b border-neutral-100 align-top">
                    <td className="py-2 pr-3 font-semibold text-neutral-800 whitespace-nowrap">{item.term}</td>
                    <td className="py-2 pr-3 text-neutral-600 whitespace-nowrap">{item.domain}</td>
                    <td className="py-2 pr-3 text-neutral-700">{item.definition}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FooterInfoCard title="Maintenance note" accent="emerald">
        Add new terms when introducing new pages, event types, or compliance controls to keep stakeholder language aligned.
      </FooterInfoCard>
    </div>
  );
};

export default GlossaryPage;
