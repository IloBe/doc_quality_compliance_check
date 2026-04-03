import React, { useState } from 'react';
import FooterInfoCard from '../../components/FooterInfoCard';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';
import GlossaryComposer from '../../components/helpCenter/GlossaryComposer';
import GlossaryTable from '../../components/helpCenter/GlossaryTable';
import HelpSearchPanel from '../../components/helpCenter/HelpSearchPanel';
import {
  GlossaryTerm,
  HELP_GLOSSARY_TERMS,
  appendGlossaryDraft,
  canSubmitGlossaryDraft,
  createGlossaryDraft,
  getGlossarySearchText,
} from '../../lib/helpCenterViewModel';
import { useSubstringFilter } from '../../lib/useSubstringFilter';

const GlossaryPage = () => {
  const [glossaryItems, setGlossaryItems] = useState<GlossaryTerm[]>(HELP_GLOSSARY_TERMS);
  const [draft, setDraft] = useState<GlossaryTerm>(createGlossaryDraft());

  const {
    filterQuery,
    setFilterQuery,
    hasActiveFilters,
    clearFilters,
    filteredItems: visibleItems,
  } = useSubstringFilter<GlossaryTerm>({
    items: glossaryItems,
    getSearchText: getGlossarySearchText,
  });

  const addGlossaryItem = () => {
    if (!canSubmitGlossaryDraft(draft)) {
      return;
    }

    setGlossaryItems((prev) => appendGlossaryDraft(prev, draft));
    setDraft(createGlossaryDraft());
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Help & Snippets / Glossary"
        title="Glossary"
        subtitle="Shared terminology for quality, governance, and audit workflows."
        whyDescription="A shared glossary reduces ambiguity between engineering, QM, audit, and risk teams and improves consistency in compliance decisions."
      />

      <GlossaryComposer
        draft={draft}
        canSubmit={canSubmitGlossaryDraft(draft)}
        onDraftChange={setDraft}
        onSubmit={addGlossaryItem}
      />

      <HelpSearchPanel
        value={filterQuery}
        placeholder="Filter by substring across term, domain, and definition"
        disabledClear={!hasActiveFilters}
        onChange={setFilterQuery}
        onClear={clearFilters}
      />

      <GlossaryTable items={visibleItems} />

      <FooterInfoCard title="Maintenance note" accent="emerald">
        Add new terms when introducing new pages, event types, or compliance controls to keep stakeholder language aligned.
      </FooterInfoCard>
    </div>
  );
};

export default GlossaryPage;
