// Auth Context - Provides user authentication state
import React, { createContext, useContext } from 'react';

import { hasPermission } from './rbac';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  roles?: string[];
}

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login?: (email: string, password: string) => Promise<void>;
  logout?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: false,
});

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

export function useCan(permission: string): boolean {
  const { currentUser } = useAuth();
  const rawRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const roles = rawRoles.map((role) => role.trim().toLowerCase()).filter(Boolean);
  const normalizedRoles = roles.map((role) => (role === 'app_admin' ? 'admin' : role));

  if (normalizedRoles.includes('admin')) {
    return true;
  }

  if (permission.startsWith('admin.')) {
    return normalizedRoles.includes('qm_lead') || normalizedRoles.includes('riskmanager');
  }

  return hasPermission({ roles: normalizedRoles }, permission);
}

export const AuthProvider: React.FC<{ children: React.ReactNode; currentUser?: User | null }> = ({ children, currentUser = null }) => {
  const value: AuthContextType = {
    currentUser,
    isLoading: false,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};
