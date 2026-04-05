import React from 'react';
import { LuArchive, LuCircleAlert, LuExternalLink } from 'react-icons/lu';
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
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {alert.framework ? (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${tone.badge}`}>
                        {alert.framework}
                      </span>
                    ) : null}
                    {alert.isDemo ? (
                      <span className="inline-flex rounded-full bg-neutral-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-neutral-700">
                        Demo
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-bold text-neutral-800">{alert.text}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500">{alert.meta}</p>
                  {alert.sourceLabel ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                      <span>{alert.sourceLabel}</span>
                      {alert.sourceUrl ? (
                        <a
                          href={alert.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 transition hover:text-blue-800"
                        >
                          Source
                          <LuExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  ) : null}
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
