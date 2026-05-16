// Auth Client - API client for authentication operations

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  return Promise.resolve({
    id: 'user_default',
    email: 'user@example.com',
    name: 'Default User',
    role: 'admin',
  });
}

export async function loginWithPassword(email: string, password: string, _rememberSession?: boolean): Promise<{ token: string; user: AuthUser }> {
  return Promise.resolve({
    token: 'token_' + Date.now(),
    user: {
      id: 'user_1',
      email,
      name: 'User',
      role: 'admin',
    },
  });
}

export async function logoutSession(): Promise<void> {
  return Promise.resolve();
}

export async function checkAuthServiceHealth(): Promise<{ status: string; online: boolean; version?: string }> {
  return Promise.resolve({ status: 'ok', online: true, version: '1.0.0' });
}

export async function requestPasswordRecovery(email: string): Promise<{ success: boolean; message: string; reset_url?: string }> {
  return Promise.resolve({ success: true, message: 'Recovery email sent', reset_url: `https://localhost:3000/reset-password?token=demo_${Date.now()}` });
}

export async function verifyRecoveryToken(token: string): Promise<{ valid: boolean }> {
  return Promise.resolve({ valid: true });
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return Promise.resolve({ success: true, message: 'Password reset successful' });
}
