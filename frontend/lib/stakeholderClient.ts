// Stakeholder Client - API client for stakeholder/role management

type StakeholderProfileApi = {
  profile_id: string;
  title: string;
  description: string;
  permissions: string[];
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

type StakeholderProfilesResponse = {
  items: StakeholderProfileApi[];
};

type StakeholderAssignmentApi = {
  assignment_id: string;
  profile_id: string;
  employee_name: string;
  created_by?: string | null;
  created_at?: string;
};

type StakeholderAssignmentsResponse = {
  items: StakeholderAssignmentApi[];
};

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

export interface StakeholderProfileUpdateInput {
  title: string;
  description: string;
  permissions: string[];
  is_active: boolean;
}

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN?.trim() || '';
}

function buildApiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path}` : path;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as { detail?: string };
    if (typeof payload?.detail === 'string' && payload.detail.trim().length > 0) {
      return payload.detail;
    }
  } catch {
    // Ignore JSON parse errors and fall back to status text.
  }
  return response.statusText || fallback;
}

function mapAssignment(raw: StakeholderAssignmentApi): StakeholderEmployeeAssignment {
  const createdAt = raw.created_at || new Date().toISOString();
  return {
    id: raw.assignment_id,
    assignment_id: raw.assignment_id,
    profileId: raw.profile_id,
    employeeId: raw.employee_name,
    employeeName: raw.employee_name,
    employee_name: raw.employee_name,
    createdAt,
    created_by: raw.created_by || undefined,
  };
}

export async function fetchStakeholderProfiles(includeInactive: boolean = true): Promise<StakeholderProfileApi[]> {
  const url = buildApiUrl(`/api/v1/admin/stakeholder-profiles?include_inactive=${includeInactive ? 'true' : 'false'}`);
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Failed to load stakeholder profiles.');
    throw new Error(`Failed to load stakeholder profiles: ${detail}`);
  }

  const payload = await response.json() as StakeholderProfilesResponse;
  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function fetchStakeholderAssignments(profileId: string): Promise<StakeholderEmployeeAssignment[]> {
  const normalizedProfileId = profileId.trim();
  if (!normalizedProfileId) {
    throw new Error('profileId cannot be empty');
  }

  const url = buildApiUrl(`/api/v1/admin/stakeholder-profiles/${encodeURIComponent(normalizedProfileId)}/employees`);
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Failed to load stakeholder assignments.');
    throw new Error(`Failed to load stakeholder assignments: ${detail}`);
  }

  const payload = await response.json() as StakeholderAssignmentsResponse;
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map(mapAssignment);
}

export async function saveStakeholderProfile(profileId: string, profileData: StakeholderProfileUpdateInput): Promise<StakeholderProfileApi> {
  const normalizedProfileId = profileId.trim();
  if (!normalizedProfileId) {
    throw new Error('profileId cannot be empty');
  }

  const url = buildApiUrl(`/api/v1/admin/stakeholder-profiles/${encodeURIComponent(normalizedProfileId)}`);
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Failed to save stakeholder profile.');
    throw new Error(`Failed to save stakeholder profile: ${detail}`);
  }

  return await response.json() as StakeholderProfileApi;
}

export async function addStakeholderAssignment(
  profileId: string,
  employeeNameOrId: string,
  employeeName?: string,
): Promise<StakeholderEmployeeAssignment> {
  const normalizedProfileId = profileId.trim();
  const resolvedName = (employeeName ?? employeeNameOrId).trim();

  if (!normalizedProfileId) {
    throw new Error('profileId cannot be empty');
  }
  if (!resolvedName) {
    throw new Error('employeeName cannot be empty');
  }

  const url = buildApiUrl(`/api/v1/admin/stakeholder-profiles/${encodeURIComponent(normalizedProfileId)}/employees`);
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ employee_name: resolvedName }),
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Failed to assign employee.');
    throw new Error(`Failed to assign employee: ${detail}`);
  }

  const payload = await response.json() as StakeholderAssignmentApi;
  return mapAssignment(payload);
}

export async function removeStakeholderAssignment(profileId: string, assignmentId: string): Promise<void> {
  const normalizedProfileId = profileId.trim();
  const normalizedAssignmentId = assignmentId.trim();
  if (!normalizedProfileId || !normalizedAssignmentId) {
    throw new Error('profileId and assignmentId are required');
  }

  const url = buildApiUrl(
    `/api/v1/admin/stakeholder-profiles/${encodeURIComponent(normalizedProfileId)}/employees/${encodeURIComponent(normalizedAssignmentId)}`,
  );

  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Failed to remove employee assignment.');
    throw new Error(`Failed to remove employee assignment: ${detail}`);
  }
}
