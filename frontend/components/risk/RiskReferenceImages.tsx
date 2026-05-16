import React from 'react';
import Image from 'next/image';

const RiskReferenceImages = () => {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
      <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Risk documentation reference tables</h2>
      <p className="text-xs text-neutral-600">
        These two references guide the split between company-wide risk management record (RMF) and product-specific risk handling record (FMEA/RMF addendum).
      </p>

      <article className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50">
        <Image
          src="/images/risk/table1-riskmanagement-file.jpg"
          alt="Table 1 - Risk Management File structure"
          width={1200}
          height={800}
          className="w-full h-auto"
        />
      </article>

      <article className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50">
        <Image
          src="/images/risk/table2-product-risks-documentation.jpg"
          alt="Table 2 - Documentation of specific product risk handling"
          width={1200}
          height={800}
          className="w-full h-auto"
        />
      </article>
    </section>
  );
};

export default RiskReferenceImages;
