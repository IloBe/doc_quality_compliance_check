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
    key: 'compliance.check.read',
    name: 'Compliance Check Read',
    label: 'Compliance Check Read',
    description: 'View compliance check results and status.',
    category: 'Compliance',
  },
  {
    id: 'perm_2',
    key: 'compliance.check.write',
    name: 'Compliance Check Write',
    label: 'Compliance Check Write',
    description: 'Execute compliance checks and create findings.',
    category: 'Compliance',
  },
  {
    id: 'perm_3',
    key: 'model.policy.read',
    name: 'Model Policy Read',
    label: 'Model Policy Read',
    description: 'View model policy configuration and effective defaults.',
    category: 'Model Policy',
  },
  {
    id: 'perm_4',
    key: 'model.policy.write',
    name: 'Model Policy Write',
    label: 'Model Policy Write',
    description: 'Update model priority and runtime parameters.',
    category: 'Model Policy',
  },
  {
    id: 'perm_5',
    key: 'audit.view',
    name: 'Audit View',
    label: 'Audit View',
    description: 'Access audit trail records and evidence history.',
    category: 'Audit',
  },
  {
    id: 'perm_6',
    key: 'risk.assessment.read',
    name: 'Risk Assessment Read',
    label: 'Risk Assessment Read',
    description: 'View risk assessments and mitigation state.',
    category: 'Risk',
  },
  {
    id: 'perm_7',
    key: 'risk.assessment.write',
    name: 'Risk Assessment Write',
    label: 'Risk Assessment Write',
    description: 'Create and update risk assessments.',
    category: 'Risk',
  },
  {
    id: 'perm_8',
    key: 'bridge.run.write',
    name: 'Bridge Run Write',
    label: 'Bridge Run Write',
    description: 'Execute bridge workflows and trigger checks.',
    category: 'Workflow',
  },
  {
    id: 'perm_9',
    key: 'architecture.read',
    name: 'Architecture Read',
    label: 'Architecture Read',
    description: 'View architecture analysis and arc42 sections.',
    category: 'Architecture',
  },
  {
    id: 'perm_10',
    key: 'stakeholder.profiles.write',
    name: 'Stakeholder Profiles Write',
    label: 'Stakeholder Profiles Write',
    description: 'Manage role templates and employee assignments.',
    category: 'Administration',
  },
];

export const INITIAL_STAKEHOLDER_PROFILES: StakeholderProfileUi[] = [
  {
    id: 'app_admin',
    title: 'App Admin',
    description: 'Maintains user-role mapping and model/runtime policy configuration.',
    permissions: ['model.policy.read', 'model.policy.write', 'stakeholder.profiles.write'],
    isActive: true,
  },
  {
    id: 'architect',
    title: 'Architect',
    description: 'Owns architecture artifacts and technical compliance alignment.',
    permissions: ['doc.edit', 'export.create', 'audit.view'],
    isActive: true,
  },
  {
    id: 'auditor',
    title: 'Auditor',
    description: 'Performs independent audit checks and evidence validation.',
    permissions: ['compliance.check.read', 'audit.view', 'architecture.read'],
    isActive: true,
  },
  {
    id: 'qm_lead',
    title: 'QM Lead',
    description: 'Owns quality governance decisions and final approval readiness.',
    permissions: ['compliance.check.read', 'compliance.check.write', 'audit.view', 'stakeholder.profiles.write'],
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
    id: 'service',
    title: 'Service Client',
    description: 'Machine profile for backend skills and observability data ingestion.',
    permissions: ['doc.edit', 'bridge.run', 'export.create', 'review.approve', 'audit.write'],
    isActive: true,
  },
];

export function getSelectedStakeholderProfile(
  profiles: StakeholderProfileUi[],
  profileId: string,
): StakeholderProfileUi | undefined {
  return profiles.find((p) => p.id === profileId);
}

export function toStakeholderProfileUi(rawData: any): StakeholderProfileUi {
  const profileId =
    typeof rawData?.profile_id === 'string' && rawData.profile_id.length > 0
      ? rawData.profile_id
      : typeof rawData?.id === 'string' && rawData.id.length > 0
        ? rawData.id
        : `profile_${Date.now()}`;

  return {
    id: profileId,
    title: rawData.title || 'Custom Profile',
    description: rawData.description || '',
    permissions: Array.isArray(rawData.permissions) ? rawData.permissions : [],
    isCustom: true,
    isActive: typeof rawData?.is_active === 'boolean' ? rawData.is_active : (rawData?.isActive ?? true),
    createdAt: rawData.created_at || rawData.createdAt,
    updatedAt: rawData.updated_at || rawData.updatedAt,
  };
}

export function normalizeBulkEmployeeNames(input: string): string[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
