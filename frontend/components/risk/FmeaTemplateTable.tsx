/**
 * FmeaTemplateTable.tsx
 *
 * Excel-like editable spreadsheet for FMEA risk documentation (Table 2).
 * Implements ISO 14971 Annex D FMEA column structure from the reference image.
 *
 * Visual conventions:
 *   - S / P cells are color-coded: 1-2 green · 3 yellow · 4-5 red
 *   - RPN = S × P, auto-computed and similarly color-coded
 *   - Residual Risk: Low=green · Medium=yellow · High=red
 */
import React, { KeyboardEvent, useCallback, useState } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { getSelectionStyles } from '../../lib/selectionStyles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FmeaRow = {
  _key: string;
  nr: number;
  system_element: string;
  root_cause: string;
  failure_mode: string;
  hazard_impact: string;
  effect: string;
  severity: number;
  probability: number;
  // rpn is auto-computed; stored here for display / CSV
  rpn: number;
  mitigation: string;
  verification: string;
  post_severity: number;
  post_probability: number;
  post_rpn: number;
  residual_risk: string;
  status: string;
  post_effect_risk: string;
  new_risks: string;
  notes: string;
};

type EditTarget = { rowKey: string; colKey: string } | null;

interface Props {
  rows: FmeaRow[];
  canEdit: boolean;
  aiHighlightKey?: string | null;
  linkedHighlightKey?: string | null;
  onChange: (rows: FmeaRow[]) => void;
}

// ---------------------------------------------------------------------------
// Static column definitions
// ---------------------------------------------------------------------------

type ColType = 'text' | 'select' | 'score' | 'computed';

type ColumnDef = {
  key: keyof FmeaRow;
  label: string;
  minWidth: string;
  type: ColType;
  options?: string[];
};

const FMEA_STATUSES = ['Open', 'Mitigated', 'Verified', 'Accepted', 'Deferred'];
const RESIDUAL_RISK_OPTIONS = ['Low', 'Medium', 'High'];

const COLUMNS: ColumnDef[] = [
  { key: 'system_element', label: 'System Element', minWidth: 'min-w-[160px]', type: 'text' },
  { key: 'root_cause', label: 'Root Cause', minWidth: 'min-w-[180px]', type: 'text' },
  { key: 'failure_mode', label: 'Failure Mode / Hazard', minWidth: 'min-w-[200px]', type: 'text' },
  { key: 'hazard_impact', label: 'Hazard to / Impact on', minWidth: 'min-w-[190px]', type: 'text' },
  { key: 'effect', label: 'Potential Effect / Risk', minWidth: 'min-w-[160px]', type: 'text' },
  { key: 'severity', label: 'S (1-5)', minWidth: 'min-w-[64px]', type: 'score' },
  { key: 'probability', label: 'P (1-5)', minWidth: 'min-w-[64px]', type: 'score' },
  { key: 'rpn', label: 'RPN', minWidth: 'min-w-[56px]', type: 'computed' },
  { key: 'mitigation', label: 'Risk Mitigation', minWidth: 'min-w-[200px]', type: 'text' },
  { key: 'verification', label: 'Risk Mitigation Verification', minWidth: 'min-w-[210px]', type: 'text' },
  { key: 'post_severity', label: 'S (1-5)', minWidth: 'min-w-[64px]', type: 'score' },
  { key: 'post_probability', label: 'P (1-5)', minWidth: 'min-w-[64px]', type: 'score' },
  { key: 'post_rpn', label: 'RPN', minWidth: 'min-w-[56px]', type: 'computed' },
  { key: 'residual_risk', label: 'Residual Risk', minWidth: 'min-w-[110px]', type: 'select', options: RESIDUAL_RISK_OPTIONS },
  { key: 'status', label: 'Status', minWidth: 'min-w-[100px]', type: 'select', options: FMEA_STATUSES },
  { key: 'post_effect_risk', label: 'Potential Effect / Risk', minWidth: 'min-w-[180px]', type: 'text' },
  { key: 'new_risks', label: 'New Risks', minWidth: 'min-w-[170px]', type: 'text' },
  { key: 'notes', label: 'Notes', minWidth: 'min-w-[150px]', type: 'text' },
];

const ANALYSIS_COLUMN_KEYS: Array<keyof FmeaRow> = [
  'system_element',
  'root_cause',
  'failure_mode',
  'hazard_impact',
  'effect',
  'severity',
  'probability',
  'rpn',
];

const MANAGEMENT_COLUMN_KEYS: Array<keyof FmeaRow> = [
  'mitigation',
  'verification',
  'post_severity',
  'post_probability',
  'post_rpn',
  'residual_risk',
  'status',
  'post_effect_risk',
  'new_risks',
  'notes',
];

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function scoreColor(n: number): string {
  if (n <= 2) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (n === 3) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-rose-100 text-rose-800 border-rose-200';
}

function rpnColor(rpn: number): string {
  if (rpn <= 4) return 'bg-emerald-100 text-emerald-800 font-bold border-emerald-200';
  if (rpn <= 12) return 'bg-amber-100 text-amber-800 font-bold border-amber-200';
  return 'bg-rose-100 text-rose-800 font-bold border-rose-200';
}

