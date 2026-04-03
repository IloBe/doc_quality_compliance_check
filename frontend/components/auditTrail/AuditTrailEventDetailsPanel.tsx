import React from 'react';
import { LuClock3, LuDatabase, LuShieldCheck, LuUserCog } from 'react-icons/lu';
import { AuditTrailEvent } from '../../lib/auditTrailClient';
import { deriveEventDetailLines, formatTs } from '../../lib/auditTrailViewModel';

type AuditTrailEventDetailsPanelProps = {
  selectedEvent: AuditTrailEvent | null;
  detailError: string | null;
};

const AuditTrailEventDetailsPanel = ({ selectedEvent, detailError }: AuditTrailEventDetailsPanelProps) => {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Selected Event</h2>
        {detailError && (
          <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            Detail fallback active: {detailError}
          </div>
        )}
        {!selectedEvent ? (
          <div className="text-sm text-neutral-500">Select an event to inspect payload and trace context.</div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="inline-flex items-center gap-2 text-neutral-700"><LuClock3 className="w-4 h-4" /> {formatTs(selectedEvent.event_time)}</div>
            <div className="inline-flex items-center gap-2 text-neutral-700"><LuShieldCheck className="w-4 h-4" /> {selectedEvent.event_type}</div>
            <div className="inline-flex items-center gap-2 text-neutral-700"><LuUserCog className="w-4 h-4" /> {selectedEvent.actor_type}:{selectedEvent.actor_id}</div>
            <div className="inline-flex items-center gap-2 text-neutral-700"><LuDatabase className="w-4 h-4" /> {selectedEvent.subject_type}:{selectedEvent.subject_id}</div>
            <div className="pt-2 text-xs text-neutral-500">Trace ID: {selectedEvent.trace_id || 'n/a'}</div>
            <div className="text-xs text-neutral-500">Correlation ID: {selectedEvent.correlation_id || 'n/a'}</div>
            <div className="pt-2 space-y-1">
              {deriveEventDetailLines(selectedEvent).map((line) => (
                <div key={line} className="text-xs text-neutral-700 bg-neutral-50 border border-neutral-200 rounded px-2 py-1">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Payload</h2>
        {!selectedEvent ? (
          <div className="text-sm text-neutral-500">No payload selected.</div>
        ) : Object.keys(selectedEvent.payload || {}).length === 0 ? (
          <div className="text-sm text-neutral-500">This event has no structured payload fields.</div>
        ) : (
          <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded p-3 whitespace-pre-wrap break-words max-h-80 overflow-auto">{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
        )}
      </div>
    </div>
  );
};

export default AuditTrailEventDetailsPanel;
