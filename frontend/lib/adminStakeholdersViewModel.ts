// Admin Stakeholders ViewModel - Models and utilities for stakeholder/role management

export interface Permission {
  id: string;
  key: string;
  name: string;
  label?: string;
  description: string;
  category: string;
}

export interface StakeholderProfileUi {
  id: string;
  title: string;
  description: string;
  permissions: (Permission | string)[];
  isCustom?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const STAKEHOLDER_PERMISSION_CATALOG: Permission[] = [
  {
    id: 'perm_1',
    key: 'view_dashboard',
    name: 'View Dashboard',
    label: 'View Dashboard',
    description: 'Access to the main dashboard',
    category: 'Viewing',
  },
  {
    id: 'perm_2',
    key: 'manage_roles',
    name: 'Manage Roles',
    label: 'Manage Roles',
    description: 'Create and modify stakeholder roles',
    category: 'Administration',
  },
  {
    id: 'perm_3',
    key: 'approve_changes',
    name: 'Approve Changes',
    label: 'Approve Changes',
    description: 'Approve access control changes',
    category: 'Governance',
  },
  {
    id: 'perm_4',
    key: 'view_audit_logs',
    name: 'View Audit Logs',
    label: 'View Audit Logs',
    description: 'Access to audit trail and logs',
    category: 'Viewing',
  },
  {
    id: 'perm_5',
    key: 'export_reports',
    name: 'Export Reports',
    label: 'Export Reports',
    description: 'Export compliance and audit reports',
    category: 'Reporting',
  },
];

export const INITIAL_STAKEHOLDER_PROFILES: StakeholderProfileUi[] = [
  {
    id: 'profile_viewer',
    title: 'Viewer',
    description: 'Read-only access to dashboards and reports',
    permissions: ['view_dashboard', 'view_audit_logs'],
  },
  {
    id: 'profile_admin',
    title: 'Admin',
    description: 'Full administrative access',
    permissions: ['view_dashboard', 'manage_roles', 'approve_changes', 'view_audit_logs', 'export_reports'],
  },
  {
    id: 'profile_auditor',
    title: 'Auditor',
    description: 'Access to audit logs and reports only',
    permissions: ['view_audit_logs', 'export_reports'],
  },
];

export function getSelectedStakeholderProfile(
  profiles: StakeholderProfileUi[],
  profileId: string,
): StakeholderProfileUi | undefined {
  return profiles.find((p) => p.id === profileId);
}

export function toStakeholderProfileUi(rawData: any): StakeholderProfileUi {
  return {
    id: rawData.id || `profile_${Date.now()}`,
    title: rawData.title || 'Custom Profile',
    description: rawData.description || '',
    permissions: Array.isArray(rawData.permissions) ? rawData.permissions : [],
    isCustom: true,
    createdAt: rawData.createdAt,
    updatedAt: rawData.updatedAt,
  };
}

export function normalizeBulkEmployeeNames(input: string): string[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
