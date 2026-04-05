import Link from 'next/link';
import React from 'react';
import { LuChevronRight, LuCpu, LuExternalLink, LuShieldCheck } from 'react-icons/lu';
import InfoIconButton from '../InfoIconButton';
import { ComplianceStandard, toneClasses } from '../../lib/complianceStandards';

type StandardCardProps = {
  standard: ComplianceStandard;
};

const StandardCard = ({ standard }: StandardCardProps) => {
  const tone = toneClasses(standard.tone);
  const [showRoutingInfo, setShowRoutingInfo] = React.useState(false);

  return (
    <div className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden group">
      <div className="flex items-start justify-between mb-8">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tone.icon}`}>
          <LuShieldCheck className="w-6 h-6" />
        </div>
        <div className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${tone.badge}`}>
          {standard.status}
        </div>
      </div>

      <h3 className="text-xl font-black text-neutral-900 mb-2 flex items-center gap-2">
        {standard.title}
        <a href={standard.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:underline" title="Open standard">
          <LuExternalLink className="w-4 h-4 inline" />
        </a>
      </h3>

      <p className="text-sm font-medium text-neutral-400 mb-8 line-clamp-2 italic">{standard.desc}</p>

      <div className="flex-grow" />
      <div className="flex items-center justify-between pt-6 border-t border-neutral-50 mt-auto">
        <div className="flex items-center gap-1.5 font-bold text-neutral-900 text-xs">
          <LuCpu className="w-4 h-4 text-blue-500" />
          Agent Verified
          <InfoIconButton
            onClick={() => setShowRoutingInfo((prev) => !prev)}
            title="Show routing rule and reason"
            aria-label={`Show routing rule for ${standard.title}`}
            size="sm"
          />
        </div>
        <Link
          href={standard.verificationHref}
          title={standard.verificationLabel}
          aria-label={standard.verificationLabel}
          className="p-1.5 rounded-xl text-neutral-300 hover:text-neutral-900 hover:bg-neutral-100 transition"
        >
          <LuChevronRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition" />
        </Link>
      </div>

      {showRoutingInfo ? (
        <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
          <p className="font-bold text-neutral-900">Routing rule</p>
          <p className="mt-1">{standard.verificationRule}</p>
          <p className="mt-2 font-bold text-neutral-900">Why this route</p>
          <p className="mt-1">{standard.verificationReason}</p>
        </div>
      ) : null}
    </div>
  );
};

export default StandardCard;
