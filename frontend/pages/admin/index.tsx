import React, { useMemo } from 'react';
import AdminCenterSummaryGrid from '../../components/admin/AdminCenterSummaryGrid';
import AdminNavigationCards from '../../components/admin/AdminNavigationCards';
import FooterInfoCard from '../../components/FooterInfoCard';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';
import { ADMIN_NAVIGATION_CARDS, buildAdminCenterSummary } from '../../lib/adminCenterViewModel';

const AdminPage = () => {
  const summary = useMemo(() => buildAdminCenterSummary(), []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="System Administration"
        title="Admin Center"
        subtitle="Central workspace for operational observability and access governance."
        whyDescription="The Admin Center gives technical stakeholders one controlled location to monitor platform quality signals and maintain role governance. It reduces drift between operational reality and authorization policy."
      />

      <AdminCenterSummaryGrid summary={summary} />
      <AdminNavigationCards cards={ADMIN_NAVIGATION_CARDS} />

      <FooterInfoCard title="Governance note" accent="amber">
        Changes made in admin modules should be versioned and reviewed under change-control SOP before production rollout.
      </FooterInfoCard>
    </div>
  );
};

export default AdminPage;
