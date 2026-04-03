import React from 'react';
import Link from 'next/link';
import { LuCircleAlert, LuCircleCheck, LuExternalLink } from 'react-icons/lu';
import { ComplianceAlert, toneClasses } from '../../lib/complianceStandards';

type AlertsPanelProps = {
  alerts: ComplianceAlert[];
};

const AlertsPanel = ({ alerts }: AlertsPanelProps) => {
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-neutral-100 shadow-md overflow-hidden relative min-h-[200px] flex flex-col justify-between">
      <div className="bg-emerald-50 text-emerald-600 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-6">
        <LuCircleCheck className="w-3.5 h-3.5" />
        Real-time Feed Active
      </div>

      <h3 className="text-lg font-black text-neutral-900 mb-4 tracking-tight">Recent Compliance Alerts</h3>
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
