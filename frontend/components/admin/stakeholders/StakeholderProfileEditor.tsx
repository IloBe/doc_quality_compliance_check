import React from 'react';
import { LuCircleCheck, LuLoader, LuLock, LuPlus, LuSave, LuTrash2 } from 'react-icons/lu';
import { Permission, StakeholderProfileUi } from '../../../lib/adminStakeholdersViewModel';
import { StakeholderEmployeeAssignment } from '../../../lib/stakeholderClient';

type StakeholderProfileEditorProps = {
  selectedProfile: StakeholderProfileUi;
  permissionCatalog: Permission[];
  selectedAssignments: StakeholderEmployeeAssignment[];
  employeeNameInput: string;
  bulkMode: boolean;
  bulkEmployeeInput: string;
  isSaving: boolean;
  isAssignmentBusy: boolean;
  saveMessage: string;
  onSaveTemplate: () => void;
  onUpdateProfile: (patch: Partial<StakeholderProfileUi>) => void;
  onTogglePermission: (permissionKey: string) => void;
  onEmployeeNameInputChange: (value: string) => void;
  onBulkModeToggle: () => void;
  onBulkEmployeeInputChange: (value: string) => void;
  onAddEmployee: () => void;
  onBulkAddEmployees: () => void;
  onRemoveEmployee: (assignmentId: string) => void;
};

const StakeholderProfileEditor = ({
  selectedProfile,
  permissionCatalog,
  selectedAssignments,
  employeeNameInput,
  bulkMode,
  bulkEmployeeInput,
  isSaving,
  isAssignmentBusy,
  saveMessage,
  onSaveTemplate,
  onUpdateProfile,
  onTogglePermission,
  onEmployeeNameInputChange,
  onBulkModeToggle,
  onBulkEmployeeInputChange,
  onAddEmployee,
  onBulkAddEmployees,
  onRemoveEmployee,
}: StakeholderProfileEditorProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 xl:col-span-2 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900">{selectedProfile.title}</h2>
          <p className="text-sm text-neutral-600 mt-1">{selectedProfile.description}</p>
        </div>
        <button
          type="button"
          onClick={onSaveTemplate}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          {isSaving ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuSave className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save template'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label htmlFor="stakeholder-title" className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
            Title
          </label>
          <input
            id="stakeholder-title"
            type="text"
            value={selectedProfile.title}
            onChange={(event) => onUpdateProfile({ title: event.target.value })}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Stakeholder title"
          />
        </div>

        <div>
          <label htmlFor="stakeholder-description" className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
            Description
          </label>
          <textarea
            id="stakeholder-description"
            value={selectedProfile.description}
            onChange={(event) => onUpdateProfile({ description: event.target.value })}
            className="w-full min-h-[96px] rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Describe responsibilities and governance scope"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onUpdateProfile({ isActive: !selectedProfile.isActive })}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              selectedProfile.isActive
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <LuCircleCheck className="w-4 h-4" />
            {selectedProfile.isActive ? 'Active profile' : 'Inactive profile'}
          </button>
          <span className="text-xs text-neutral-500">Inactive profiles remain stored but can be excluded by admin queries.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {permissionCatalog.map((permission) => {
          const enabled = selectedProfile.permissions.includes(permission.key);
          return (
            <button
              key={permission.key}
              type="button"
              onClick={() => onTogglePermission(permission.key)}
              className={`w-full flex items-start justify-between gap-3 p-3 rounded-xl border transition ${
                enabled
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800'
              }`}
            >
              <div>
                <div className="font-semibold">{permission.label}</div>
                <div className="text-xs text-neutral-500 mt-0.5">{permission.key}</div>
              </div>
              {enabled ? <LuCircleCheck className="w-5 h-5" /> : <LuLock className="w-5 h-5 text-neutral-400" />}
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Assigned employees</h3>

        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-500">Add single employee or switch to bulk mode.</span>
          <button
            type="button"
            onClick={onBulkModeToggle}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            {bulkMode ? 'Single add mode' : 'Bulk add mode'}
          </button>
        </div>

        {!bulkMode ? (
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              type="text"
              value={employeeNameInput}
              onChange={(event) => onEmployeeNameInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onAddEmployee();
                }
              }}
              className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Add employee full name"
            />
            <button
              type="button"
              onClick={onAddEmployee}
              disabled={isAssignmentBusy || !employeeNameInput.trim()}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAssignmentBusy ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuPlus className="w-4 h-4" />}
              Add
            </button>
          </div>
        ) : (
          <div className="mb-3 space-y-2">
            <textarea
              value={bulkEmployeeInput}
              onChange={(event) => onBulkEmployeeInputChange(event.target.value)}
              className="w-full min-h-[110px] rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder={'Add one employee name per line\nAlice Example\nBob Example\nCharlie Example'}
            />
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={onBulkAddEmployees}
                disabled={isAssignmentBusy || !bulkEmployeeInput.trim()}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAssignmentBusy ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuPlus className="w-4 h-4" />}
                Add all
              </button>
            </div>
          </div>
        )}

        {selectedAssignments.length === 0 ? (
          <div className="text-sm text-neutral-500">No employees assigned to this role yet.</div>
        ) : (
          <div className="space-y-2">
            {selectedAssignments.map((assignment) => (
              <div key={assignment.assignment_id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-800">{assignment.employee_name}</div>
                  <div className="text-xs text-neutral-500">Added by {assignment.created_by || 'n/a'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveEmployee(assignment.assignment_id)}
                  disabled={isAssignmentBusy}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                >
                  <LuTrash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {saveMessage && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">{saveMessage}</div>}
    </div>
  );
};

export default StakeholderProfileEditor;
