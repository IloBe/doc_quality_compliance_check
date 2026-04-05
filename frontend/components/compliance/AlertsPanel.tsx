import React from 'react';
import Link from 'next/link';
import { LuCircleAlert, LuCircleCheck, LuExternalLink, LuTriangleAlert } from 'react-icons/lu';
import InfoIconButton from '../InfoIconButton';
import { ComplianceAlert, ComplianceAlertsInfo, toneClasses } from '../../lib/complianceStandards';

type AlertsPanelProps = {
  alerts: ComplianceAlert[];
  info: ComplianceAlertsInfo;
};

const AlertsPanel = ({ alerts, info }: AlertsPanelProps) => {
  const [showCostInfo, setShowCostInfo] = React.useState(false);

  return (
    <div className="bg-white rounded-[2rem] p-6 border border-neutral-100 shadow-md overflow-hidden relative min-h-[200px] flex flex-col justify-between">
      <div className="bg-emerald-50 text-emerald-600 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-6">
        <LuCircleCheck className="w-3.5 h-3.5" />
        Perplexity Research Watch Active
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-neutral-900 tracking-tight">Recent Compliance Alerts</h3>
          <InfoIconButton
            onClick={() => setShowCostInfo((prev) => !prev)}
            title="Show token and cost configuration note"
            aria-label="Show token and cost configuration note"
            size="md"
          />
        </div>

        <p className="text-sm font-medium leading-6 text-neutral-600">{info.summary}</p>

        {showCostInfo ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <div className="flex items-start gap-3">
              <LuTriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-black text-amber-950">{info.costNoteTitle}</p>
                <p className="mt-1 leading-6 text-amber-900">{info.costNote}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => {
          const tone = toneClasses(alert.tone);
          return (
            <div key={alert.id} className="flex gap-4 p-4 hover:bg-neutral-50 rounded-2xl transition cursor-pointer border border-transparent hover:border-neutral-100">
              <div className="mt-1">
                <LuCircleAlert className={`w-4 h-4 ${tone.alertIcon}`} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-neutral-800 leading-tight">{alert.text}</p>
                <p className="text-[10px] text-neutral-400 uppercase tracking-tighter">{alert.meta}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-8 border-t border-neutral-50">
        <div className="flex items-center justify-between w-full text-[11px] font-black uppercase tracking-widest text-blue-600">
          <span>View Alert Archive</span>
          <Link
            href="/alert-archive"
            aria-label="Open compliance alert archive"
            title="Open compliance alert archive"
            className="inline-flex items-center justify-center rounded-lg border border-blue-100 p-1.5 text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
          >
            <LuExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AlertsPanel;
