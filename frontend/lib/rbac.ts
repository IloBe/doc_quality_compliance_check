type RoleName = 'qm_lead' | 'architect' | 'riskmanager' | 'auditor' | 'developer' | 'admin';
type RbacUser = { role?: string; roles?: string[] };

const ROLE_PERMISSIONS: Record<RoleName, ReadonlySet<string>> = {
  qm_lead: new Set(['bridge.run', 'review.approve', 'doc.edit']),
  architect: new Set(['bridge.run', 'review.approve', 'doc.edit']),
  riskmanager: new Set(['bridge.run', 'review.approve', 'doc.edit']),
  auditor: new Set(['bridge.run', 'review.approve']),
  developer: new Set(['doc.edit']),
  admin: new Set(['bridge.run', 'review.approve', 'doc.edit']),
};

function normalizeRoles(roleOrUser: string | RbacUser | undefined): string[] {
  if (!roleOrUser) {
    return [];
  }

  if (typeof roleOrUser === 'string') {
    return [roleOrUser];
  }

  const roles = Array.isArray(roleOrUser.roles) ? roleOrUser.roles : [];
  if (roles.length > 0) {
    return roles;
  }

  return roleOrUser.role ? [roleOrUser.role] : [];
}

export function hasPermission(roleOrUser: string | RbacUser | undefined, permission: string): boolean {
  return normalizeRoles(roleOrUser).some((role) => {
    const grants = ROLE_PERMISSIONS[role as RoleName];
    return grants ? grants.has(permission) : false;
  });
}
