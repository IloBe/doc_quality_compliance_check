import React from 'react';
import { LuCheck, LuX } from 'react-icons/lu';
import { DashboardSummary } from '../../lib/dashboardClient';

type StandardsCoverageTableProps = {
  summary: DashboardSummary;
};

const StandardsCoverageTable = ({ summary }: StandardsCoverageTableProps) => {
  return (
    <div className="xl:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
      <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500 mb-4">Document Standards Coverage</h2>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-widest text-neutral-400 border-b border-neutral-100">
            <th className="py-2 pr-4">Document</th>
            <th className="py-2 pr-4">Workflow</th>
            <th className="py-2 pr-4">Risk</th>
            <th className="py-2 pr-4">Cycle</th>
            <th className="py-2 pr-4">Standards / Articles</th>
            <th className="py-2">Status by Standard</th>
          </tr>
        </thead>
        <tbody>
          {summary.documents.map((row) => (
            <tr key={row.document_id} className="border-b border-neutral-50 align-top">
              <td className="py-3 pr-4">
                <div className="font-bold text-neutral-800">{row.title}</div>
                <div className="text-[11px] text-neutral-400">{row.document_id}</div>
              </td>
              <td className="py-3 pr-4">
                <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-blue-100 text-blue-700">
                  {row.workflow_status}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                    row.risk_class === 'High'
                      ? 'bg-rose-100 text-rose-700'
                      : row.risk_class === 'Limited'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {row.risk_class}
                </span>
              </td>
              <td className="py-3 pr-4 text-neutral-600 font-semibold">{row.cycle_days}d</td>
              <td className="py-3 pr-4 space-y-1">
                {row.checks.slice(0, 3).map((check) => (
                  <div
                    key={`${row.document_id}-${check.standard}-${check.article}`}
                    className="h-5 flex items-center text-xs text-neutral-600"
                  >
                    <span className="font-semibold">{check.standard}</span> · {check.article}
                  </div>
                ))}
              </td>
              <td className="py-3">
                <div className="space-y-1">
                  {row.checks.slice(0, 3).map((check) => (
                    <div
                      key={`${row.document_id}-status-${check.standard}-${check.article}`}
                      className={`h-5 flex items-center gap-1.5 text-xs font-semibold ${
                        check.passed ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {check.passed ? <LuCheck className="w-4 h-4" /> : <LuX className="w-4 h-4" />}
                      <span className="text-neutral-700">{check.standard}</span>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {summary.documents.length === 0 && (
        <div className="py-8 text-sm text-neutral-500">No documents found for the selected timeframe.</div>
      )}
    </div>
  );
};

export default StandardsCoverageTable;
