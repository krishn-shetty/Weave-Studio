import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Role } from '../types/studio';

export type Permission = 'edit' | 'publish' | 'deploy' | 'deploy_production';

interface User {
  name: string;
  email: string;
  initials: string;
  role: Role;
}

interface AuthValue {
  user: User | null;
  signingIn: boolean;
  sessionExpired: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  expireSession: () => void;
  reauthenticate: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

interface AuthProviderProps {
  assignedRole: Role;
  children: React.ReactNode;
}

export function AuthProvider({ assignedRole, children }: AuthProviderProps) {
  const [signedIn, setSignedIn] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const user = useMemo<User | null>(
    () => signedIn ? { name: 'Asha Bello', email: 'asha.bello@northwind.example', initials: 'AB', role: assignedRole } : null,
    [signedIn, assignedRole]
  );

  const signIn = useCallback(async () => {
    setSigningIn(true);
    await new Promise((r) => setTimeout(r, 900));
    setSignedIn(true);
    setSigningIn(false);
    setSessionExpired(false);
  }, []);

  const signOut = useCallback(() => {
    setSignedIn(false);
    setSessionExpired(false);
  }, []);

  const expireSession = useCallback(() => {
    setSessionExpired(true);
  }, []);

  const reauthenticate = useCallback(async () => {
    setSigningIn(true);
    await new Promise((r) => setTimeout(r, 800));
    setSessionExpired(false);
    setSigningIn(false);
  }, []);

  const can = useCallback(
    (permission: Permission) => {
      if (!user || sessionExpired) return false;
      if (permission === 'deploy_production') return user.role === 'admin';
      return user.role !== 'viewer';
    },
    [user, sessionExpired]
  );

  const value = useMemo(
    () => ({ user, signingIn, sessionExpired, signIn, signOut, expireSession, reauthenticate, can }),
    [user, signingIn, sessionExpired, signIn, signOut, expireSession, reauthenticate, can]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}