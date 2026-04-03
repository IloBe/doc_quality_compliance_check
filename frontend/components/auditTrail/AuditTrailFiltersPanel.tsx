import React from 'react';
import { LuFileSearch } from 'react-icons/lu';

type AuditTrailFiltersPanelProps = {
  filterQuery: string;
  onFilterQueryChange: (value: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

const AuditTrailFiltersPanel = ({
  filterQuery,
  onFilterQueryChange,
  hasActiveFilters,
  onClearFilters,
}: AuditTrailFiltersPanelProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4">
      <div className="grid grid-cols-1 gap-3">
        <input
          value={filterQuery}
          onChange={(e) => onFilterQueryChange(e.target.value)}
          placeholder="Filter visible rows by any substring (time, event type, actor, subject)"
          className="px-3 py-2 rounded-xl border border-neutral-200 text-sm"
        />
      </div>
      <div className="mt-3">
        <button
          type="button"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LuFileSearch className="w-4 h-4" />
          Remove filters
        </button>
      </div>
    </div>
  );
};

export default AuditTrailFiltersPanel;
