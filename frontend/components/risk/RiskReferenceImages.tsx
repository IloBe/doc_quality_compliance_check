import React from 'react';

const RiskReferenceImages = () => {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
      <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Risk documentation reference tables</h2>
      <p className="text-xs text-neutral-600">
        These two references guide the split between company-wide risk management record (RMF) and product-specific risk handling record (FMEA/RMF addendum).
      </p>

      <article className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50">
        <img
          src="/images/risk/table1-riskmanagement-file.jpg"
          alt="Table 1 - Risk Management File structure"
          className="w-full h-auto"
        />
      </article>

      <article className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50">
        <img
          src="/images/risk/table2-product-risks-documentation.jpg"
          alt="Table 2 - Documentation of specific product risk handling"
          className="w-full h-auto"
        />
      </article>
    </section>
  );
};

export default RiskReferenceImages;
