import React from 'react';
import { LuBookOpen } from 'react-icons/lu';
import { GlossaryTerm } from '../../lib/helpCenterViewModel';

type GlossaryTableProps = {
  items: GlossaryTerm[];
};

const GlossaryTable = ({ items }: GlossaryTableProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <h2 className="text-lg font-black text-neutral-900 mb-4 inline-flex items-center gap-2">
        <LuBookOpen className="w-5 h-5" />
        Terms and Definitions
      </h2>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-200">
              <th className="py-2 pr-3">Term</th>
              <th className="py-2 pr-3">Domain</th>
              <th className="py-2 pr-3">Definition</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-sm text-neutral-500">No glossary items match the current filter.</td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={`${item.term}-${item.domain}-${index}`} className="border-b border-neutral-100 align-top">
                  <td className="py-2 pr-3 font-semibold text-neutral-800 whitespace-nowrap">{item.term}</td>
                  <td className="py-2 pr-3 text-neutral-600 whitespace-nowrap">{item.domain}</td>
                  <td className="py-2 pr-3 text-neutral-700">{item.definition}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GlossaryTable;
