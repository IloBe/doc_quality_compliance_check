import React, { useMemo } from 'react';
import FooterInfoCard from '../../components/FooterInfoCard';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';
import HelpCenterSummaryGrid from '../../components/helpCenter/HelpCenterSummaryGrid';
import HelpNavigationCards from '../../components/helpCenter/HelpNavigationCards';
import HelpSnippetHighlights from '../../components/helpCenter/HelpSnippetHighlights';
import {
  HELP_NAVIGATION_CARDS,
  buildHelpCenterSummary,
  buildHelpSnippets,
} from '../../lib/helpCenterViewModel';

const HelpPage = () => {
  const summary = useMemo(() => buildHelpCenterSummary(), []);
  const snippets = useMemo(() => buildHelpSnippets(), []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Support / Knowledge Base"
        title="Help & Snippets"
        subtitle="Reference area for operational Q&A, terminology, and evidence-oriented guidance."
        whyDescription="This area reduces decision friction during audits and reviews by centralizing repeatable answers, snippets, and shared language in one place."
      />

      <HelpCenterSummaryGrid summary={summary} />
      <HelpNavigationCards cards={HELP_NAVIGATION_CARDS} />
      <HelpSnippetHighlights snippets={snippets} />

      <FooterInfoCard title="Governance note" accent="amber">
        Keep Q&A entries concise, evidence-oriented, and linked to the governance intent of the feature.
      </FooterInfoCard>
    </div>
  );
};

export default HelpPage;
