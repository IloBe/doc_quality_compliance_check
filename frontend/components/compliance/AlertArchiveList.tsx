import React from 'react';
import { LuArchive, LuCircleAlert } from 'react-icons/lu';
import { ComplianceAlert, toneClasses } from '../../lib/complianceStandards';

type AlertArchiveListProps = {
  alerts: ComplianceAlert[];
};

const AlertArchiveList = ({ alerts }: AlertArchiveListProps) => {
  return (
    <section className="rounded-[2rem] border border-neutral-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-700">
        <LuArchive className="h-4 w-4 text-blue-600" />
        Alert Archive
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const tone = toneClasses(alert.tone);
          return (
            <article
              key={alert.id}
              className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 transition hover:bg-white"
            >
              <div className="flex items-start gap-3">
                <LuCircleAlert className={`mt-0.5 h-4 w-4 ${tone.alertIcon}`} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-neutral-800">{alert.text}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500">{alert.meta}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AlertArchiveList;
