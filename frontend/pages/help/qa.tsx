import React, { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
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
import { syncQueryParam } from '../../lib/queryState';
import { useSubstringFilter } from '../../lib/useSubstringFilter';

function readQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

const HelpQaPage = () => {
  const router = useRouter();

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

  const selectedId = useMemo(() => {
    const desired = readQueryValue(router.query.entry);
    return getSelectedQaEntry(filteredItems, desired)?.id ?? null;
  }, [filteredItems, router.query.entry]);

  const commitSelectedId = useCallback((nextId: string | null) => {
    if (!router.isReady) {
      return;
    }

    const currentId = readQueryValue(router.query.entry);
    const desiredId = nextId ?? '';
    if (currentId === desiredId) {
      return;
    }

    const nextQuery: Record<string, string> = {};
    Object.entries(router.query).forEach(([key, rawValue]) => {
      if (key === 'entry') {
        return;
      }
      const normalized = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      if (normalized) {
        nextQuery[key] = normalized;
      }
    });

    const defaultId = filteredItems[0]?.id ?? '';
    if (desiredId && desiredId !== defaultId) {
      nextQuery.entry = desiredId;
    }

    void router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true, scroll: false },
    );
  }, [filteredItems, router]);

  const selected = useMemo(
    () => getSelectedQaEntry(filteredItems, selectedId),
    [filteredItems, selectedId],
  );

  useEffect(() => {
    const defaultEntryId = filteredItems[0]?.id ?? '';
    syncQueryParam(router, 'entry', selected?.id ?? '', {
      omitWhen: (value) => value === defaultEntryId,
    });
  }, [filteredItems, router, selected?.id]);

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
        <HelpQaSidebar entries={filteredItems} selectedId={selected?.id ?? null} onSelect={commitSelectedId} />

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
