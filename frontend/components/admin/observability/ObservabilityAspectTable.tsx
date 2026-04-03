import React from 'react';
import { QualitySummary } from '../../../lib/observabilityClient';

type ObservabilityAspectTableProps = {
  summary: QualitySummary;
};

const ObservabilityAspectTable = ({ summary }: ObservabilityAspectTableProps) => {
  return (
    <div className="xl:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5">
      <h2 className="text-lg font-black text-neutral-900 mb-4">Quality Aspect Breakdown</h2>
      {summary.aspects.length === 0 ? (
        <div className="text-sm text-neutral-500">No quality observations in this window.</div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200">
                <th className="py-2 pr-3">Aspect</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Pass</th>
                <th className="py-2 pr-3">Warn</th>
                <th className="py-2 pr-3">Fail</th>
                <th className="py-2 pr-3">Avg score</th>
                <th className="py-2 pr-3">Avg latency</th>
              </tr>
            </thead>
            <tbody>
              {summary.aspects.map((row) => (
                <tr key={row.aspect} className="border-b border-neutral-100">
                  <td className="py-2 pr-3 font-semibold text-neutral-800 capitalize">{row.aspect}</td>
                  <td className="py-2 pr-3">{row.total}</td>
                  <td className="py-2 pr-3 text-emerald-700">{row.pass_count}</td>
                  <td className="py-2 pr-3 text-amber-700">{row.warn_count}</td>
                  <td className="py-2 pr-3 text-rose-700">{row.fail_count}</td>
                  <td className="py-2 pr-3">{row.average_score !== null ? `${Math.round(row.average_score * 100)}%` : 'n/a'}</td>
                  <td className="py-2 pr-3">{row.average_latency_ms !== null ? `${row.average_latency_ms} ms` : 'n/a'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ObservabilityAspectTable;
