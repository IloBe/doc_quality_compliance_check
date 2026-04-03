import React from 'react';
import { LuPlus } from 'react-icons/lu';
import { getButtonClass } from '../buttonStyles';
import { GlossaryTerm } from '../../lib/helpCenterViewModel';

type GlossaryComposerProps = {
  draft: GlossaryTerm;
  canSubmit: boolean;
  onDraftChange: (nextDraft: GlossaryTerm) => void;
  onSubmit: () => void;
};

const GlossaryComposer = ({ draft, canSubmit, onDraftChange, onSubmit }: GlossaryComposerProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3">
      <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400">Add glossary item</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <input
          value={draft.term}
          onChange={(event) => onDraftChange({ ...draft, term: event.target.value })}
          placeholder="Term"
          className="px-3 py-2 rounded-xl border border-neutral-200 text-sm"
        />
        <input
          value={draft.domain}
          onChange={(event) => onDraftChange({ ...draft, domain: event.target.value })}
          placeholder="Domain"
          className="px-3 py-2 rounded-xl border border-neutral-200 text-sm"
        />
        <input
          value={draft.definition}
          onChange={(event) => onDraftChange({ ...draft, definition: event.target.value })}
          placeholder="Definition"
          className="px-3 py-2 rounded-xl border border-neutral-200 text-sm"
        />
      </div>
      <div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={getButtonClass({ variant: 'primary', size: 'sm', extra: 'gap-2' })}
        >
          <LuPlus className="w-4 h-4" />
          Add item
        </button>
      </div>
    </div>
  );
};

export default GlossaryComposer;
