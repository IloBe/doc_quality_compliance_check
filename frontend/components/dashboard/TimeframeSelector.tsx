import React from 'react';
import { DashboardTimeframe } from '../../lib/dashboardClient';
import { getSelectionButtonClass } from '../../lib/selectionStyles';
import { getHeaderToggleGroupClass } from '../buttonStyles';

type TimeframeSelectorProps = {
  value: DashboardTimeframe;
  onChange: (timeframe: DashboardTimeframe) => void;
};

const timeframeButtons: Array<{ key: DashboardTimeframe; label: string }> = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const TimeframeSelector = ({ value, onChange }: TimeframeSelectorProps) => {
  return (
    <div className={getHeaderToggleGroupClass()}>
      {timeframeButtons.map((item) => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${getSelectionButtonClass({
              isSelected: active,
              tone: 'blue',
            })}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default TimeframeSelector;
