import React from 'react';
import { LuInfo } from 'react-icons/lu';

type FooterInfoCardAccent = 'amber' | 'blue' | 'emerald' | 'indigo';

type FooterInfoCardProps = {
  title: string;
  accent?: FooterInfoCardAccent;
  children: React.ReactNode;
};

/**
 * FooterInfoCard
 *
 * Single Responsibility: render one consistent bottom-note surface across pages.
 */
const FooterInfoCard = ({ title, children }: FooterInfoCardProps) => {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <div className="mb-1 flex items-center gap-2 font-bold text-emerald-950">
        <LuInfo className="h-4 w-4 text-emerald-600" />
        {title}
      </div>
      <div className="leading-6 text-emerald-900">{children}</div>
    </div>
  );
};

export default FooterInfoCard;
