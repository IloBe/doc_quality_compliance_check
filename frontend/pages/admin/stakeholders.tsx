import React, { useEffect, useMemo, useState } from 'react';
import { LuLoader } from 'react-icons/lu';
import StakeholderProfileEditor from '../../components/admin/stakeholders/StakeholderProfileEditor';
import StakeholderProfilesList from '../../components/admin/stakeholders/StakeholderProfilesList';
import StakeholderSessionCard from '../../components/admin/stakeholders/StakeholderSessionCard';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';
import {
  INITIAL_STAKEHOLDER_PROFILES,
  STAKEHOLDER_PERMISSION_CATALOG,
  StakeholderProfileUi,
  getSelectedStakeholderProfile,
  normalizeBulkEmployeeNames,
  toStakeholderProfileUi,
} from '../../lib/adminStakeholdersViewModel';
import { useAuth } from '../../lib/authContext';
import {
  addStakeholderAssignment,
  fetchStakeholderAssignments,
  fetchStakeholderProfiles,
  removeStakeholderAssignment,
  saveStakeholderProfile,
  StakeholderEmployeeAssignment,
} from '../../lib/stakeholderClient';

const AdminStakeholdersPage = () => {
  const { currentUser } = useAuth();
  const [profiles, setProfiles] = useState<StakeholderProfileUi[]>(INITIAL_STAKEHOLDER_PROFILES);
  const [selectedRole, setSelectedRole] = useState<string>(INITIAL_STAKEHOLDER_PROFILES[0].id);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
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
          setProfiles(INITIAL_STAKEHOLDER_PROFILES);
          return;
        }
        const mapped = items.map(toStakeholderProfileUi);
        setProfiles(mapped);
        if (!mapped.some((p) => p.id === selectedRole)) {
          setSelectedRole(mapped[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stakeholder profiles.');
        setProfiles(INITIAL_STAKEHOLDER_PROFILES);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const selectedProfile = useMemo(
    () => getSelectedStakeholderProfile(profiles, selectedRole),
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
        const savedUi = toStakeholderProfileUi(saved);
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

    const names = normalizeBulkEmployeeNames(bulkEmployeeInput);

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
      <PageHeaderWithWhy
        eyebrow="Admin / Access Governance"
        title="Stakeholder Profiles & Authorization Rights"
        subtitle="Configure role templates used for controlled access in compliance workflows."
        whyDescription="Clear role profiles reduce accidental over-permissioning and improve auditability. This view centralizes role-template governance before changes are rolled out to production RBAC policy."
      />

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
        <StakeholderProfilesList
          profiles={profiles}
          selectedRole={selectedRole}
          onSelectRole={setSelectedRole}
        />

        {selectedProfile ? (
          <StakeholderProfileEditor
            selectedProfile={selectedProfile}
            permissionCatalog={STAKEHOLDER_PERMISSION_CATALOG}
            selectedAssignments={selectedAssignments}
            employeeNameInput={employeeNameInput}
            bulkMode={bulkMode}
            bulkEmployeeInput={bulkEmployeeInput}
            isSaving={isSaving}
            isAssignmentBusy={isAssignmentBusy}
            saveMessage={saveMessage}
            onSaveTemplate={handleSaveTemplate}
            onUpdateProfile={updateSelectedProfile}
            onTogglePermission={togglePermission}
            onEmployeeNameInputChange={setEmployeeNameInput}
            onBulkModeToggle={() => setBulkMode((prev) => !prev)}
            onBulkEmployeeInputChange={setBulkEmployeeInput}
            onAddEmployee={handleAddEmployee}
            onBulkAddEmployees={handleBulkAddEmployees}
            onRemoveEmployee={handleRemoveEmployee}
          />
        ) : null}
      </div>

      <StakeholderSessionCard email={currentUser?.email || null} roles={currentUser?.roles || []} />
      </>
      )}
    </div>
  );
};

export default AdminStakeholdersPage;
