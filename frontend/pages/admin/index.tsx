import React from 'react';
import Link from 'next/link';
import { LuActivity, LuArrowRight, LuInfo, LuUsers } from 'react-icons/lu';
import WhyThisPageMatters from '../../components/WhyThisPageMatters';

const adminCards = [
  {
    href: '/admin/observability',
    title: 'Observability',
    description:
      'Live quality telemetry for performance, accuracy, error trends, hallucination reports, and evaluation metrics.',
    icon: LuActivity,
    accent: 'blue',
  },
  {
    href: '/admin/stakeholders',
    title: 'Stakeholder Profiles & Rights',
    description:
      'Role templates and authorization matrix governance for QM lead, auditor, risk manager, architect, and service clients.',
    icon: LuUsers,
    accent: 'emerald',
  },
];

const AdminPage = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">System Administration</div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Admin Center</h1>
          <p className="text-neutral-500 font-medium mt-1">Central workspace for operational observability and access governance.</p>
        </div>
      </div>

      <WhyThisPageMatters
        description="The Admin Center gives technical stakeholders one controlled location to monitor platform quality signals and maintain role governance. It reduces drift between operational reality and authorization policy."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {adminCards.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className={`w-11 h-11 rounded-xl mb-4 flex items-center justify-center bg-${item.accent}-50 text-${item.accent}-700`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black text-neutral-900">{item.title}</h2>
                  <p className="text-sm text-neutral-600 mt-2 max-w-xl">{item.description}</p>
                </div>
                <LuArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-800 transition mt-1" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <div className="font-bold flex items-center gap-2 mb-1">
          <LuInfo className="w-4 h-4" />
          Governance note
        </div>
        Changes made in admin modules should be versioned and reviewed under change-control SOP before production rollout.
      </div>
    </div>
  );
};

export default AdminPage;
