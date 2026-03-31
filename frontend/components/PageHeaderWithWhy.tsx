import React, { useState } from 'react';
import { LuInfo } from 'react-icons/lu';
import WhyThisPageMatters from './WhyThisPageMatters';

type PageHeaderWithWhyProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  whyDescription: string;
  rightContent?: React.ReactNode;
};

const PageHeaderWithWhy = ({ eyebrow, title, subtitle, whyDescription, rightContent }: PageHeaderWithWhyProps) => {
  const [showWhyThisPageMatters, setShowWhyThisPageMatters] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">{eyebrow}</div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">{title}</h1>
            <button
              type="button"
              onClick={() => setShowWhyThisPageMatters((prev) => !prev)}
              className="p-1.5 rounded-full text-neutral-400 hover:text-blue-700 hover:bg-blue-50 transition"
              title="Why this page matters"
            >
              <LuInfo className="w-4 h-4" />
            </button>
          </div>
          {subtitle ? <p className="text-neutral-500 font-medium mt-1">{subtitle}</p> : null}
        </div>

        {rightContent ? rightContent : null}
      </div>

      {showWhyThisPageMatters && <WhyThisPageMatters description={whyDescription} />}
    </>
  );
};

export default PageHeaderWithWhy;
