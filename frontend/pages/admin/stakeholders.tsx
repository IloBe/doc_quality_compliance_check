import React, { useEffect, useMemo, useState } from 'react';
import { LuCircleCheck, LuInfo, LuLoader, LuLock, LuPlus, LuSave, LuTrash2, LuUsers } from 'react-icons/lu';
import WhyThisPageMatters from '../../components/WhyThisPageMatters';
import { useAuth } from '../../lib/authContext';
import {
  addStakeholderAssignment,
  fetchStakeholderAssignments,
  fetchStakeholderProfiles,
  removeStakeholderAssignment,
  saveStakeholderProfile,
  StakeholderEmployeeAssignment,
  StakeholderProfile,
} from '../../lib/stakeholderClient';

type Permission = {
  key: string;
  label: string;
};

type StakeholderProfileUi = {
  id: string;
  title: string;
  description: string;
  permissions: string[];
  isActive: boolean;
};

const permissionCatalog: Permission[] = [
  { key: 'doc.edit', label: 'Edit governed documents' },
  { key: 'bridge.run', label: 'Execute bridge workflows' },
  { key: 'export.create', label: 'Create export evidence packages' },
  { key: 'review.approve', label: 'Approve review outcomes' },
  { key: 'audit.write', label: 'Write audit trail events' },
];

const initialProfiles: StakeholderProfileUi[] = [
  {
    id: 'qm_lead',
    title: 'QM Lead',
    description: 'Owns quality governance decisions and final approval readiness.',
    permissions: ['doc.edit', 'bridge.run', 'export.create', 'review.approve', 'audit.write'],
    isActive: true,
  },
  {
    id: 'auditor',
    title: 'Auditor',
    description: 'Performs independent audit checks and evidence validation.',
    permissions: ['bridge.run', 'export.create', 'review.approve', 'audit.write'],
    isActive: true,
  },
  {
    id: 'riskmanager',
    title: 'Risk Manager',
    description: 'Maintains risk controls and release-governance acceptance criteria.',
    permissions: ['doc.edit', 'bridge.run', 'export.create', 'review.approve', 'audit.write'],
    isActive: true,
  },
  {
    id: 'architect',
    title: 'Architect',
    description: 'Owns architecture artifacts and technical compliance alignment.',
    permissions: ['doc.edit', 'export.create', 'audit.write'],
    isActive: true,
  },
  {
    id: 'service',
    title: 'Service Client',
    description: 'Machine profile for backend skills and observability data ingestion.',
    permissions: ['doc.edit', 'bridge.run', 'export.create', 'review.approve', 'audit.write'],
    isActive: true,
  },
];

const toUiProfile = (item: StakeholderProfile): StakeholderProfileUi => ({
  id: item.profile_id,
  title: item.title,
  description: item.description,
  permissions: item.permissions || [],
  isActive: item.is_active,
});

