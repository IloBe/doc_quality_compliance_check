import React from 'react';
import { WorkflowComponentBreakdown } from '../../../lib/observabilityClient';

type ObservabilityWorkflowTableProps = {
  workflowBreakdown: WorkflowComponentBreakdown | null;
};

const ObservabilityWorkflowTable = ({ workflowBreakdown }: ObservabilityWorkflowTableProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <h2 className="text-lg font-black text-neutral-900 mb-4">Workflow Component Breakdown</h2>
      {!workflowBreakdown || workflowBreakdown.components.length === 0 ? (
        <div className="text-sm text-neutral-500">No component-level workflow telemetry in this window.</div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200">
                <th className="py-2 pr-3">Component</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Pass</th>
                <th className="py-2 pr-3">Warn</th>
                <th className="py-2 pr-3">Fail</th>
                <th className="py-2 pr-3">Info</th>
                <th className="py-2 pr-3">Avg latency</th>
                <th className="py-2 pr-3">Latest event</th>
              </tr>
            </thead>
            <tbody>
              {workflowBreakdown.components.map((component) => (
                <tr key={component.source_component} className="border-b border-neutral-100">
                  <td className="py-2 pr-3 font-semibold text-neutral-800">{component.source_component}</td>
                  <td className="py-2 pr-3">{component.total}</td>
                  <td className="py-2 pr-3 text-emerald-700">{component.pass_count}</td>
                  <td className="py-2 pr-3 text-amber-700">{component.warn_count}</td>
                  <td className="py-2 pr-3 text-rose-700">{component.fail_count}</td>
                  <td className="py-2 pr-3 text-sky-700">{component.info_count}</td>
                  <td className="py-2 pr-3">{component.average_latency_ms !== null ? `${component.average_latency_ms} ms` : 'n/a'}</td>
                  <td className="py-2 pr-3">{component.latest_event_time ? new Date(component.latest_event_time).toLocaleString() : 'n/a'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ObservabilityWorkflowTable;
