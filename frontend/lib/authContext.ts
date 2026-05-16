// Auth Context - Provides user authentication state
import React, { createContext, useContext } from 'react';

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
  const context = useContext(AuthContext);
  if (!context) {
    return {
      currentUser: {
        id: 'user_default',
        name: 'Default User',
        email: 'user@example.com',
        role: 'admin',
      },
      isLoading: false,
    };
  }
  return context;
}

export function useCan(_permission: string): boolean {
  return true;
}

export const AuthProvider: React.FC<{ children: React.ReactNode; currentUser?: User | null }> = ({ children, currentUser = null }) => {
  const fallbackUser: User = {
    id: 'user_default',
    name: 'Default User',
    email: 'user@example.com',
    role: 'admin',
    roles: ['admin'],
  };

  const value: AuthContextType = {
    currentUser: currentUser ?? fallbackUser,
    isLoading: false,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};
