import React, { useState, useEffect, useCallback } from 'react';
import { LuLoader, LuTriangleAlert } from 'react-icons/lu';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';
import ModelPolicyEditor from '../../components/admin/model_policy/ModelPolicyEditor';
import {
  fetchModelPolicy,
  updateModelPolicy,
  ModelPolicyPayload,
} from '../../lib/modelPolicyClient';
import {
  toModelPolicyUI,
  getDefaultModelPolicy,
} from '../../lib/adminModelPolicyViewModel';

/**
 * AdminModelPolicyPage: SOLID page component for model policy management.
 * Responsibilities: Fetch data, handle lifecycle, pass to editor component.
 */
const AdminModelPolicyPage = () => {
  const [policy, setPolicy] = useState(getDefaultModelPolicy());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);

  // Fetch model policy on mount
  useEffect(() => {
    const loadPolicy = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await fetchModelPolicy();
        setPolicy(toModelPolicyUI(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load model policy');
        setPolicy(getDefaultModelPolicy());
      } finally {
        setIsLoading(false);
      }
    };

    loadPolicy();
  }, []);

  // Handle save
  const handleSave = useCallback(
    async (updatedPolicy) => {
      setIsSaving(true);
      setError('');
      try {
        const payload: ModelPolicyPayload = {
          default_model_id: updatedPolicy.default_model_id,
          items: updatedPolicy.items,
        };
        const result = await updateModelPolicy(payload);
        setPolicy(toModelPolicyUI(result));
        setShowEditor(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save model policy');
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Admin / AI Governance"
        title="Model Policy & Parameters"
        subtitle="Manage model priority ranking, fallback strategy, and runtime parameters."
        whyDescription="Centralized model governance ensures consistent AI inference behavior across compliance workflows. Administrators can adjust model selection and parameters without API calls."
      />

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2 text-sm text-rose-800">
          <LuTriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {showEditor ? (
        <ModelPolicyEditor
          policy={policy}
          isLoading={false}
          isSaving={isSaving}
          error={error}
          onSave={handleSave}
          onCancel={() => setShowEditor(false)}
        />
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center gap-3 text-neutral-600">
              <LuLoader className="w-5 h-5 animate-spin" />
              Loading model policy...
            </div>
          ) : (
            <>
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-neutral-900">Current Configuration</h2>
                    <p className="text-sm text-neutral-600 mt-1">
                      {policy.items.length} model(s) configured
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEditor(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                  >
                    Edit Policy
                  </button>
                </div>

                {/* Model Overview Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600">
                          Priority
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600">
                          Model
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600">
                          Provider
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600">
                          Parameters
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600">
                          Default
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {policy.items.map((item) => (
                        <tr key={item.model_id} className="border-b border-neutral-100 hover:bg-neutral-50">
                          <td className="px-3 py-2 font-semibold text-blue-600">{item.priority}</td>
                          <td className="px-3 py-2 text-neutral-900">{item.display_name}</td>
                          <td className="px-3 py-2 text-neutral-700">{item.provider}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                item.enabled
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              {item.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-neutral-600 font-mono">
                            T={item.params.temperature.toFixed(2)} P={item.params.top_p.toFixed(2)} K=
                            {item.params.top_k}
                          </td>
                          <td className="px-3 py-2">
                            {item.model_id === policy.default_model_id ? (
                              <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-900">
                                DEFAULT
                              </span>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {policy.updated_at && (
                  <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                    <strong>Last updated:</strong> {policy.updated_at} by {policy.updated_by || 'system'}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminModelPolicyPage;
