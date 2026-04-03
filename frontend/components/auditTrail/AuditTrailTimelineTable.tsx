import React from 'react';
import { LuInfo } from 'react-icons/lu';
import { AuditTrailEvent } from '../../lib/auditTrailClient';
import { NearestFutureAudit, formatTs, getAuditMarker, getAuditRowHighlightClass } from '../../lib/auditTrailViewModel';
import { getSelectionStyles } from '../../lib/selectionStyles';

type AuditTrailTimelineTableProps = {
  visibleEvents: AuditTrailEvent[];
  nearestFutureAudit: NearestFutureAudit | null;
  selectedEventId: string | null;
  isDetailLoading: boolean;
  auditInfoEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onToggleAuditInfo: (eventId: string) => void;
};

const AuditTrailTimelineTable = ({
  visibleEvents,
  nearestFutureAudit,
  selectedEventId,
  isDetailLoading,
  auditInfoEventId,
  onSelectEvent,
  onToggleAuditInfo,
}: AuditTrailTimelineTableProps) => {
  return (
    <div className="xl:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5">
      <h2 className="text-lg font-black text-neutral-900 mb-4">Event Timeline</h2>
      {visibleEvents.length === 0 ? (
        <div className="text-sm text-neutral-500">No audit events in this window with the current filters.</div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Event type</th>
                <th className="py-2 pr-3">Actor</th>
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((item) => {
                const marker = getAuditMarker(item, nearestFutureAudit);
                const isSelected = selectedEventId === item.event_id;
                const selectionStyles = getSelectionStyles({
                  isSelected,
                  tone: 'blue',
                  defaultRowClass: getAuditRowHighlightClass(marker),
                  idleRowClass: marker ? '' : 'hover:bg-neutral-50',
                  defaultPrimaryTextClass: 'text-neutral-800',
                  defaultSecondaryTextClass: 'text-neutral-600',
                  defaultActionButtonClass: 'border-neutral-200 hover:bg-neutral-50',
                  defaultDetailRowClass: 'bg-white/80',
                });
                return (
                  <React.Fragment key={item.event_id}>
                    <tr
                      className={`border-b border-neutral-100 cursor-pointer transition ${selectionStyles.rowClass}`}
                      onClick={() => onSelectEvent(item.event_id)}
                    >
                      <td className={`py-2 pr-3 whitespace-nowrap font-semibold ${selectionStyles.secondaryTextClass}`}>
                        {formatTs(item.event_time)}
                      </td>
                      <td className={`py-2 pr-3 font-semibold ${selectionStyles.primaryTextClass}`}>
                        <div className="inline-flex items-center gap-2">
                          <span>{item.event_type}</span>
                          {marker && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onToggleAuditInfo(item.event_id);
                              }}
                              className="p-1 rounded-full text-amber-700 hover:bg-white/70"
                              title="Show audit context"
                            >
                              <LuInfo className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={`py-2 pr-3 ${selectionStyles.secondaryTextClass}`}>{item.actor_id}</td>
                      <td className={`py-2 pr-3 ${selectionStyles.secondaryTextClass}`}>{item.subject_type}:{item.subject_id}</td>
                      <td className="py-2 pr-3">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectEvent(item.event_id);
                          }}
                          className={`px-2 py-1 text-xs rounded-lg border disabled:opacity-60 ${selectionStyles.actionButtonClass}`}
                          disabled={isDetailLoading && selectedEventId === item.event_id}
                        >
                          {isDetailLoading && selectedEventId === item.event_id ? 'Loading…' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {auditInfoEventId === item.event_id && marker && (
                      <tr className={`border-b border-neutral-100 ${selectionStyles.detailRowClass}`}>
                        <td colSpan={5} className="px-3 py-2 text-xs text-neutral-700">
                          {marker.message}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditTrailTimelineTable;
