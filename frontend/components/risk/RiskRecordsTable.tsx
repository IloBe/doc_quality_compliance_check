import React from 'react';
import { getButtonClass } from '../buttonStyles';
import { formatRiskDate, RiskRecordRow } from '../../lib/riskViewModel';
import { getSelectionStyles } from '../../lib/selectionStyles';

type RiskRecordsTableProps = {
  rows: RiskRecordRow[];
  selectedRecordId: string | null;
  canEdit: boolean;
  canApprove: boolean;
  busyRecordId: string | null;
  onSelectRecord: (recordId: string) => void;
  onSubmitForReview: (recordId: string) => void;
  onApprove: (recordId: string) => void;
  onRequestChanges: (recordId: string) => void;
};

const statusClass: Record<RiskRecordRow['status'], string> = {
  Draft: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  'In Review': 'bg-amber-100 text-amber-800 border-amber-200',
  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const residualClass: Record<RiskRecordRow['residualRisk'], string> = {
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  High: 'bg-rose-50 text-rose-700 border-rose-200',
};

const RiskRecordsTable = ({
  rows,
  selectedRecordId,
  canEdit,
  canApprove,
  busyRecordId,
  onSelectRecord,
  onSubmitForReview,
  onApprove,
  onRequestChanges,
}: RiskRecordsTableProps) => {
  if (rows.length === 0) {
    return <section className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">No risk records match current filters.</section>;
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-50/60 text-[11px] text-neutral-600">
        Showing {rows.length} risk record(s). Older entries remain available via scroll.
      </div>
      <div className="max-h-[460px] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr className="text-left text-[11px] uppercase tracking-widest text-neutral-500">
              <th className="px-4 py-3 font-black">Risk record</th>
              <th className="px-4 py-3 font-black">Status</th>
              <th className="px-4 py-3 font-black">Hazard / Mitigation</th>
              <th className="px-4 py-3 font-black">Residual risk</th>
              <th className="px-4 py-3 font-black">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => {
              const isBusy = busyRecordId === row.id;
              const isSelected = selectedRecordId === row.id;
              const selectionStyles = getSelectionStyles({
                isSelected,
                tone: 'blue',
                defaultRowClass: '',
                idleRowClass: 'hover:bg-neutral-50',
                defaultPrimaryTextClass: 'text-neutral-800',
                defaultSecondaryTextClass: 'text-neutral-500',
              });
              return (
                <tr
                  key={row.id}
                  className={`align-top cursor-pointer transition ${selectionStyles.rowClass}`}
                  onClick={() => onSelectRecord(row.id)}
                >
                  <td className="px-4 py-3">
                    <p className={`font-bold flex items-center gap-2 ${selectionStyles.primaryTextClass}`}>
                      {row.title}
                      {isSelected ? (
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700">
                          Selected
                        </span>
                      ) : null}
                    </p>
                    <p className={`text-xs mt-1 ${selectionStyles.secondaryTextClass}`}>{row.id} · {row.type} · {row.product} · v{row.version}</p>
                    <p className={`text-[11px] mt-1 ${selectionStyles.secondaryTextClass}`}>Updated {formatRiskDate(row.updatedAt)} by {row.updatedBy}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-black uppercase tracking-wider ${statusClass[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-700 text-xs">
                    <p>Hazards: {row.hazardCount}</p>
                    <p>Mitigations: {row.mitigationCount}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-black uppercase tracking-wider ${residualClass[row.residualRisk]}`}>
                      {row.residualRisk}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!canEdit || row.status !== 'Draft' || isBusy || !row.mutable}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSubmitForReview(row.id);
                        }}
                        className={getButtonClass({ variant: 'soft-blue', size: 'sm' })}
                      >
                        Submit Review
                      </button>

                      <button
                        type="button"
                        disabled={!canApprove || row.status !== 'In Review' || isBusy || !row.mutable}
                        onClick={(e) => {
                          e.stopPropagation();
                          onApprove(row.id);
                        }}
                        className={getButtonClass({ variant: 'soft-emerald', size: 'sm' })}
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        disabled={!canApprove || row.status !== 'In Review' || isBusy || !row.mutable}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestChanges(row.id);
                        }}
                        className={getButtonClass({ variant: 'soft-violet', size: 'sm' })}
                      >
                        Request Changes
                      </button>
                    </div>
                    {!row.mutable ? <p className="mt-2 text-[11px] text-neutral-500">Reference row (read-only demo seed)</p> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RiskRecordsTable;