const AdminStakeholdersPage = () => {
  const { currentUser } = useAuth();
  const [profiles, setProfiles] = useState<StakeholderProfileUi[]>(initialProfiles);
  const [selectedRole, setSelectedRole] = useState<string>(initialProfiles[0].id);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showWhyThisPageMatters, setShowWhyThisPageMatters] = useState(false);
  const [assignmentByProfile, setAssignmentByProfile] = useState<Record<string, StakeholderEmployeeAssignment[]>>({});
  const [employeeNameInput, setEmployeeNameInput] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkEmployeeInput, setBulkEmployeeInput] = useState('');
  const [isAssignmentBusy, setIsAssignmentBusy] = useState(false);

  useEffect(() => {
    const loadProfiles = async () => {
      setIsLoading(true);
      setError('');
      try {
        const items = await fetchStakeholderProfiles(true);
        if (!items.length) {
          setProfiles(initialProfiles);
          return;
        }
        const mapped = items.map(toUiProfile);
        setProfiles(mapped);
        if (!mapped.some((p) => p.id === selectedRole)) {
          setSelectedRole(mapped[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stakeholder profiles.');
        setProfiles(initialProfiles);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find((item) => item.id === selectedRole) ?? profiles[0],
    [profiles, selectedRole],
  );

  const selectedAssignments = assignmentByProfile[selectedRole] || [];

  useEffect(() => {
    if (!selectedRole) {
      return;
    }

    const loadAssignments = async () => {
      try {
        const rows = await fetchStakeholderAssignments(selectedRole);
        setAssignmentByProfile((prev) => ({
          ...prev,
          [selectedRole]: rows,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assigned employees.');
      }
    };

    loadAssignments();
  }, [selectedRole]);

  const togglePermission = (permission: string) => {
    setProfiles((prev) =>
      prev.map((profile) => {
        if (profile.id !== selectedRole) {
          return profile;
        }
        const has = profile.permissions.includes(permission);
        return {
          ...profile,
          permissions: has
            ? profile.permissions.filter((item) => item !== permission)
            : [...profile.permissions, permission],
        };
      }),
    );
    setSaveMessage('');
  };

  const updateSelectedProfile = (patch: Partial<StakeholderProfileUi>) => {
    setProfiles((prev) =>
      prev.map((profile) => (profile.id === selectedRole ? { ...profile, ...patch } : profile)),
    );
    setSaveMessage('');
  };

  const handleSaveTemplate = () => {
    if (!selectedProfile) {
      return;
    }

    const persist = async () => {
      setIsSaving(true);
      setError('');
      setSaveMessage('');
      try {
        const saved = await saveStakeholderProfile(selectedProfile.id, {
          title: selectedProfile.title,
          description: selectedProfile.description,
          permissions: selectedProfile.permissions,
          is_active: selectedProfile.isActive,
        });
        const savedUi = toUiProfile(saved);
        setProfiles((prev) => prev.map((profile) => (profile.id === savedUi.id ? savedUi : profile)));
        setSaveMessage('Role template saved to backend persistence.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save stakeholder profile.');
      } finally {
        setIsSaving(false);
      }
    };

    persist();
  };

  const handleAddEmployee = async () => {
    if (!selectedRole) {
      return;
    }
    const normalized = employeeNameInput.trim();
    if (!normalized) {
      return;
    }

    setIsAssignmentBusy(true);
    setError('');
    try {
      const created = await addStakeholderAssignment(selectedRole, normalized);
      setAssignmentByProfile((prev) => {
        const current = prev[selectedRole] || [];
        if (current.some((item) => item.assignment_id === created.assignment_id)) {
          return prev;
        }
        return {
          ...prev,
          [selectedRole]: [...current, created].sort((a, b) => a.employee_name.localeCompare(b.employee_name)),
        };
      });
      setEmployeeNameInput('');
      setSaveMessage('Employee assignment saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign employee.');
    } finally {
      setIsAssignmentBusy(false);
    }
  };

  const handleRemoveEmployee = async (assignmentId: string) => {
    if (!selectedRole) {
      return;
    }

    setIsAssignmentBusy(true);
    setError('');
    try {
      await removeStakeholderAssignment(selectedRole, assignmentId);
      setAssignmentByProfile((prev) => ({
        ...prev,
        [selectedRole]: (prev[selectedRole] || []).filter((item) => item.assignment_id !== assignmentId),
      }));
      setSaveMessage('Employee assignment removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove employee assignment.');
    } finally {
      setIsAssignmentBusy(false);
    }
  };

  const handleBulkAddEmployees = async () => {
    if (!selectedRole) {
      return;
    }

    const names = Array.from(
      new Set(
        bulkEmployeeInput
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    if (!names.length) {
      return;
    }

    setIsAssignmentBusy(true);
    setError('');
    try {
      const results = await Promise.allSettled(
        names.map((name) => addStakeholderAssignment(selectedRole, name)),
      );

      const succeeded = results
        .filter((result): result is PromiseFulfilledResult<StakeholderEmployeeAssignment> => result.status === 'fulfilled')
        .map((result) => result.value);

      if (succeeded.length > 0) {
        setAssignmentByProfile((prev) => {
          const current = prev[selectedRole] || [];
          const merged = [...current];
          for (const item of succeeded) {
            if (!merged.some((x) => x.assignment_id === item.assignment_id)) {
              merged.push(item);
            }
          }
          merged.sort((a, b) => a.employee_name.localeCompare(b.employee_name));
          return { ...prev, [selectedRole]: merged };
        });
      }

      const failedCount = results.length - succeeded.length;
      setSaveMessage(
        failedCount > 0
          ? `Bulk add completed: ${succeeded.length} added, ${failedCount} failed.`
          : `Bulk add completed: ${succeeded.length} added.`,
      );
      setBulkEmployeeInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk-assign employees.');
    } finally {
      setIsAssignmentBusy(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Admin / Access Governance</div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Stakeholder Profiles & Authorization Rights</h1>
            <button
              type="button"
              onClick={() => setShowWhyThisPageMatters((prev) => !prev)}
              className="p-1.5 rounded-full text-neutral-400 hover:text-blue-700 hover:bg-blue-50 transition"
              title="Why this page matters"
            >
              <LuInfo className="w-4 h-4" />
            </button>
          </div>
          <p className="text-neutral-500 font-medium mt-1">Configure role templates used for controlled access in compliance workflows.</p>
        </div>
      </div>

      {showWhyThisPageMatters && (
        <WhyThisPageMatters
          description="Clear role profiles reduce accidental over-permissioning and improve auditability. This view centralizes role-template governance before changes are rolled out to production RBAC policy."
        />
      )}

      {isLoading && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center gap-3 text-neutral-600">
          <LuLoader className="w-5 h-5 animate-spin" />
          Loading stakeholder profiles...
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-800">{error}</div>
      )}

      {!isLoading && (
      <>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 xl:col-span-1">
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Profiles</h2>
          <div className="space-y-2">
            {profiles.map((profile) => {
              const active = profile.id === selectedRole;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setSelectedRole(profile.id)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    active
                      ? 'border-blue-300 bg-blue-50 text-blue-900'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800'
                  }`}
                >
                  <div className="font-bold">{profile.title}</div>
                  <div className="text-xs text-neutral-500 mt-1">{profile.id}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 xl:col-span-2 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-neutral-900">{selectedProfile.title}</h2>
              <p className="text-sm text-neutral-600 mt-1">{selectedProfile.description}</p>
            </div>
            <button
              type="button"
              onClick={handleSaveTemplate}
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
                onChange={(event) => updateSelectedProfile({ title: event.target.value })}
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
                onChange={(event) => updateSelectedProfile({ description: event.target.value })}
                className="w-full min-h-[96px] rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Describe responsibilities and governance scope"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateSelectedProfile({ isActive: !selectedProfile.isActive })}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  selectedProfile.isActive
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <LuCircleCheck className="w-4 h-4" />
                {selectedProfile.isActive ? 'Active profile' : 'Inactive profile'}
              </button>
              <span className="text-xs text-neutral-500">
                Inactive profiles remain stored but can be excluded by admin queries.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {permissionCatalog.map((permission) => {
              const enabled = selectedProfile.permissions.includes(permission.key);
              return (
                <button
                  key={permission.key}
                  type="button"
                  onClick={() => togglePermission(permission.key)}
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
                onClick={() => setBulkMode((prev) => !prev)}
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
                  onChange={(event) => setEmployeeNameInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddEmployee();
                    }
                  }}
                  className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Add employee full name"
                />
                <button
                  type="button"
                  onClick={handleAddEmployee}
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
                  onChange={(event) => setBulkEmployeeInput(event.target.value)}
                  className="w-full min-h-[110px] rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder={"Add one employee name per line\nAlice Example\nBob Example\nCharlie Example"}
                />
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleBulkAddEmployees}
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
                      onClick={() => handleRemoveEmployee(assignment.assignment_id)}
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

          {saveMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">{saveMessage}</div>
          )}
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Current session</h2>
        <div className="text-sm text-neutral-700 space-y-1">
          <div className="inline-flex items-center gap-2"><LuUsers className="w-4 h-4 text-neutral-400" /> User: {currentUser?.email || 'n/a'}</div>
          <div className="inline-flex items-center gap-2"><LuInfo className="w-4 h-4 text-neutral-400" /> Roles: {(currentUser?.roles || []).join(', ') || 'none'}</div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default AdminStakeholdersPage;
