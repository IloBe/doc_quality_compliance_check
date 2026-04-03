import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LuArrowLeft, LuFileCheck, LuInfo } from 'react-icons/lu';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';
import { useAuth } from '../../lib/authContext';
import {
  fetchStandardMappingRequests,
  submitStandardMappingRequest,
  StandardMappingRequestRecord,
} from '../../lib/complianceMappingRequestClient';

const RequestStandardMappingPage = () => {
  const { currentUser } = useAuth();

  const [standardName, setStandardName] = useState('');
  const [sopReference, setSopReference] = useState('');
  const [businessJustification, setBusinessJustification] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tenantId, setTenantId] = useState('default');
  const [requesterEmail, setRequesterEmail] = useState(currentUser?.email || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [records, setRecords] = useState<StandardMappingRequestRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);

  useEffect(() => {
    if (currentUser?.email) {
      setRequesterEmail(currentUser.email);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoadingRecords(true);
      const result = await fetchStandardMappingRequests(25);
      if (!active) return;
      setRecords(result.items);
      setIsDemoMode(Boolean(result.degradedToDemo));
      setIsLoadingRecords(false);
    };

    run();
    return () => {
      active = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return (
      standardName.trim().length >= 3 &&
      sopReference.trim().length >= 3 &&
      businessJustification.trim().length >= 15 &&
      requesterEmail.trim().includes('@')
    );
  }, [standardName, sopReference, businessJustification, requesterEmail]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      setSubmitError('Fill all required fields. Business justification must be at least 15 characters.');
      setSubmitMessage(null);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);

    const result = await submitStandardMappingRequest({
      standard_name: standardName,
      sop_reference: sopReference,
      business_justification: businessJustification,
      requester_email: requesterEmail,
      tenant_id: tenantId,
      project_id: projectId || null,
    });

    if (!result.ok || !result.record) {
      setSubmitError('Request failed. Retry in a moment.');
      setIsSubmitting(false);
      return;
    }

    setSubmitMessage(result.message);
    setIsDemoMode(Boolean(result.degradedToDemo));
    setRecords((prev) => [result.record as StandardMappingRequestRecord, ...prev].slice(0, 25));
    setStandardName('');
    setSopReference('');
    setBusinessJustification('');
    setProjectId('');
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeaderWithWhy
        eyebrow="Governance & Standards"
        title="Request New Standard Mapping"
        subtitle="Submit a structured request for additional SOP-to-standard mapping in agent workflows."
        whyDescription="This form externalizes mapping-change intent with rationale and trace metadata. In production, requests are persisted server-side for reproducibility."
      />

      <div className="flex items-center justify-between gap-3">
        <Link
          href="/compliance"
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-neutral-700 transition hover:bg-neutral-50"
        >
          <LuArrowLeft className="h-4 w-4" />
          Back to Compliance Standards
        </Link>

        {isDemoMode ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-amber-800">
            <LuInfo className="h-4 w-4" />
            Demo fallback storage active
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 rounded-[2rem] border border-neutral-100 bg-white p-8 shadow-sm">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
            <LuFileCheck className="h-3.5 w-3.5" />
            Mapping Request Form
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-neutral-500" htmlFor="standard-name">
                Target standard
              </label>
              <input
                id="standard-name"
                value={standardName}
                onChange={(e) => setStandardName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
                placeholder="e.g. IEC 62304"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-neutral-500" htmlFor="sop-reference">
                SOP or requirement reference
              </label>
              <input
                id="sop-reference"
                value={sopReference}
                onChange={(e) => setSopReference(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
                placeholder="e.g. SOP-QMS-012 §4.2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-neutral-500" htmlFor="tenant-id">
                  Tenant
                </label>
                <input
                  id="tenant-id"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
                  placeholder="default"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-neutral-500" htmlFor="project-id">
                  Project (optional)
                </label>
                <input
                  id="project-id"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
                  placeholder="ai-qms-core"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-neutral-500" htmlFor="requester-email">
                Requester email
              </label>
              <input
                id="requester-email"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
                placeholder="auditor@example.com"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-neutral-500" htmlFor="business-justification">
                Business justification
              </label>
              <textarea
                id="business-justification"
                value={businessJustification}
                onChange={(e) => setBusinessJustification(e.target.value)}
                rows={5}
                className="mt-1 w-full resize-y rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
                placeholder="Describe why this mapping is required and what compliance risk is reduced."
              />
            </div>

            {submitError ? <p className="text-sm text-rose-700">{submitError}</p> : null}
            {submitMessage ? <p className="text-sm text-emerald-700">{submitMessage}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="inline-flex w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-100 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting request...' : 'Submit mapping request'}
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] border border-neutral-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500">Recent requests</h2>
          <div className="mt-4 space-y-3">
            {isLoadingRecords ? (
              <p className="text-xs text-neutral-500">Loading request history...</p>
            ) : records.length === 0 ? (
              <p className="text-xs text-neutral-500">No mapping requests yet.</p>
            ) : (
              records.map((record) => (
                <article key={record.request_id} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-neutral-500">{record.request_id}</p>
                  <p className="mt-1 text-sm font-bold text-neutral-800">{record.standard_name}</p>
                  <p className="text-xs text-neutral-600">{record.sop_reference}</p>
                  <p className="mt-1 text-[11px] text-neutral-500">{new Date(record.submitted_at).toLocaleString()}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default RequestStandardMappingPage;
