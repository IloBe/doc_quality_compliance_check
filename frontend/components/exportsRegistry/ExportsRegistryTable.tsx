import React from 'react';
import { LuDownload } from 'react-icons/lu';
import { getButtonClass } from '../buttonStyles';
import { ExportJob } from '../../lib/mockStore';
import {
  formatExportDuration,
  formatExportTimestamp,
  getExportStatusBadgeClass,
  getExportStatusDotClass,
  getSourceStatusBadgeClass,
} from '../../lib/exportRegistryViewModel';

type ExportsRegistryTableProps = {
  exports: ExportJob[];
  onDownload: (exportJob: ExportJob) => void;
};

const ExportsRegistryTable = ({ exports, onDownload }: ExportsRegistryTableProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest text-neutral-400 border-b border-neutral-100 bg-neutral-50">
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5">Export Job</th>
              <th className="py-3 px-5">Source Document</th>
              <th className="py-3 px-5">Type</th>
              <th className="py-3 px-5">Source Status</th>
              <th className="py-3 px-5">Created</th>
              <th className="py-3 px-5">Completed</th>
              <th className="py-3 px-5">Duration</th>
              <th className="py-3 px-5">Action</th>
            </tr>
          </thead>
          <tbody>
            {exports.length > 0 ? (
              exports.map((item) => (
                <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <div className={getExportStatusDotClass(item.status)} />
                      <span className={getExportStatusBadgeClass(item.status)}>{item.status}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="font-bold text-neutral-800">{item.id}</div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="text-neutral-700 font-medium">{item.docTitle}</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">{item.docId}</div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="inline-block px-2 py-1 bg-neutral-100 text-neutral-700 text-xs font-bold rounded">
                      {item.type}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className={getSourceStatusBadgeClass(item.sourceStatus)}>{item.sourceStatus}</span>
                  </td>
                  <td className="py-4 px-5 text-neutral-600 text-xs">{formatExportTimestamp(item.createdAt)}</td>
                  <td className="py-4 px-5 text-neutral-600 text-xs">
                    {item.completedAt ? formatExportTimestamp(item.completedAt) : '—'}
                  </td>
                  <td className="py-4 px-5 text-neutral-600 text-xs font-semibold">
                    {formatExportDuration(item.createdAt, item.completedAt)}
                  </td>
                  <td className="py-4 px-5">
                    {item.status === 'Ready' && item.url ? (
                      <button
                        type="button"
                        onClick={() => onDownload(item)}
                        className={getButtonClass({ variant: 'soft-blue', size: 'sm' })}
                        title="Download export"
                      >
                        <LuDownload className="w-3.5 h-3.5" />
                        Download
                      </button>
                    ) : item.status === 'Failed' ? (
                      <span className="text-xs text-rose-600 font-semibold">Failed</span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-8 px-5 text-center text-neutral-500 text-sm">
                  No exports found matching the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExportsRegistryTable;
