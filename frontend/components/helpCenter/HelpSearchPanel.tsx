import React from 'react';
import { LuFileSearch } from 'react-icons/lu';
import { getButtonClass } from '../buttonStyles';

type HelpSearchPanelProps = {
  value: string;
  placeholder: string;
  disabledClear: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
};

const HelpSearchPanel = ({ value, placeholder, disabledClear, onChange, onClear }: HelpSearchPanelProps) => {
  const clearButtonClass = disabledClear
    ? getButtonClass({
        variant: 'neutral',
        size: 'sm',
        extra:
          'bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed disabled:opacity-100 disabled:bg-neutral-100 disabled:text-neutral-500 disabled:border-neutral-200',
      })
    : getButtonClass({
        variant: 'neutral',
        size: 'sm',
        extra: 'bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800 hover:border-neutral-800',
      });

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4">
      <div className="grid grid-cols-1 gap-3">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="px-3 py-2 rounded-xl border border-neutral-200 text-sm"
        />
      </div>
      <div className="mt-3">
        <button
          type="button"
          onClick={onClear}
          disabled={disabledClear}
          className={clearButtonClass}
        >
          <LuFileSearch className="w-4 h-4" />
          Remove filters
        </button>
      </div>
    </div>
  );
};

export default HelpSearchPanel;
