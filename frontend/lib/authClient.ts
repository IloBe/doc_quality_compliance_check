export type AuthUser = {
  id?: string;
  email?: string;
  name?: string;
  full_name?: string;
  role?: string;
  roles?: string[];
  [key: string]: unknown;
};

type PasswordRecoveryResponse = {
  message: string;
  reset_url?: string;
};

type RecoveryVerificationResponse = {
  valid: boolean;
  [key: string]: unknown;
};

type PasswordResetResponse = {
  message: string;
  [key: string]: unknown;
};

type HealthResponse = {
  online: boolean;
  version?: string | null;
};

const AUTH_BOOTSTRAP_MAX_ATTEMPTS = 4;
const HEALTH_TIMEOUT_MS = 3000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'detail' in payload &&
      typeof (payload as { detail?: unknown }).detail === 'string'
        ? (payload as { detail: string }).detail
        : fallbackMessage;

    throw new Error(message);
  }

  return (payload ?? {}) as T;
}

function getHealthOrigin(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_HEALTH_ORIGIN || process.env.NEXT_PUBLIC_API_ORIGIN;
  return configuredOrigin || 'http://127.0.0.1:8000';
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return parseJsonResponse<AuthUser>(
    await fetch('/api/v1/auth/me', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }),
    'Unable to load current user',
  );
}

export async function logoutSession(): Promise<void> {
  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

export async function loginWithPassword(
  email: string,
  password: string,
  rememberMe = true,
): Promise<AuthUser> {
  await parseJsonResponse<Record<string, unknown>>(
    await fetch('/api/v1/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        remember_me: rememberMe,
      }),
    }),
    'Login failed',
  );

  for (let attempt = 1; attempt <= AUTH_BOOTSTRAP_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetchCurrentUser();
    } catch (error) {
      if (attempt === AUTH_BOOTSTRAP_MAX_ATTEMPTS) {
        throw error;
      }
      await sleep(attempt * 100);
    }
  }

  throw new Error('Login bootstrap failed');
}

export async function requestPasswordRecovery(email: string): Promise<PasswordRecoveryResponse> {
  return parseJsonResponse<PasswordRecoveryResponse>(
    await fetch('/api/v1/auth/recovery/request', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email }),
    }),
    'Recovery request failed',
  );
}

export async function verifyRecoveryToken(token: string): Promise<RecoveryVerificationResponse> {
  return parseJsonResponse<RecoveryVerificationResponse>(
    await fetch('/api/v1/auth/recovery/verify', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ token }),
    }),
    'Recovery token verification failed',
  );
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<PasswordResetResponse> {
  return parseJsonResponse<PasswordResetResponse>(
    await fetch('/api/v1/auth/recovery/reset', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        token,
        new_password: newPassword,
      }),
    }),
    'Password reset failed',
  );
}

export async function checkAuthServiceHealth(): Promise<HealthResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${getHealthOrigin()}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return { online: false, version: null };
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const version = typeof payload.version === 'string' ? payload.version : null;

    return {
      online: true,
      version,
    };
  } catch {
    return {
      online: false,
      version: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
