import React from 'react';
import { RuntimeModelParameters } from '../../../lib/modelPolicyClient';

type ModelParametersEditorProps = {
  modelId: string;
  displayName: string;
  params: RuntimeModelParameters;
  onParamChange: (modelId: string, param: keyof RuntimeModelParameters, value: number) => void;
  isReadOnly?: boolean;
};

/**
 * ModelParametersEditor: SOLID component for editing model runtime parameters.
 * Responsibilities: Render sliders for temperature, top_p, top_k with live validation and feedback.
 */
const ModelParametersEditor = ({
  modelId,
  displayName,
  params,
  onParamChange,
  isReadOnly = false,
}: ModelParametersEditorProps) => {
  const handleSliderChange = (param: keyof RuntimeModelParameters, value: number) => {
    onParamChange(modelId, param, value);
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-1">
          Runtime Parameters
        </h3>
        <p className="text-xs text-neutral-600">{displayName}</p>
      </div>

      {/* Temperature Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor={`temp-${modelId}`} className="text-sm font-semibold text-neutral-800">
            Temperature
          </label>
          <span className="inline-flex items-center gap-1">
            <input
              id={`temp-input-${modelId}`}
              type="number"
              min="0"
              max="2"
              step="0.01"
              value={params.temperature.toFixed(2)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0 && val <= 2) {
                  handleSliderChange('temperature', val);
                }
              }}
              disabled={isReadOnly}
              className="w-12 rounded px-1 py-0.5 border border-neutral-200 text-xs text-center focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:bg-neutral-100"
            />
            <span className="text-xs text-neutral-600">/ 2.0</span>
          </span>
        </div>
        <input
          type="range"
          id={`temp-${modelId}`}
          min="0"
          max="2"
          step="0.01"
          value={params.temperature}
          onChange={(e) => handleSliderChange('temperature', parseFloat(e.target.value))}
          disabled={isReadOnly}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-400 disabled:opacity-50"
        />
        <div className="flex justify-between text-xs text-neutral-500">
          <span>More deterministic</span>
          <span>More creative</span>
        </div>
      </div>

      {/* Top-P Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor={`topp-${modelId}`} className="text-sm font-semibold text-neutral-800">
            Top-P (Nucleus Sampling)
          </label>
          <span className="inline-flex items-center gap-1">
            <input
              id={`topp-input-${modelId}`}
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={params.top_p.toFixed(2)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0 && val <= 1) {
                  handleSliderChange('top_p', val);
                }
              }}
              disabled={isReadOnly}
              className="w-12 rounded px-1 py-0.5 border border-neutral-200 text-xs text-center focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:bg-neutral-100"
            />
            <span className="text-xs text-neutral-600">/ 1.0</span>
          </span>
        </div>
        <input
          type="range"
          id={`topp-${modelId}`}
          min="0"
          max="1"
          step="0.01"
          value={params.top_p}
          onChange={(e) => handleSliderChange('top_p', parseFloat(e.target.value))}
          disabled={isReadOnly}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-400 disabled:opacity-50"
        />
        <div className="flex justify-between text-xs text-neutral-500">
          <span>More focused</span>
          <span>More diverse</span>
        </div>
      </div>

      {/* Top-K Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor={`topk-${modelId}`} className="text-sm font-semibold text-neutral-800">
            Top-K
          </label>
          <span className="inline-flex items-center gap-1">
            <input
              id={`topk-input-${modelId}`}
              type="number"
              min="1"
              max="500"
              step="1"
              value={params.top_k}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= 500) {
                  handleSliderChange('top_k', val);
                }
              }}
              disabled={isReadOnly}
              className="w-12 rounded px-1 py-0.5 border border-neutral-200 text-xs text-center focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:bg-neutral-100"
            />
            <span className="text-xs text-neutral-600">/ 500</span>
          </span>
        </div>
        <input
          type="range"
          id={`topk-${modelId}`}
          min="1"
          max="500"
          step="1"
          value={params.top_k}
          onChange={(e) => handleSliderChange('top_k', parseInt(e.target.value, 10))}
          disabled={isReadOnly}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-400 disabled:opacity-50"
        />
        <div className="flex justify-between text-xs text-neutral-500">
          <span>Restrictive (1)</span>
          <span>Permissive (500)</span>
        </div>
      </div>
    </div>
  );
};

export default ModelParametersEditor;
