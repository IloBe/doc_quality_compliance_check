import React, { useState, useCallback, useMemo } from 'react';
import { LuLoader, LuSave, LuX, LuTriangleAlert } from 'react-icons/lu';
import ModelPrioritySortable from './ModelPrioritySortable';
import ModelParametersEditor from './ModelParametersEditor';
import {
  ModelCandidate,
  ModelPolicyUI,
  updatePriorities,
  validateModelPolicy,
  PROVIDER_DISPLAY_NAMES,
} from '../../../lib/adminModelPolicyViewModel';
import { RuntimeModelParameters } from '../../../lib/modelPolicyClient';

type ModelPolicyEditorProps = {
  policy: ModelPolicyUI;
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string;
  onSave: (updatedPolicy: ModelPolicyUI) => Promise<void>;
  onCancel: () => void;
};

/**
 * ModelPolicyEditor: SOLID component for managing model priority and runtime parameters.
 * Responsibilities: State management of edits, orchestration of sub-components, validation, persistence.
 * Single Responsibility: Handles UI orchestration; delegates rendering to sub-components.
 */
const ModelPolicyEditor = ({
  policy,
  isLoading = false,
  isSaving = false,
  error: externalError,
  onSave,
  onCancel,
}: ModelPolicyEditorProps) => {
  const [editedPolicy, setEditedPolicy] = useState<ModelPolicyUI>(policy);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(
    editedPolicy.items[0]?.model_id || null
  );
  const [internalError, setInternalError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Validation errors
  const validationErrors = useMemo(
    () => validateModelPolicy(editedPolicy),
    [editedPolicy]
  );

  // Selected model for parameter editing
  const selectedModel = useMemo(
    () => editedPolicy.items.find((item) => item.model_id === selectedModelId),
    [editedPolicy.items, selectedModelId]
  );

  // Handlers: Reordering (SOLID - single responsibility)
  const handleReorder = useCallback((newOrder: ModelCandidate[]) => {
    const reorderedWithPriorities = updatePriorities(newOrder, newOrder);
    setEditedPolicy((prev) => ({
      ...prev,
      items: reorderedWithPriorities,
    }));
    setSaveMessage('');
  }, []);

  // Handlers: Toggle enabled state
  const handleToggleEnabled = useCallback((modelId: string) => {
    setEditedPolicy((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.model_id === modelId ? { ...item, enabled: !item.enabled } : item
      ),
    }));
    setSaveMessage('');
  }, []);

  // Handlers: Remove model
  const handleRemoveModel = useCallback((modelId: string) => {
    setEditedPolicy((prev) => {
      const updated = {
        ...prev,
        items: prev.items.filter((item) => item.model_id !== modelId),
      };
      // If default model was removed, pick the first enabled model or first in list
      if (updated.default_model_id === modelId) {
        updated.default_model_id =
          updated.items.find((item) => item.enabled)?.model_id ||
          updated.items[0]?.model_id ||
          '';
      }
      return updated;
    });
    setSaveMessage('');
  }, []);

  // Handlers: Set default model
  const handleSetDefaultModel = useCallback((modelId: string) => {
    setEditedPolicy((prev) => ({
      ...prev,
      default_model_id: modelId,
    }));
    setSaveMessage('');
  }, []);

  // Handlers: Update parameter (temperature, top_p, top_k)
  const handleParamChange = useCallback(
    (modelId: string, param: keyof RuntimeModelParameters, value: number) => {
      setEditedPolicy((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.model_id === modelId
            ? {
                ...item,
                params: {
                  ...item.params,
                  [param]: value,
                },
              }
            : item
        ),
      }));
      setSaveMessage('');
    },
    []
  );

  // Handlers: Save policy
  const handleSave = useCallback(async () => {
    setInternalError('');
    setSaveMessage('');

    if (validationErrors.length > 0) {
      setInternalError(validationErrors.join('; '));
      return;
    }

    try {
      await onSave(editedPolicy);
      setSaveMessage('Model policy saved successfully.');
    } catch (err) {
      setInternalError(
        err instanceof Error ? err.message : 'Failed to save model policy'
      );
    }
  }, [editedPolicy, onSave, validationErrors]);

  if (isLoading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center gap-3 text-neutral-600">
        <LuLoader className="w-5 h-5 animate-spin" />
        Loading model policy...
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white border border-neutral-200 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-neutral-900">Model Priority & Parameters</h2>
          <p className="text-sm text-neutral-600 mt-1">
            Configure model ranking, defaults, and runtime parameters.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
        >
          <LuX className="w-5 h-5" />
        </button>
      </div>

      {/* Error Display (External) */}
      {externalError && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex gap-2 text-sm text-rose-800">
          <LuTriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {externalError}
        </div>
      )}

      {/* Error Display (Internal Validation) */}
      {internalError && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex gap-2 text-sm text-rose-800">
          <LuTriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {internalError}
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-amber-900 mb-1">Validation Issues:</div>
          <ul className="text-xs text-amber-800 space-y-0.5">
            {validationErrors.map((err, idx) => (
              <li key={idx}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {saveMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
          {saveMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Model Priority List */}
        <div className="lg:col-span-1 space-y-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-2">
              Model Ranking
            </h3>
            <p className="text-xs text-neutral-600">Drag to reorder priority. Top = highest priority.</p>
          </div>
          <ModelPrioritySortable
            items={editedPolicy.items}
            defaultModelId={editedPolicy.default_model_id}
            onReorder={handleReorder}
            onToggleEnabled={handleToggleEnabled}
            onRemove={handleRemoveModel}
            onSelectDefault={handleSetDefaultModel}
          />
        </div>

        {/* Right: Parameter Sliders */}
        <div className="lg:col-span-2 space-y-3">
          {selectedModel ? (
            <>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-2">
                  Edit Parameters
                </h3>
                <p className="text-xs text-neutral-600">
                  Click a model to edit its runtime parameters.
                </p>
              </div>
              <ModelParametersEditor
                modelId={selectedModel.model_id}
                displayName={selectedModel.display_name}
                params={selectedModel.params}
                onParamChange={handleParamChange}
              />
            </>
          ) : (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 text-center text-neutral-600">
              <p>Select a model to edit parameters</p>
            </div>
          )}
        </div>
      </div>

      {/* Model List for Quick Selection */}
      {editedPolicy.items.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-widest text-neutral-400">
            Select Model for Editing
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {editedPolicy.items.map((item) => (
              <button
                key={item.model_id}
                type="button"
                onClick={() => setSelectedModelId(item.model_id)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-semibold transition border
                  ${
                    selectedModelId === item.model_id
                      ? 'border-blue-300 bg-blue-50 text-blue-900'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }
                `}
              >
                {item.display_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || validationErrors.length > 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isSaving ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuSave className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Policy'}
        </button>
      </div>
    </div>
  );
};

export default ModelPolicyEditor;
