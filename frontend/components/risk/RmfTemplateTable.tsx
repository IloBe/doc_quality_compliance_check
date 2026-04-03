/**
 * RmfTemplateTable.tsx
 *
 * Excel-like editable spreadsheet for Risk Management File (Table 1).
 * Columns match ISO 14971 RMF structure from the reference image.
 *
 * Interaction model:
 *   - Click any cell → inline input or select appears (edit mode)
 *   - Tab / Enter / Blur → commit and advance
 *   - Row-level "+" button → add row below
 *   - Row-level "×" button → delete row
 */
import React, { KeyboardEvent, useCallback, useRef, useState } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { getSelectionStyles } from '../../lib/selectionStyles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RmfRow = {
  /** Client-side key; not persisted (row_id is added on save) */
  _key: string;
  nr: number;
  risk_category: string;
  activity: string;
  owner_role: string;
  qualification_required: string;
  target_date: string;
  regulatory_ref: string;
  status: string;
  control_measure: string;
  verification: string;
  evidence_ref: string;
  notes: string;
};

type EditTarget = { rowKey: string; colKey: string } | null;

interface Props {
  rows: RmfRow[];
  canEdit: boolean;
  /** Highlight row key that has AI suggestions pending */
  aiHighlightKey?: string | null;
  /** Highlight row key linked from workflow selection */
  linkedHighlightKey?: string | null;
  onChange: (rows: RmfRow[]) => void;
}

// ---------------------------------------------------------------------------
// Static column definitions
// ---------------------------------------------------------------------------

type ColType = 'text' | 'select' | 'date';

type ColumnDef = {
  key: keyof RmfRow;
  label: string;
  width: string;
  type: ColType;
  options?: string[];
  minWidth?: string;
};

const RISK_CATEGORIES = [
  'Riskmanagement-Process',
  'Responsibility of Management',
  'Staff Qualifications (Target/Actual)',
  'Riskmanagement-Plan',
  'Intended Use of Product',
  'Hazardous Situation',
  'Risk Assessments',
  'Risk Mitigations',
  'Completeness',
  'Assessed Total Risk',
  'Risk Management Report',
  'Post-Market Phase',
];

const OWNER_ROLES = [
  'QM Lead',
  'Risk Manager',
  'Architect',
  'Developer',
  'Auditor',
  'Clinical Expert',
  'Regulatory Affairs',
];

const ROW_STATUSES = ['Open', 'In Progress', 'Completed', 'Verified', 'Accepted', 'Deferred'];

