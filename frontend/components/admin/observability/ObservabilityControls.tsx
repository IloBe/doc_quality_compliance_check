import React from 'react';
import { LuRefreshCw } from 'react-icons/lu';
import { getHeaderControlClass, getHeaderToggleGroupClass } from '../../../components/buttonStyles';
import { getSelectionButtonClass } from '../../../lib/selectionStyles';

type WindowOption = { label: string; value: number };

type ObservabilityControlsProps = {
  windows: readonly WindowOption[];
  windowHours: number;
  onWindowChange: (value: number) => void;
  onRefresh: () => void;
};

const ObservabilityControls = ({ windows, windowHours, onWindowChange, onRefresh }: ObservabilityControlsProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className={getHeaderToggleGroupClass()}>
        {windows.map((option) => {
          const active = option.value === windowHours;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onWindowChange(option.value)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${getSelectionButtonClass({
                isSelected: active,
                tone: 'blue',
                selectedClass: 'bg-blue-600 text-white',
              })}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className={getHeaderControlClass('neutral')}
      >
        <LuRefreshCw className="w-4 h-4" />
        Refresh
      </button>
    </div>
  );
};

export default ObservabilityControls;
