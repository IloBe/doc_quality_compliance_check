import React from 'react';
import { LuInfo } from 'react-icons/lu';

type FooterInfoCardAccent = 'amber' | 'blue' | 'emerald' | 'indigo';

type FooterInfoCardProps = {
  title: string;
  accent?: FooterInfoCardAccent;
  children: React.ReactNode;
};

const accentClasses: Record<FooterInfoCardAccent, string> = {
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
};

const FooterInfoCard = ({ title, accent = 'blue', children }: FooterInfoCardProps) => {
  return (
    <div className={`rounded-2xl border p-4 text-sm ${accentClasses[accent]}`}>
      <div className="font-bold flex items-center gap-2 mb-1">
        <LuInfo className="w-4 h-4" />
        {title}
      </div>
      <div className="leading-6">{children}</div>
    </div>
  );
};

export default FooterInfoCard;