const COLUMNS: ColumnDef[] = [
  { key: 'risk_category', label: 'Risk Topic (Table 1)', width: 'w-52', minWidth: 'min-w-[220px]', type: 'select', options: RISK_CATEGORIES },
  { key: 'activity', label: 'Documentation Item(s)', width: 'w-72', minWidth: 'min-w-[300px]', type: 'text' },
  { key: 'owner_role', label: 'Owner / Role', width: 'w-36', minWidth: 'min-w-[130px]', type: 'select', options: OWNER_ROLES },
  { key: 'qualification_required', label: 'Qualification Required', width: 'w-44', minWidth: 'min-w-[170px]', type: 'text' },
  { key: 'target_date', label: 'Target Date', width: 'w-28', minWidth: 'min-w-[110px]', type: 'date' },
  { key: 'regulatory_ref', label: 'Regulatory Ref.', width: 'w-36', minWidth: 'min-w-[130px]', type: 'text' },
  { key: 'status', label: 'Status', width: 'w-28', minWidth: 'min-w-[110px]', type: 'select', options: ROW_STATUSES },
  { key: 'control_measure', label: 'Control Measure', width: 'w-52', minWidth: 'min-w-[200px]', type: 'text' },
  { key: 'verification', label: 'Verification', width: 'w-44', minWidth: 'min-w-[170px]', type: 'text' },
  { key: 'evidence_ref', label: 'Reference Link(s) / Document IDs', width: 'w-56', minWidth: 'min-w-[220px]', type: 'text' },
  { key: 'notes', label: 'Notes', width: 'w-44', minWidth: 'min-w-[170px]', type: 'text' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status: string): string {
  switch (status) {
    case 'Completed':
    case 'Verified':
    case 'Accepted':
      return 'bg-emerald-100 text-emerald-800';
    case 'In Progress':
      return 'bg-blue-100 text-blue-800';
    case 'Open':
      return 'bg-amber-100 text-amber-800';
    case 'Deferred':
      return 'bg-neutral-100 text-neutral-600';
    default:
      return 'bg-neutral-50 text-neutral-700';
  }
}

export function makeEmptyRmfRow(nr: number): RmfRow {
  return {
    _key: `rmf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    nr,
    risk_category: '',
    activity: '',
    owner_role: '',
    qualification_required: '',
    target_date: '',
    regulatory_ref: '',
    status: 'Open',
    control_measure: '',
    verification: '',
    evidence_ref: '',
    notes: '',
  };
}

// ---------------------------------------------------------------------------
// Cell component
// ---------------------------------------------------------------------------

type CellProps = {
  rowKey: string;
  colKey: keyof RmfRow;
  value: string;
  colDef: ColumnDef;
  editing: boolean;
  canEdit: boolean;
  aiHighlight: boolean;
  onStartEdit: (rowKey: string, colKey: string) => void;
  onChange: (rowKey: string, colKey: string, value: string) => void;
  onCommit: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
};

const Cell: React.FC<CellProps> = ({
  rowKey, colKey, value, colDef, editing, canEdit, aiHighlight,
  onStartEdit, onChange, onCommit, onKeyDown,
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);

  const handleClick = useCallback(() => {
    if (canEdit) onStartEdit(rowKey, String(colKey));
  }, [canEdit, onStartEdit, rowKey, colKey]);

  const baseCell = [
    'relative px-1.5 py-1 text-xs border-r border-neutral-300 align-top',
    canEdit ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default',
    aiHighlight ? 'ring-2 ring-inset ring-violet-400' : '',
  ].join(' ');

  if (editing) {
    const inputClass =
      'w-full h-full min-h-[26px] px-1 py-0.5 text-xs outline-none bg-white border border-blue-500 rounded focus:ring-1 focus:ring-blue-400 resize-none';

    if (colDef.type === 'select' && colDef.options) {
      return (
        <td className={`${baseCell} bg-white p-0`}>
          <select
            autoFocus
            className={inputClass}
            value={value}
            onChange={(e) => onChange(rowKey, String(colKey), e.target.value)}
            onBlur={onCommit}
            onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLSelectElement>}
          >
            <option value="">— select —</option>
            {colDef.options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </td>
      );
    }

    if (colDef.type === 'date') {
      return (
        <td className={`${baseCell} bg-white p-0`}>
          <input
            autoFocus
            type="date"
            className={inputClass}
            value={value}
            onChange={(e) => onChange(rowKey, String(colKey), e.target.value)}
            onBlur={onCommit}
            onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLInputElement>}
          />
        </td>
      );
    }

    return (
      <td className={`${baseCell} bg-white p-0`}>
        <textarea
          autoFocus
          rows={2}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(rowKey, String(colKey), e.target.value)}
          onBlur={onCommit}
          onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLTextAreaElement>}
        />
      </td>
    );
  }

  const displayClass = colKey === 'status' ? statusColor(value) : '';

  return (
    <td className={baseCell} onClick={handleClick}>
      <span
        className={[
          'block truncate max-w-[240px]',
          colKey === 'status' && value ? `rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${displayClass}` : '',
          !value ? 'text-neutral-300 italic' : 'text-neutral-800',
        ].join(' ')}
        title={value}
      >
        {value || (canEdit ? 'click to edit' : '—')}
      </span>
    </td>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const RmfTemplateTable: React.FC<Props> = ({ rows, canEdit, aiHighlightKey, linkedHighlightKey, onChange }) => {
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  const startEdit = useCallback((rowKey: string, colKey: string) => {
    setEditTarget({ rowKey, colKey });
  }, []);

  const commitEdit = useCallback(() => {
    setEditTarget(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setEditTarget(null);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        setEditTarget(null);
      }
    },
    [],
  );

  const handleCellChange = useCallback(
    (rowKey: string, colKey: string, value: string) => {
      onChange(
        rows.map((r) =>
          r._key === rowKey ? { ...r, [colKey]: value } : r,
        ),
      );
    },
    [rows, onChange],
  );

  const addRowBelow = useCallback(
    (afterKey: string) => {
      const idx = rows.findIndex((r) => r._key === afterKey);
      const newRow = makeEmptyRmfRow(rows.length + 1);
      const next = [...rows.slice(0, idx + 1), newRow, ...rows.slice(idx + 1)].map((r, i) => ({
        ...r,
        nr: i + 1,
      }));
      onChange(next);
    },
    [rows, onChange],
  );

  const deleteRow = useCallback(
    (key: string) => {
      const next = rows.filter((r) => r._key !== key).map((r, i) => ({ ...r, nr: i + 1 }));
      onChange(next);
    },
    [rows, onChange],
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-300 bg-white">
      <table className="border-collapse text-xs" style={{ minWidth: '1100px' }}>
        <thead>
          <tr className="bg-[#1e3a5f] text-white select-none">
            <th className="w-10 min-w-[40px] px-1.5 py-2 text-center border-r border-[#2d4e7e] font-bold text-[11px] uppercase tracking-wide sticky left-0 bg-[#1e3a5f] z-10">
              Nr.
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`${col.minWidth} px-1.5 py-2 text-left border-r border-[#2d4e7e] font-bold text-[11px] uppercase tracking-wide whitespace-nowrap`}
              >
                {col.label}
              </th>
            ))}
            {canEdit && (
              <th className="w-16 min-w-[64px] px-1.5 py-2 text-center border-r border-[#2d4e7e] font-bold text-[11px] uppercase tracking-wide">
                Actions
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={COLUMNS.length + (canEdit ? 2 : 1)}
                className="px-4 py-6 text-center text-neutral-400 italic text-xs"
              >
                No rows yet.{canEdit ? ' Use "Add row" below to start.' : ''}
              </td>
            </tr>
          )}
          {rows.map((row, rowIdx) => {
            const isAiRow = aiHighlightKey === row._key;
            const isLinkedRow = linkedHighlightKey === row._key;
            const rowBg = rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#eef4fb]';
            const selectionStyles = getSelectionStyles({
              isSelected: isLinkedRow,
              tone: 'amber',
              defaultRowClass: rowBg,
              defaultStickyCellClass: 'text-neutral-500 bg-inherit',
            });

            return (
              <tr
                key={row._key}
                className={[
                  selectionStyles.rowClass,
                  isAiRow ? 'ring-2 ring-inset ring-violet-300' : '',
                ].join(' ')}
              >
                {/* Nr. — sticky */}
                <td
                  className={[
                    'px-1.5 py-1 text-center text-[11px] font-bold border-r border-neutral-200 sticky left-0 z-10',
                    selectionStyles.stickyCellClass,
                  ].join(' ')}
                  title={isLinkedRow ? 'Linked from selected risk record workflow item' : undefined}
                >
                  {isLinkedRow ? `↔ ${row.nr}` : row.nr}
                </td>

                {COLUMNS.map((col) => (
                  <Cell
                    key={col.key}
                    rowKey={row._key}
                    colKey={col.key}
                    value={String(row[col.key] ?? '')}
                    colDef={col}
                    editing={editTarget?.rowKey === row._key && editTarget?.colKey === col.key}
                    canEdit={canEdit}
                    aiHighlight={isAiRow}
                    onStartEdit={startEdit}
                    onChange={handleCellChange}
                    onCommit={commitEdit}
                    onKeyDown={handleKeyDown}
                  />
                ))}

                {canEdit && (
                  <td className="px-1 py-1 text-center border-r border-neutral-200">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        title="Add row below"
                        onClick={() => addRowBelow(row._key)}
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition"
                      >
                        <LuPlus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete row"
                        onClick={() => deleteRow(row._key)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 transition"
                      >
                        <LuTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {canEdit && (
        <div className="border-t border-neutral-200 bg-neutral-50 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              const newRow = makeEmptyRmfRow(rows.length + 1);
              onChange([...rows, newRow]);
            }}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 uppercase tracking-wider transition"
          >
            <LuPlus className="h-3.5 w-3.5" />
            Add row
          </button>
        </div>
      )}
    </div>
  );
};

export default RmfTemplateTable;
