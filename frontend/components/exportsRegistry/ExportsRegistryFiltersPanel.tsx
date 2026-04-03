import React from 'react';
import {
  EXPORT_STATUS_OPTIONS,
  EXPORT_TYPE_OPTIONS,
  ExportStatusFilter,
  ExportTypeFilter,
} from '../../lib/exportRegistryViewModel';

type ExportsRegistryFiltersPanelProps = {
  statusFilter: ExportStatusFilter;
  typeFilter: ExportTypeFilter;
  totalCount: number;
  filteredCount: number;
  onStatusFilterChange: (value: ExportStatusFilter) => void;
  onTypeFilterChange: (value: ExportTypeFilter) => void;
};

const ExportsRegistryFiltersPanel = ({
  statusFilter,
  typeFilter,
  totalCount,
  filteredCount,
  onStatusFilterChange,
  onTypeFilterChange,
}: ExportsRegistryFiltersPanelProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Status</label>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as ExportStatusFilter)}
            className="px-3 py-1.5 text-xs font-semibold border border-neutral-200 rounded-lg bg-white text-neutral-700 hover:bg-neutral-50 cursor-pointer"
          >
            {EXPORT_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Type</label>
          <select
            value={typeFilter}
            onChange={(event) => onTypeFilterChange(event.target.value as ExportTypeFilter)}
            className="px-3 py-1.5 text-xs font-semibold border border-neutral-200 rounded-lg bg-white text-neutral-700 hover:bg-neutral-50 cursor-pointer"
          >
            {EXPORT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-xs font-semibold text-neutral-500">Showing {filteredCount} of {totalCount}</div>
      </div>
    </div>
  );
};

export default ExportsRegistryFiltersPanel;
