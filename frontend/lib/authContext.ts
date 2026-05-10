import React, { createContext, useContext, useMemo } from 'react';
import type { AuthUser } from './authClient';

type Permission =
  | 'bridge.run'
  | 'doc.edit'
  | 'review.approve';

type AuthContextValue = {
  currentUser: AuthUser | null;
  permissions: Set<Permission>;
};

type AuthProviderProps = {
  currentUser: AuthUser | null;
  children: React.ReactNode;
};

const DEFAULT_PERMISSIONS: Permission[] = ['bridge.run', 'doc.edit', 'review.approve'];

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  permissions: new Set(DEFAULT_PERMISSIONS),
});

function normalizePermissions(currentUser: AuthUser | null): Set<Permission> {
  const roleCandidates = [currentUser?.role, ...(currentUser?.roles ?? [])]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toLowerCase());

  if (roleCandidates.some((role) => role.includes('viewer') || role.includes('read'))) {
    return new Set<Permission>([]);
  }

  return new Set(DEFAULT_PERMISSIONS);
}

export function AuthProvider({ currentUser, children }: AuthProviderProps) {
  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      permissions: normalizePermissions(currentUser),
    }),
    [currentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Pick<AuthContextValue, 'currentUser'> {
  const { currentUser } = useContext(AuthContext);
  return { currentUser };
}

export function useCan(permission: Permission): boolean {
  return useContext(AuthContext).permissions.has(permission);
}
