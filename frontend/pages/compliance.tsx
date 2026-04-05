
import React from 'react';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import AlertsPanel from '../components/compliance/AlertsPanel';
import ShortcutCards from '../components/compliance/ShortcutCards';
import StandardsGroup from '../components/compliance/StandardsGroup';
import {
  categoryMetadata,
  complianceAlerts,
  complianceAlertsInfo,
  complianceShortcuts,
  getGroupedStandards,
} from '../lib/complianceStandards';


const ComplianceStandards = () => {
  const { alwaysOn, conditionalByCategory } = getGroupedStandards();

  // Sort conditional categories by defined order
  const sortedCategories = Object.entries(conditionalByCategory).sort(
    (a, b) => {
      const orderA = categoryMetadata[a[0]]?.order ?? 999;
      const orderB = categoryMetadata[b[0]]?.order ?? 999;
      return orderA - orderB;
    }
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <PageHeaderWithWhy
        eyebrow="Governance & Standards"
        title="Compliance Standards"
        subtitle="This page lists the regulatory standards and mappings used for governance checks. The framework-agnostic bridge execution layer supports 18 compliance frameworks with intelligent domain-based conditional activation."
        whyDescription="The Compliance page defines which standards and regulatory mappings are active for checks. It helps governance teams align validation rules with current obligations and gives reviewers a clear basis for pass/fail interpretation."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="xl:col-span-2 space-y-16">
          {/* Always-On Frameworks Section */}
          <StandardsGroup
            title="Always-On Frameworks"
            description="Baseline governance applied across all product domains and business contexts."
            isAlwaysOn={true}
            standards={alwaysOn}
          />

          {/* Conditionally Activated Frameworks by Domain */}
          <div className="space-y-12">
            <div className="border-t-2 border-neutral-200 pt-8">
              <h2 className="text-2xl font-black text-neutral-900 mb-2">Conditionally Activated Frameworks</h2>
              <p className="text-sm font-medium text-neutral-700">
                Additional regulatory requirements activated based on product domain, market, or business context.
              </p>
            </div>

            {sortedCategories.map(([category, standards]) => {
              const metadata = categoryMetadata[category];
              return (
                <StandardsGroup
                  key={category}
                  title={metadata?.label || category}
                  description={metadata?.description}
                  isAlwaysOn={false}
                  standards={standards}
                />
              );
            })}
          </div>
        </div>

        {/* Sidebar Stats / Info */}
        <div className="space-y-6">
          <AlertsPanel alerts={complianceAlerts} info={complianceAlertsInfo} />
        </div>
      </div>

      {/* Bottom shortcut cards: horizontal under standards/directives */}
      <ShortcutCards shortcuts={complianceShortcuts} />

      <FooterInfoCard title="Governance note" accent="blue">
        Compliance Standards defines the active regulatory baseline. Mapping decisions recorded here must remain aligned with current obligations and be traceable to evidence artifacts. The framework-agnostic bridge execution layer automatically activates applicable frameworks based on documented domain and market context.
      </FooterInfoCard>
    </div>
  );
};

export default ComplianceStandards;
