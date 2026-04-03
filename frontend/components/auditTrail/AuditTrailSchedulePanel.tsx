import React from 'react';

type AuditTrailSchedulePanelProps = {
  internalAuditDate: string;
  externalAuditDate: string;
  externalNotifiedBody: string;
  onInternalAuditDateChange: (value: string) => void;
  onExternalAuditDateChange: (value: string) => void;
  onExternalNotifiedBodyChange: (value: string) => void;
  nearestFutureAudit: { kind: 'internal' | 'external'; date: Date } | null;
  useBackendData: boolean;
  isScheduleSaving: boolean;
  scheduleError: string | null;
  onSaveSchedule: () => void;
};

const AuditTrailSchedulePanel = ({
  internalAuditDate,
  externalAuditDate,
  externalNotifiedBody,
  onInternalAuditDateChange,
  onExternalAuditDateChange,
  onExternalNotifiedBodyChange,
  nearestFutureAudit,
  useBackendData,
  isScheduleSaving,
  scheduleError,
  onSaveSchedule,
}: AuditTrailSchedulePanelProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-4">
      <div>
        <div className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Next audits</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Next internal audit</label>
            <input
              type="date"
              value={internalAuditDate}
              onChange={(e) => onInternalAuditDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Next external audit</label>
            <input
              type="date"
              value={externalAuditDate}
              onChange={(e) => onExternalAuditDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Notified body</label>
            <input
              value={externalNotifiedBody}
              onChange={(e) => onExternalNotifiedBodyChange(e.target.value)}
              placeholder="e.g. TÜV SÜD"
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="text-xs text-neutral-600">
        {nearestFutureAudit ? (
          <span>
            Nearest future audit: <span className="font-semibold text-neutral-900">{nearestFutureAudit.kind === 'external' ? 'External' : 'Internal'}</span> on{' '}
            <span className="font-semibold text-neutral-900">{nearestFutureAudit.date.toLocaleDateString()}</span>
            {nearestFutureAudit.kind === 'external' && externalNotifiedBody.trim() ? ` · ${externalNotifiedBody.trim()}` : ''}
          </span>
        ) : (
          <span>No future audit date configured yet.</span>
        )}
      </div>

      {useBackendData && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSaveSchedule}
            disabled={isScheduleSaving}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScheduleSaving ? 'Saving…' : 'Save audit schedule'}
          </button>
          {scheduleError && <div className="text-xs text-rose-700">{scheduleError}</div>}
        </div>
      )}
    </div>
  );
};

export default AuditTrailSchedulePanel;
