import React, { useMemo, useState } from 'react';
import FooterInfoCard from '../../components/FooterInfoCard';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';
import HelpQaDetailPanel from '../../components/helpCenter/HelpQaDetailPanel';
import HelpQaSidebar from '../../components/helpCenter/HelpQaSidebar';
import HelpSearchPanel from '../../components/helpCenter/HelpSearchPanel';
import {
  HELP_QA_ENTRIES,
  getQaSearchText,
  getSelectedQaEntry,
} from '../../lib/helpCenterViewModel';
import { useSubstringFilter } from '../../lib/useSubstringFilter';

const HelpQaPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(HELP_QA_ENTRIES[0]?.id ?? null);

  const {
    filterQuery,
    setFilterQuery,
    hasActiveFilters,
    clearFilters,
    filteredItems,
  } = useSubstringFilter({
    items: HELP_QA_ENTRIES,
    getSearchText: getQaSearchText,
  });

  const selected = useMemo(
    () => getSelectedQaEntry(filteredItems, selectedId),
    [filteredItems, selectedId],
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Help & Snippets / Q&A"
        title="Q&A"
        subtitle="Focused answers for recurring governance and reporting questions."
        whyDescription="Q&A entries convert operational uncertainty into repeatable guidance so teams respond consistently during audits and compliance checks."
      />

      <HelpSearchPanel
        value={filterQuery}
        placeholder="Filter across questions, answers, and examples"
        disabledClear={!hasActiveFilters}
        onChange={setFilterQuery}
        onClear={clearFilters}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <HelpQaSidebar entries={filteredItems} selectedId={selected?.id ?? null} onSelect={setSelectedId} />

        <div className="xl:col-span-2 space-y-4">
          <HelpQaDetailPanel entry={selected} />
        </div>
      </div>

      <FooterInfoCard title="Editorial rule" accent="indigo">
        Each Q&A item should include concrete examples with event types and payload fields to keep guidance audit-ready.
      </FooterInfoCard>
    </div>
  );
};

export default HelpQaPage;
