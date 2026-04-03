
import React from 'react';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import AlertsPanel from '../components/compliance/AlertsPanel';
import ShortcutCards from '../components/compliance/ShortcutCards';
import StandardCard from '../components/compliance/StandardCard';
import { complianceAlerts, complianceShortcuts, complianceStandards } from '../lib/complianceStandards';


const ComplianceStandards = () => {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
         <PageHeaderWithWhy
            eyebrow="Governance & Standards"
            title="Compliance Standards"
            subtitle="This page lists the regulatory standards and mappings used for governance checks. It provides a transparent basis for agent-driven compliance validation and audit traceability."
            whyDescription="The Compliance page defines which standards and regulatory mappings are active for checks. It helps governance teams align validation rules with current obligations and gives reviewers a clear basis for pass/fail interpretation."
         />

         <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="xl:col-span-2 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {complianceStandards.map((standard) => (
                    <StandardCard key={standard.id} standard={standard} />
                  ))}
               </div>
            </div>

            {/* Sidebar Stats / Info */}
            <div className="space-y-6">
              <AlertsPanel alerts={complianceAlerts} />
            </div>
         </div>

         {/* Bottom shortcut cards: horizontal under standards/directives */}
         <ShortcutCards shortcuts={complianceShortcuts} />

         <FooterInfoCard title="Governance note" accent="blue">
            Compliance Standards defines the active regulatory baseline. Mapping decisions recorded here must remain aligned with current obligations and be traceable to evidence artifacts.
         </FooterInfoCard>
      </div>
   );
};

export default ComplianceStandards;
