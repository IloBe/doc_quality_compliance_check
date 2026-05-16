// Stakeholder Client - API client for stakeholder/role management

export interface StakeholderEmployeeAssignment {
  id: string;
  assignment_id: string;
  profileId: string;
  employeeId: string;
  employeeName: string;
  employee_name: string;
  createdAt: string;
  created_by?: string;
}

export async function fetchStakeholderProfiles(includeAssignments: boolean = false): Promise<any[]> {
  // Stub implementation - returns empty array
  // In production, this would fetch from an API endpoint
  return Promise.resolve([]);
}

export async function fetchStakeholderAssignments(profileId: string): Promise<StakeholderEmployeeAssignment[]> {
  // Stub implementation
  return Promise.resolve([]);
}

export async function saveStakeholderProfile(profileId: string, profileData: any): Promise<any> {
  // Stub implementation
  return Promise.resolve({ success: true, message: 'Profile saved' });
}

export async function addStakeholderAssignment(
  profileId: string,
  employeeNameOrId: string,
  employeeName?: string,
): Promise<StakeholderEmployeeAssignment> {
  const id = `assignment_${Date.now()}`;
  const resolvedName = employeeName ?? employeeNameOrId;
  return Promise.resolve({
    id,
    assignment_id: id,
    profileId,
    employeeId: employeeNameOrId,
    employeeName: resolvedName,
    employee_name: resolvedName,
    createdAt: new Date().toISOString(),
    created_by: 'admin',
  });
}

export async function removeStakeholderAssignment(_profileId: string, _assignmentId: string): Promise<void> {
  return Promise.resolve();
}
