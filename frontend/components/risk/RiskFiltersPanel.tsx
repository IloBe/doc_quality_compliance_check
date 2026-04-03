import React from 'react';
import { RiskStatusFilter, RiskTypeFilter } from '../../lib/riskViewModel';

type RiskFiltersPanelProps = {
  query: string;
  typeFilter: RiskTypeFilter;
  statusFilter: RiskStatusFilter;
  productFilter: string;
  products: string[];
  onQueryChange: (value: string) => void;
  onTypeFilterChange: (value: RiskTypeFilter) => void;
  onStatusFilterChange: (value: RiskStatusFilter) => void;
  onProductFilterChange: (value: string) => void;
};

const RiskFiltersPanel = ({
  query,
  typeFilter,
  statusFilter,
  productFilter,
  products,
  onQueryChange,
  onTypeFilterChange,
  onStatusFilterChange,
  onProductFilterChange,
}: RiskFiltersPanelProps) => {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div>
          <label htmlFor="risk-query" className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Search</label>
          <input
            id="risk-query"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
            placeholder="ID, title, owner, risk"
          />
        </div>

        <div>
          <label htmlFor="risk-type" className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Type</label>
          <select
            id="risk-type"
            value={typeFilter}
            onChange={(event) => onTypeFilterChange(event.target.value as RiskTypeFilter)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
          >
            <option value="All">All</option>
            <option value="RMF">RMF</option>
            <option value="FMEA">FMEA</option>
          </select>
        </div>

        <div>
          <label htmlFor="risk-status" className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Status</label>
          <select
            id="risk-status"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as RiskStatusFilter)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
          >
            <option value="All">All</option>
            <option value="Draft">Draft</option>
            <option value="In Review">In Review</option>
            <option value="Approved">Approved</option>
          </select>
        </div>

        <div>
          <label htmlFor="risk-product" className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Product</label>
          <select
            id="risk-product"
            value={productFilter}
            onChange={(event) => onProductFilterChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
          >
            <option value="All">All Products</option>
            {products.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
};

export default RiskFiltersPanel;
