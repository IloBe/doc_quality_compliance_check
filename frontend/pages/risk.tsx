import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { LuInfo, LuShieldAlert, LuX } from 'react-icons/lu';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import { getButtonClass, getHeaderInfoChipClass } from '../components/buttonStyles';
import RiskFiltersPanel from '../components/risk/RiskFiltersPanel';
import RiskKpiGrid from '../components/risk/RiskKpiGrid';
import RiskRecordsTable from '../components/risk/RiskRecordsTable';
import RiskTemplateEditor from '../components/risk/RiskTemplateEditor';
import { useAuth, useCan } from '../lib/authContext';
import { appendRiskAction, fetchRiskActions, RiskAction, RiskActionType } from '../lib/riskActionClient';
import { createRiskTemplate } from '../lib/riskTemplateClient';
import { Document, useMockStore } from '../lib/mockStore';
import {
  buildRiskDocId,
  buildRiskStats,
  buildSeededRiskRows,
  filterRiskRows,
  formatRiskDate,
  RiskStatusFilter,
  RiskTypeFilter,
} from '../lib/riskViewModel';

const RiskPage = () => {
  const { currentUser } = useAuth();
  const canEdit = useCan('doc.edit');
  const canApprove = useCan('review.approve');

  const documents = useMockStore((state) => state.documents);
  const addDocument = useMockStore((state) => state.addDocument);
  const updateDocStatus = useMockStore((state) => state.updateDocStatus);

  const [actions, setActions] = useState<RiskAction[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RiskTypeFilter>('All');
  const [statusFilter, setStatusFilter] = useState<RiskStatusFilter>('All');
  const [productFilter, setProductFilter] = useState('All');

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'RMF' | 'FMEA'>('RMF');
  const [newProduct, setNewProduct] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [tableInfoOpen, setTableInfoOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const rows = useMemo(() => buildSeededRiskRows(documents), [documents]);
  const visibleRows = useMemo(
    () => filterRiskRows(rows, query, typeFilter, statusFilter, productFilter),
    [rows, query, typeFilter, statusFilter, productFilter],
  );
  const stats = useMemo(() => buildRiskStats(rows), [rows]);

  const products = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((item) => set.add(item.product));
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const selectedRecord = useMemo(
    () => rows.find((item) => item.id === selectedRecordId) ?? null,
    [rows, selectedRecordId],
  );

  useEffect(() => {
    if (rows.length === 0) {
      if (selectedRecordId !== null) setSelectedRecordId(null);
      return;
    }
    if (!selectedRecordId || !rows.some((item) => item.id === selectedRecordId)) {
      setSelectedRecordId(rows[0].id);
    }
  }, [rows, selectedRecordId]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setIsLoadingActions(true);
      const response = await fetchRiskActions(250);
      if (!mounted) {
        return;
      }

      setActions(response.items);
      setIsDemoMode(Boolean(response.degradedToDemo));
      setIsLoadingActions(false);
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  const actorEmail = currentUser?.email || 'unknown@example.invalid';
  const actorRole = currentUser?.roles?.[0] || 'user';

  const appendAction = async (
    recordId: string,
    actionType: RiskActionType,
    rationale: string,
  ): Promise<RiskAction | null> => {
    const response = await appendRiskAction({
      record_id: recordId,
      action_type: actionType,
      actor_email: actorEmail,
      actor_role: actorRole,
      rationale,
    });

    if (!response.ok || !response.item) {
      setErrorMessage('Failed to persist risk action.');
      return null;
    }

    setActions((prev) => [response.item as RiskAction, ...prev].slice(0, 300));
    setInfoMessage(response.message);
    setErrorMessage(null);
    setIsDemoMode(Boolean(response.degradedToDemo));
    return response.item;
  };

  const transitionStatus = async (
    recordId: string,
    nextStatus: Document['status'],
    actionType: RiskActionType,
    rationale: string,
  ) => {
    setBusyRecordId(recordId);
    const persisted = await appendAction(recordId, actionType, rationale);
    if (persisted) {
      updateDocStatus(recordId, nextStatus);
    }
    setBusyRecordId(null);
  };

  const canCreate = newTitle.trim().length >= 3 && newProduct.trim().length >= 3 && newRationale.trim().length >= 10;

  const onCreateRiskRecord = async (event: FormEvent) => {
    event.preventDefault();

    if (!canEdit) {
      setErrorMessage('Your role is read-only for risk record creation.');
      return;
    }

    if (!canCreate) {
      setErrorMessage('Title, product, and rationale are required.');
      return;
    }

    const id = buildRiskDocId(newType);

    // Add document to mock store
    addDocument({
      id,
      title: newTitle.trim(),
      type: newType,
      product: newProduct.trim(),
      status: 'Draft',
      version: '0.1.0',
      updatedBy: actorEmail,
      content: `# ${newTitle.trim()}\n\n## Risk rationale\n${newRationale.trim()}\n`,
    });

    // Create risk template with auto-seeding
    const templateResult = await createRiskTemplate({
      template_type: newType,
      template_title: newTitle.trim(),
      product: newProduct.trim(),
      created_by: actorEmail,
      rationale: newRationale.trim(),
      // Empty rows array: backend will auto-seed based on template_type
      rows: [],
    });

    if (!templateResult.ok) {
      setErrorMessage(`Failed to create risk template: ${templateResult.message}`);
      return;
    }

    await appendAction(id, 'create', newRationale.trim());

    setSelectedRecordId(id);
    setQuery('');
    setTypeFilter('All');
    setStatusFilter('All');
    setProductFilter('All');

    setInfoMessage(`Risk record created with ${templateResult.data?.rows?.length || 0} seed rows.`);
    setNewTitle('');
    setNewProduct('');
    setNewRationale('');
  };

  const riskActions = useMemo(() => {
    const ids = new Set(rows.map((item) => item.id));
    return actions.filter((item) => ids.has(item.record_id)).slice(0, 10);
  }, [actions, rows]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Governance Workspace"
        title="Risk (FMEA/RMF)"
        subtitle="Manage company-wide and product-specific risk records with traceable lifecycle actions."
        whyDescription="This page operationalizes SAD Section 1 risk documentation constraints: separate company-level RMF and product-level risk handling, enforce action traceability (who/when/why), and keep graceful demo continuity when backend persistence is unavailable."
        rightContent={
          <div className={getHeaderInfoChipClass()}>
            <LuShieldAlert className="h-4 w-4 text-rose-600" />
            Risk governance
          </div>
        }
      />

      {isDemoMode ? (
        <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-amber-800">
          <LuInfo className="h-4 w-4" />
          Demo fallback storage active
        </div>
      ) : null}

      {infoMessage ? <p className="text-sm text-emerald-700">{infoMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}

      <RiskKpiGrid stats={stats} />

      <RiskFiltersPanel
        query={query}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        productFilter={productFilter}
        products={products}
        onQueryChange={setQuery}
        onTypeFilterChange={setTypeFilter}
        onStatusFilterChange={setStatusFilter}
        onProductFilterChange={setProductFilter}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 space-y-4">
          {isLoadingActions ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500">Loading risk action history...</div>
          ) : null}

          <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Risk records (workflow list)</h3>
            <p className="mt-1 text-xs text-slate-700">
              This list is for lifecycle governance only: <strong>Draft → In Review → Approved</strong>.
              Use these entries to submit, approve, or request changes. No records are removed on create.
            </p>
          </div>

          <RiskRecordsTable
            rows={visibleRows}
            selectedRecordId={selectedRecordId}
            canEdit={canEdit}
            canApprove={canApprove}
            busyRecordId={busyRecordId}
            onSelectRecord={setSelectedRecordId}
            onSubmitForReview={(recordId) => transitionStatus(recordId, 'In Review', 'submit_for_review', 'Submitted risk record for review gate')}
            onApprove={(recordId) => transitionStatus(recordId, 'Approved', 'approve', 'Approved risk controls and linked evidence set')}
            onRequestChanges={(recordId) => transitionStatus(recordId, 'rework after review', 'request_changes', 'Changes requested after HITL review')}
          />

          <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Risk templates (editable content)</h3>
            <p className="mt-1 text-xs text-slate-700">
              This section contains the editable RMF/FMEA table content. <strong>Save, Export CSV, Push, and Load Default</strong> 
              &nbsp;actions apply to the currently active template tab.
            </p>
          </div>

          <RiskTemplateEditor
            actorEmail={actorEmail}
            canEdit={canEdit}
            product={selectedRecord?.product || products[0] || 'AI-Diagnostics-Core'}
            selectedRecordType={selectedRecord?.type}
            selectedRecordTitle={selectedRecord?.title}
            selectedRecordProduct={selectedRecord?.product}
          />
        </section>

        <section className="space-y-4">
          <article className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Create risk record</h2>
              <button
                type="button"
                aria-label="About reference tables"
                onClick={() => setTableInfoOpen(true)}
                className="rounded-full p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-blue-600 transition-colors"
              >
                <LuInfo className="h-3.5 w-3.5" />
              </button>
            </div>

            {tableInfoOpen && (
              <div
                className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                onClick={() => setTableInfoOpen(false)}
              >
                <div
                  className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-2xl p-6 space-y-5 text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setTableInfoOpen(false)}
                    className="absolute top-4 right-4 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                  >
                    <LuX className="h-4 w-4" />
                  </button>

                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-700 pr-6">Reference Tables</h3>

                  {/* Table 1 */}
                  <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-blue-700">Table 1 — Risk Management File Reference</p>
                    <p className="text-xs text-neutral-700">
                      Table 1 is the company-level <strong>Risk Management File (RMF)</strong> reference. It captures governance-level
                      planning, responsibilities, qualifications, controls, verification, and evidence links across the full product lifecycle.
                    </p>
                    <p className="text-[11px] text-blue-600 italic">
                      Tip: Use the <strong>RMF</strong> type tab to edit this structure directly and save/export the resulting template.
                    </p>
                  </section>

                  {/* Table 2 */}
                  <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Table 2 — Product-Specific Risk Documentation Reference</p>
                    <p className="text-xs text-neutral-700">
                      Table 2 is the product-level <strong>FMEA (Failure Mode and Effects Analysis)</strong> reference. It captures
                      component-level failure modes, effects, severity, probability, risk priority numbers (RPN), and mitigation measures
                      for a specific product or system.
                    </p>
                    <p className="text-[11px] text-emerald-600 italic">
                      Tip: Use the <strong>FMEA</strong> type tab to edit this structure directly and save/export the resulting template.
                    </p>
                  </section>
                </div>
              </div>
            )}
            <form className="mt-3 space-y-3" onSubmit={onCreateRiskRecord}>
              <div>
                <label htmlFor="risk-new-title" className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Title</label>
                <input
                  id="risk-new-title"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
                  placeholder="e.g. Company RMF 2026"
                />
              </div>

              <div>
                <label htmlFor="risk-new-type" className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Type</label>
                <select
                  id="risk-new-type"
                  value={newType}
                  onChange={(event) => setNewType(event.target.value as 'RMF' | 'FMEA')}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
                >
                  <option value="RMF">RMF (Company-wide)</option>
                  <option value="FMEA">FMEA (Product-specific)</option>
                </select>
              </div>

              <div>
                <label htmlFor="risk-new-product" className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Product</label>
                <input
                  id="risk-new-product"
                  value={newProduct}
                  onChange={(event) => setNewProduct(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
                  placeholder="e.g. AI-Diagnostics-Core"
                />
              </div>

              <div>
                <label htmlFor="risk-new-rationale" className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Rationale</label>
                <textarea
                  id="risk-new-rationale"
                  value={newRationale}
                  onChange={(event) => setNewRationale(event.target.value)}
                  rows={4}
                  className="mt-1 w-full resize-y rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400"
                  placeholder="Describe risk scope, hazard context, and intended controls."
                />
              </div>

              <button
                type="submit"
                disabled={!canEdit || !canCreate}
                className={getButtonClass({ variant: 'primary', size: 'sm', fullWidth: true })}
              >
                Create risk record
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Recent risk actions</h2>
            <div className="mt-3 space-y-2">
              {riskActions.length === 0 ? (
                <p className="text-xs text-neutral-500">No risk actions captured yet.</p>
              ) : (
                riskActions.map((item) => (
                  <div key={item.action_id} className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-neutral-500">{item.action_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-neutral-700 mt-1">{item.record_id}</p>
                    <p className="text-[11px] text-neutral-500 mt-1">{formatRiskDate(item.action_date)} · {item.actor_email}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>

      <FooterInfoCard title="Governance note" accent="blue">
        Risk records are controlled governance artifacts. RMF/FMEA status transitions require explicit rationale, accountable actor context, and traceable linkage to mitigation evidence.
      </FooterInfoCard>
    </div>
  );
};

export default RiskPage;
