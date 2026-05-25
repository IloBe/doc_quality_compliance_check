import React, { useState } from 'react';
import { LuChevronUp, LuChevronDown, LuToggleLeft, LuToggleRight, LuTrash2 } from 'react-icons/lu';
import { ModelCandidate, PROVIDER_DISPLAY_NAMES, PROVIDER_COLORS } from '../../../lib/adminModelPolicyViewModel';

type ModelPrioritySortableProps = {
  items: ModelCandidate[];
  defaultModelId: string;
  onReorder: (newOrder: ModelCandidate[]) => void;
  onToggleEnabled: (modelId: string) => void;
  onRemove: (modelId: string) => void;
  onSelectDefault: (modelId: string) => void;
  isReadOnly?: boolean;
};

/**
 * ModelPrioritySortable: SOLID component for drag/reorder of model priority list.
 * Responsibilities: Render, reorder by arrow buttons, toggle enabled state, mark default model.
 */
const ModelPrioritySortable = ({
  items,
  defaultModelId,
  onReorder,
  onToggleEnabled,
  onRemove,
  onSelectDefault,
  isReadOnly = false,
}: ModelPrioritySortableProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...items];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onReorder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const newOrder = [...items];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onReorder(newOrder);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const isDefault = item.model_id === defaultModelId;
        const providerColor = PROVIDER_COLORS[item.provider] || PROVIDER_COLORS.other;

        return (
          <div
            key={item.model_id}
            onMouseEnter={() => setHoveredId(item.model_id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`
              flex items-center gap-3 p-3 rounded-lg border transition
              ${
                isDefault
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50'
              }
            `}
          >
            {/* Priority Reorder Controls */}
            {!isReadOnly && (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <LuChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={index === items.length - 1}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <LuChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Model Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-neutral-900">{item.display_name}</h4>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${providerColor}`}
                >
                  {PROVIDER_DISPLAY_NAMES[item.provider] || item.provider}
                </span>
                {isDefault && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                    DEFAULT
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-600">
                {item.model_id} • P={item.priority} • T={item.params.temperature.toFixed(2)} • P={item.params.top_p.toFixed(2)} • K={item.params.top_k}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => onToggleEnabled(item.model_id)}
                    className={`p-2 rounded transition ${
                      item.enabled
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-neutral-400 hover:bg-neutral-100'
                    }`}
                    title={item.enabled ? 'Disable model' : 'Enable model'}
                  >
                    {item.enabled ? (
                      <LuToggleRight className="w-5 h-5" />
                    ) : (
                      <LuToggleLeft className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectDefault(item.model_id)}
                    className={`px-2 py-1 text-xs font-semibold rounded-lg transition ${
                      isDefault
                        ? 'bg-blue-200 text-blue-900 cursor-default'
                        : 'border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                    disabled={isDefault}
                    title="Set as default"
                  >
                    {isDefault ? 'Default' : 'Set Default'}
                  </button>

                  {hoveredId === item.model_id && (
                    <button
                      type="button"
                      onClick={() => onRemove(item.model_id)}
                      className="p-2 rounded text-rose-600 hover:bg-rose-50"
                      title="Remove model"
                    >
                      <LuTrash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ModelPrioritySortable;
