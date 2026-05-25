// Auth Client - API client for authentication operations

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  roles?: string[];
  org?: string | null;
}

type AuthUserResponse = {
  email: string;
  roles: string[];
  org?: string | null;
};

type LoginResponse = {
  user: AuthUserResponse;
  expires_at: string;
};

export interface BootstrapAccountSummary {
  email: string;
  roles: string[];
  org?: string | null;
}

export interface BootstrapSelfCheckResponse {
  auto_provision_enabled: boolean;
  account_count: number;
  accounts: BootstrapAccountSummary[];
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
    const payload = await response.json() as { error?: { message?: string }; detail?: string };
    if (payload?.error?.message) {
      return payload.error.message;
    }
    if (payload?.detail) {
      return payload.detail;
    }
  } catch {
    // Ignore parse errors and return fallback.
  }
  return response.statusText || fallback;
}

function toAuthUser(raw: AuthUserResponse): AuthUser {
  const roles = Array.isArray(raw.roles) ? raw.roles : [];
  const primaryRole = roles[0] || 'user';
  return {
    id: raw.email,
    email: raw.email,
    name: raw.email,
    role: primaryRole,
    roles,
    org: raw.org ?? null,
  };
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await fetch(buildApiUrl('/api/v1/auth/me'), {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Failed to resolve current session user.');
    throw new Error(detail);
  }

  const payload = await response.json() as AuthUserResponse;
  return toAuthUser(payload);
}

export async function loginWithPassword(email: string, password: string, _rememberSession?: boolean): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(buildApiUrl('/api/v1/auth/login'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      remember_me: Boolean(_rememberSession),
    }),
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Login failed.');
    throw new Error(detail);
  }

  const payload = await response.json() as LoginResponse;
  return {
    token: payload.expires_at,
    user: toAuthUser(payload.user),
  };
}

export async function logoutSession(): Promise<void> {
  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Logout failed: ${response.statusText}`);
  }
}

export async function checkAuthServiceHealth(): Promise<{ status: string; online: boolean; version?: string }> {
  try {
    const response = await fetch(buildApiUrl('/health'), { method: 'GET' });
    if (!response.ok) {
      return { status: 'degraded', online: false };
    }
    const payload = await response.json() as { status?: string; version?: string };
    return {
      status: payload.status || 'ok',
      online: true,
      version: payload.version,
    };
  } catch {
    return { status: 'offline', online: false };
  }
}

export async function requestPasswordRecovery(email: string): Promise<{ success: boolean; message: string; reset_url?: string }> {
  const response = await fetch(buildApiUrl('/api/v1/auth/recovery/request'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Recovery request failed.');
    throw new Error(detail);
  }

  return await response.json() as { success: boolean; message: string; reset_url?: string };
}

export async function verifyRecoveryToken(token: string): Promise<{ valid: boolean }> {
  const response = await fetch(buildApiUrl('/api/v1/auth/recovery/verify'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Token verification failed.');
    throw new Error(detail);
  }

  const payload = await response.json() as { valid: boolean };
  return { valid: Boolean(payload.valid) };
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(buildApiUrl('/api/v1/auth/recovery/reset'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, new_password: newPassword }),
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Password reset failed.');
    throw new Error(detail);
  }

  return await response.json() as { success: boolean; message: string };
}

export async function fetchBootstrapSelfCheck(): Promise<BootstrapSelfCheckResponse> {
  const response = await fetch(buildApiUrl('/api/v1/auth/bootstrap-self-check'), {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Bootstrap self-check failed.');
    throw new Error(detail);
  }

  return await response.json() as BootstrapSelfCheckResponse;
}
