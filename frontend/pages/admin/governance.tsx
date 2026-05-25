import React, { useEffect, useState } from 'react';
import { LuLoader, LuTriangleAlert } from 'react-icons/lu';
import AdminBootstrapDiagnosticBadge from '../../components/admin/AdminBootstrapDiagnosticBadge';
import FooterInfoCard from '../../components/FooterInfoCard';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';
import { formatDateTime } from '../../lib/dateTime';
import {
  statusLabel,
  statusPillClass,
} from '../../lib/adminGovernanceViewModel';
import {
  createGovernanceControl,
  fetchGovernanceSnapshot,
  GovernanceControlCreatePayload,
  GovernanceSnapshotUi,
} from '../../lib/governanceClient';

/**
 * Render compliance controls and governance policy posture for admin users.
 *
 * Design notes:
 * - Uses deterministic local data to avoid runtime dependency on unfinished APIs.
 * - Preserves a production-ready loading/error flow for future backend integration.
 */
const AdminGovernancePage = () => {
  const [snapshot, setSnapshot] = useState<GovernanceSnapshotUi | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isSubmittingControl, setIsSubmittingControl] = useState<boolean>(false);
  const [controlSaveMessage, setControlSaveMessage] = useState<string>('');
  const [newControl, setNewControl] = useState<GovernanceControlCreatePayload>({
    name: '',
    framework_id: '',
    framework: '',
    control_type: 'directive',
    activation_mode: 'context',
    domain_tags: ['medical'],
    market_tags: ['eu'],
    objective: '',
    implementation: '',
    evidence: '',
    status: 'draft',
    is_active: true,
  });

  useEffect(() => {
    let mounted = true;

    const loadGovernanceSnapshot = async () => {
      setIsLoading(true);
      setError('');

      try {
        const data = await fetchGovernanceSnapshot();
        if (!mounted) {
          return;
        }
        setSnapshot(data);

        if (data.degradedToDemo) {
          setError('Live governance API unavailable. Showing resilient demo snapshot.');
        }
      } catch (err) {
        if (!mounted) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Failed to load governance controls.';
        setError(message);

        // Structured log payload for diagnostics and incident triage.
        console.error('admin.governance.load_failed', {
          error: message,
          route: '/admin/governance',
        });
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadGovernanceSnapshot();

    return () => {
      mounted = false;
    };
  }, []);

  const refreshSnapshot = async () => {
    const data = await fetchGovernanceSnapshot();
    setSnapshot(data);
  };

  const onCreateControl = async () => {
    setControlSaveMessage('');
    setIsSubmittingControl(true);
    try {
      await createGovernanceControl(newControl);
      await refreshSnapshot();
      setNewControl((prev) => ({
        ...prev,
        name: '',
        framework_id: '',
        framework: '',
        objective: '',
        implementation: '',
        evidence: '',
      }));
      setControlSaveMessage('Control item saved to governance catalog.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save control item.';
      setControlSaveMessage(message);
    } finally {
      setIsSubmittingControl(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Admin / Governance"
        title="Compliance Controls & Policies"
        subtitle="Operational control baseline for policy lifecycle, evidence completeness, and framework accountability."
        whyDescription="This governance surface centralizes policy ownership and control implementation status so review teams can identify drift early, prioritize remediation actions, and preserve audit readiness."
        rightContent={<AdminBootstrapDiagnosticBadge />}
      />

      {isLoading && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center gap-3 text-neutral-600">
          <LuLoader className="w-5 h-5 animate-spin" />
          Loading governance controls and policy registry...
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2 text-sm text-rose-800">
          <LuTriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {!isLoading && snapshot && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {snapshot.metrics.map((metric) => (
              <article key={metric.id} className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{metric.label}</div>
                <div className="text-3xl font-black text-neutral-900 mt-2">
                  {metric.value}
                  {metric.unit ? <span className="text-lg ml-1">{metric.unit}</span> : null}
                </div>
                <div className={`mt-3 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPillClass(metric.status)}`}>
                  {statusLabel(metric.status)}
                </div>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-black text-neutral-900">Policy Registry</h2>
              <p className="text-sm text-neutral-600 mt-1">
                Policy ownership and review cadence tracking for controlled admin processes.
              </p>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="px-2 py-2 text-left font-semibold text-neutral-600">Policy</th>
                      <th className="px-2 py-2 text-left font-semibold text-neutral-600">Owner</th>
                      <th className="px-2 py-2 text-left font-semibold text-neutral-600">Review</th>
                      <th className="px-2 py-2 text-left font-semibold text-neutral-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.policies.map((policy) => (
                      <tr key={policy.id} className="border-b border-neutral-100 align-top">
                        <td className="px-2 py-3">
                          <div className="font-semibold text-neutral-900">{policy.title}</div>
                          <div className="text-xs text-neutral-500">{policy.version}</div>
                        </td>
                        <td className="px-2 py-3 text-neutral-700">{policy.owner}</td>
                        <td className="px-2 py-3 text-neutral-700">
                          <div>{policy.reviewCadence}</div>
                          <div className="text-xs text-neutral-500">Next: {policy.nextReviewDate}</div>
                        </td>
                        <td className="px-2 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPillClass(policy.status)}`}>
                            {statusLabel(policy.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-black text-neutral-900">Control Implementation Matrix</h2>
              <p className="text-sm text-neutral-600 mt-1">
                End-to-end mapping from framework objective to implementation evidence.
              </p>

              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
                <div className="text-xs font-black uppercase tracking-widest text-blue-700">Add control item (App Admin / QM Lead)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={newControl.name}
                    onChange={(event) => setNewControl((prev) => ({ ...prev, name: event.target.value }))}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    placeholder="Control name"
                  />
                  <input
                    value={newControl.framework}
                    onChange={(event) => setNewControl((prev) => ({ ...prev, framework: event.target.value }))}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    placeholder="Framework label (e.g. GDPR Art. 32)"
                  />
                  <input
                    value={newControl.framework_id}
                    onChange={(event) => setNewControl((prev) => ({ ...prev, framework_id: event.target.value }))}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    placeholder="Framework id (e.g. gdpr)"
                  />
                  <select
                    value={newControl.control_type}
                    onChange={(event) => setNewControl((prev) => ({ ...prev, control_type: event.target.value as GovernanceControlCreatePayload['control_type'] }))}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="directive">Directive</option>
                    <option value="norm">Norm</option>
                    <option value="policy">Policy</option>
                    <option value="sop">SOP</option>
                  </select>
                  <select
                    value={newControl.activation_mode}
                    onChange={(event) => setNewControl((prev) => ({ ...prev, activation_mode: event.target.value as GovernanceControlCreatePayload['activation_mode'] }))}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="baseline">Baseline</option>
                    <option value="context">Context</option>
                  </select>
                  <input
                    value={newControl.domain_tags.join(',')}
                    onChange={(event) => setNewControl((prev) => ({ ...prev, domain_tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    placeholder="Domain tags (comma-separated)"
                  />
                  <input
                    value={newControl.market_tags.join(',')}
                    onChange={(event) => setNewControl((prev) => ({ ...prev, market_tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    placeholder="Market tags (comma-separated, e.g. eu,us)"
                  />
                  <select
                    value={newControl.status}
                    onChange={(event) => setNewControl((prev) => ({ ...prev, status: event.target.value as GovernanceControlCreatePayload['status'] }))}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="compliant">Compliant</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <textarea
                  value={newControl.objective}
                  onChange={(event) => setNewControl((prev) => ({ ...prev, objective: event.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  placeholder="Objective"
                />
                <textarea
                  value={newControl.implementation}
                  onChange={(event) => setNewControl((prev) => ({ ...prev, implementation: event.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  placeholder="Implementation"
                />
                <input
                  value={newControl.evidence}
                  onChange={(event) => setNewControl((prev) => ({ ...prev, evidence: event.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  placeholder="Evidence"
                />

                <div className="flex items-center justify-between gap-3">
                  {controlSaveMessage ? <div className="text-xs text-neutral-700">{controlSaveMessage}</div> : <span />}
                  <button
                    type="button"
                    onClick={onCreateControl}
                    disabled={isSubmittingControl}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white ${
                      isSubmittingControl ? 'bg-neutral-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSubmittingControl ? 'Saving...' : 'Add Control Item'}
                  </button>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {snapshot.controls.map((control) => (
                  <article key={control.id} className="rounded-xl border border-neutral-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900">{control.name}</h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {control.framework}
                          {control.activation_mode ? ` · ${control.activation_mode}` : ''}
                          {control.control_type ? ` · ${control.control_type}` : ''}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(control.status)}`}>
                        {statusLabel(control.status)}
                      </span>
                    </div>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div>
                        <dt className="font-semibold text-neutral-700">Objective</dt>
                        <dd className="text-neutral-600">{control.objective}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-neutral-700">Implementation</dt>
                        <dd className="text-neutral-600">{control.implementation}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-neutral-700">Evidence</dt>
                        <dd className="text-neutral-600">{control.evidence}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <FooterInfoCard title="Governance note" accent="amber">
            Governance policy updates should follow controlled change-management workflows, include owner sign-off, and be paired with evidence updates to maintain audit-grade traceability.
            Last data refresh: {formatDateTime(snapshot.updatedAtIso, 'n/a')}
          </FooterInfoCard>
        </>
      )}
    </div>
  );
};

export default AdminGovernancePage;
