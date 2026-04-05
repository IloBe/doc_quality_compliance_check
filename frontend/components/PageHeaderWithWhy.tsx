import React, { useState } from 'react';
import InfoIconButton from './InfoIconButton';
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
            <InfoIconButton
              onClick={() => setShowWhyThisPageMatters((prev) => !prev)}
              title="Why this page matters"
              size="md"
            />
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
