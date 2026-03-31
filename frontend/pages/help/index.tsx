import React from 'react';
import Link from 'next/link';
import { LuArrowRight, LuBookOpen, LuFileQuestion } from 'react-icons/lu';
import FooterInfoCard from '../../components/FooterInfoCard';
import WhyThisPageMatters from '../../components/WhyThisPageMatters';

const cards = [
  {
    href: '/help/qa',
    title: 'Q&A',
    description: 'Focused questions and concise answers for governance and reporting workflows.',
    icon: LuFileQuestion,
    accent: 'blue',
  },
  {
    href: '/help/glossary',
    title: 'Glossary',
    description: 'Key quality, risk, and compliance terminology used across the platform.',
    icon: LuBookOpen,
    accent: 'emerald',
  },
];

const HelpPage = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Support / Knowledge Base</div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Help & Snippets</h1>
          <p className="text-neutral-500 font-medium mt-1">Reference area for operational Q&A and shared terminology.</p>
        </div>
      </div>

      <WhyThisPageMatters description="This area reduces decision friction during audits and reviews by centralizing repeatable answers and shared language in one place." />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {cards.map((item) => {
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

      <FooterInfoCard title="Guidance note" accent="amber">
        Keep Q&A entries concise, evidence-oriented, and linked to the governance intent of the feature.
      </FooterInfoCard>
    </div>
  );
};

export default HelpPage;