function residualColor(r: string): string {
  switch (r) {
    case 'Low': return 'bg-emerald-100 text-emerald-800';
    case 'Medium': return 'bg-amber-100 text-amber-800';
    case 'High': return 'bg-rose-100 text-rose-800';
    default: return 'bg-neutral-50 text-neutral-600';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'Verified':
    case 'Accepted':
      return 'bg-emerald-100 text-emerald-800';
    case 'Mitigated':
      return 'bg-blue-100 text-blue-800';
    case 'Open':
      return 'bg-amber-100 text-amber-800';
    case 'Deferred':
      return 'bg-neutral-100 text-neutral-600';
    default:
      return 'bg-neutral-50 text-neutral-700';
  }
}

function deriveResidualRisk(rpn: number): string {
  if (rpn <= 4) return 'Low';
  if (rpn <= 12) return 'Medium';
  return 'High';
}

export function makeEmptyFmeaRow(nr: number): FmeaRow {
  return {
    _key: `fmea-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    nr,
    system_element: '',
    root_cause: '',
    failure_mode: '',
    hazard_impact: '',
    effect: '',
    severity: 1,
    probability: 1,
    rpn: 1,
    mitigation: '',
    verification: '',
    post_severity: 1,
    post_probability: 1,
    post_rpn: 1,
    residual_risk: 'Low',
    status: 'Open',
    post_effect_risk: '',
    new_risks: '',
    notes: '',
  };
}

// ---------------------------------------------------------------------------
// Cell component
// ---------------------------------------------------------------------------

type CellProps = {
  rowKey: string;
  colKey: keyof FmeaRow;
  row: FmeaRow;
  colDef: ColumnDef;
  editing: boolean;
  canEdit: boolean;
  aiHighlight: boolean;
  onStartEdit: (rowKey: string, colKey: string) => void;
  onChange: (rowKey: string, colKey: string, value: string | number) => void;
  onCommit: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
};

const Cell: React.FC<CellProps> = ({
  rowKey, colKey, row, colDef, editing, canEdit, aiHighlight,
  onStartEdit, onChange, onCommit, onKeyDown,
}) => {
  const rawValue = row[colKey];

  const baseCell = [
    'relative px-1.5 py-1 text-xs border-r border-neutral-300 align-top',
    canEdit && colDef.type !== 'computed' ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default',
    aiHighlight ? 'ring-2 ring-inset ring-violet-400' : '',
  ].join(' ');

  const handleClick = useCallback(() => {
    if (canEdit && colDef.type !== 'computed') onStartEdit(rowKey, String(colKey));
  }, [canEdit, colDef.type, onStartEdit, rowKey, colKey]);

  // --- COMPUTED (RPN) ---
  if (colDef.type === 'computed') {
    const rpn = colKey === 'post_rpn' ? row.post_rpn : row.rpn;
    return (
      <td className={`${baseCell} text-center`}>
        <span className={`block rounded px-1 py-0.5 text-[11px] text-center ${rpnColor(rpn)}`}>
          {rpn}
        </span>
      </td>
    );
  }

  // --- SCORE (S / P) ---
  if (colDef.type === 'score') {
    const n = Number(rawValue) || 1;
    if (editing) {
      return (
        <td className={`${baseCell} bg-white p-0 text-center`}>
          <select
            autoFocus
            className="w-full h-full text-xs text-center outline-none border border-blue-500 rounded bg-white"
            value={n}
            onChange={(e) => {
              const v = Number(e.target.value);
              const isPost = colKey === 'post_severity' || colKey === 'post_probability';
              const s = isPost
                ? (colKey === 'post_severity' ? v : row.post_severity)
                : (colKey === 'severity' ? v : row.severity);
              const p = isPost
                ? (colKey === 'post_probability' ? v : row.post_probability)
                : (colKey === 'probability' ? v : row.probability);
              const rpn = s * p;
              onChange(rowKey, String(colKey), v);
              // Propagate computed score update after this batch
              if (isPost) {
                onChange(rowKey, 'post_rpn', rpn);
                onChange(rowKey, 'residual_risk', deriveResidualRisk(rpn));
              } else {
                onChange(rowKey, 'rpn', rpn);
              }
            }}
            onBlur={onCommit}
            onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLSelectElement>}
          >
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </td>
      );
    }
    return (
      <td className={`${baseCell} text-center`} onClick={handleClick}>
        <span className={`block rounded px-1.5 py-0.5 text-[11px] font-bold text-center ${scoreColor(n)}`}>
          {n}
        </span>
      </td>
    );
  }

  // --- SELECT ---
  if (colDef.type === 'select' && colDef.options) {
    const strVal = String(rawValue ?? '');
    if (editing) {
      return (
        <td className={`${baseCell} bg-white p-0`}>
          <select
            autoFocus
            className="w-full h-full text-xs outline-none border border-blue-500 rounded bg-white px-1"
            value={strVal}
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
    const extraClass =
      colKey === 'residual_risk' ? residualColor(strVal)
      : colKey === 'status' ? statusColor(strVal)
      : '';
    return (
      <td className={baseCell} onClick={handleClick}>
        <span className={[
          'block truncate rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
          extraClass,
          !strVal ? 'text-neutral-300 italic normal-case font-normal' : '',
        ].join(' ')}>
          {strVal || (canEdit ? 'click' : '—')}
        </span>
      </td>
    );
  }

  // --- TEXT / TEXTAREA ---
  const strVal = String(rawValue ?? '');
  if (editing) {
    return (
      <td className={`${baseCell} bg-white p-0`}>
        <textarea
          autoFocus
          rows={2}
          className="w-full h-full min-h-[26px] px-1 py-0.5 text-xs outline-none border border-blue-500 rounded focus:ring-1 focus:ring-blue-400 resize-none bg-white"
          value={strVal}
          onChange={(e) => onChange(rowKey, String(colKey), e.target.value)}
          onBlur={onCommit}
          onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLTextAreaElement>}
        />
      </td>
    );
  }
  return (
    <td className={baseCell} onClick={handleClick}>
      <span
        className={['block truncate max-w-[220px]', !strVal ? 'text-neutral-300 italic' : 'text-neutral-800'].join(' ')}
        title={strVal}
      >
        {strVal || (canEdit ? 'click to edit' : '—')}
      </span>
    </td>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const FmeaTemplateTable: React.FC<Props> = ({ rows, canEdit, aiHighlightKey, linkedHighlightKey, onChange }) => {
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  const startEdit = useCallback((rowKey: string, colKey: string) => {
    setEditTarget({ rowKey, colKey });
  }, []);

  const commitEdit = useCallback(() => {
    setEditTarget(null);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault();
      setEditTarget(null);
    }
  }, []);

  const handleCellChange = useCallback(
    (rowKey: string, colKey: string, value: string | number) => {
      onChange(
        rows.map((r) => (r._key === rowKey ? { ...r, [colKey]: value } : r)),
      );
    },
    [rows, onChange],
  );

  const addRowBelow = useCallback(
    (afterKey: string) => {
      const idx = rows.findIndex((r) => r._key === afterKey);
      const newRow = makeEmptyFmeaRow(rows.length + 1);
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
      <table className="border-collapse text-xs" style={{ minWidth: '1560px' }}>
        <thead>
          <tr className="bg-[#2d5016] text-white select-none">
            <th
              rowSpan={3}
              className="w-10 min-w-[40px] px-1.5 py-2 text-center border-r border-b border-[#3d6b20] font-bold text-[11px] uppercase tracking-wide sticky left-0 bg-[#2d5016] z-10"
            >
              Nr.
            </th>
            <th
              colSpan={ANALYSIS_COLUMN_KEYS.length}
              className="px-1.5 py-2 text-center border-r border-b border-[#3d6b20] font-bold text-[11px] uppercase tracking-wide"
            >
              Product Risk Analysis
            </th>
            <th
              colSpan={MANAGEMENT_COLUMN_KEYS.length}
              className="px-1.5 py-2 text-center border-r border-b border-[#3d6b20] font-bold text-[11px] uppercase tracking-wide"
            >
              Product Risk Management
            </th>
            {canEdit && (
              <th
                rowSpan={3}
                className="w-16 min-w-[64px] px-1.5 py-2 text-center border-r border-b border-[#3d6b20] font-bold text-[11px] uppercase tracking-wide"
              >
                Actions
              </th>
            )}
          </tr>
          <tr className="bg-[#2d5016] text-white select-none">
            <th colSpan={3} className="px-1.5 py-1.5 text-center border-r border-b border-[#3d6b20] font-semibold text-[10px] uppercase tracking-wide text-white/80">
              Context &amp; Failure Definition
            </th>
            <th colSpan={5} className="px-1.5 py-1.5 text-center border-r border-b border-[#3d6b20] font-bold text-[10px] uppercase tracking-wide">
              Risk before Risk Mitigation
            </th>
            <th colSpan={2} className="px-1.5 py-1.5 text-center border-r border-b border-[#3d6b20] font-semibold text-[10px] uppercase tracking-wide text-white/80">
              Risk Mitigation Actions
            </th>
            <th colSpan={7} className="px-1.5 py-1.5 text-center border-r border-b border-[#3d6b20] font-bold text-[10px] uppercase tracking-wide">
              Risk after Risk Mitigation
            </th>
            <th colSpan={1} className="px-1.5 py-1.5 text-center border-r border-b border-[#3d6b20] font-semibold text-[10px] uppercase tracking-wide text-white/80">
              Notes
            </th>
          </tr>
          <tr className="bg-[#2d5016] text-white select-none">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`${col.minWidth} px-1.5 py-2 text-left border-r border-[#3d6b20] font-bold text-[11px] uppercase tracking-wide whitespace-nowrap`}
              >
                {col.label}
              </th>
            ))}
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
                <td
                  className={[
                    'px-1.5 py-1 text-center text-[11px] font-bold border-r border-neutral-200 sticky left-0 bg-inherit z-10',
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
                    row={row}
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
              const newRow = makeEmptyFmeaRow(rows.length + 1);
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

export default FmeaTemplateTable;
