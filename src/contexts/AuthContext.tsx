import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import type { Role } from '../types/studio';
import { setApiUser } from '../api/client';

export type Permission = 'edit' | 'publish' | 'deploy' | 'deploy_production';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  initials: string;
  role: Role;
}

interface AuthValue {
  user: User | null;
  signingIn: boolean;
  sessionExpired: boolean;
  signIn: (identifier?: string, password?: string, role?: Role) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => void;
  expireSession: () => void;
  reauthenticate: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

// Temporary sign-in: there is no auth API yet, so everyone gets this role. A real login replaces this provider later.
const TEMPORARY_ROLE: Role = 'admin';

const SESSION_STORAGE_KEY = 'weave_auth_user';

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setApiUser(parsed.email || parsed.name || '');
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [signingIn, setSigningIn] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (user) {
      setApiUser(user.email || user.name || '');
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      } catch {
        // ignore
      }
    } else {
      setApiUser('');
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [user]);

  const signIn = useCallback(
    async (identifier = 'shetty@weave.local', password = '', role = TEMPORARY_ROLE): Promise<{ ok: boolean; error?: string }> => {
      setSigningIn(true);
      await new Promise((r) => setTimeout(r, 400));

      const cleanId = identifier.trim();
      if (!cleanId) {
        setSigningIn(false);
        return { ok: false, error: 'Enter your email or phone number.' };
      }

      const namePart = cleanId.split('@')[0] || cleanId;
      const initials = namePart.slice(0, 2).toUpperCase() || 'US';

      const newUser: User = {
        id: `usr_${Date.now().toString(36)}`,
        name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
        email: cleanId.includes('@') ? cleanId : `${cleanId}@weave.local`,
        phone: cleanId.includes('@') ? undefined : cleanId,
        initials,
        role,
      };

      setUser(newUser);
      setSigningIn(false);
      setSessionExpired(false);
      return { ok: true };
    },
    []
  );

  const signOut = useCallback(() => {
    setUser(null);
    setSessionExpired(false);
  }, []);

  const expireSession = useCallback(() => {
    setSessionExpired(true);
  }, []);

  const reauthenticate = useCallback(async () => {
    setSigningIn(true);
    await new Promise((r) => setTimeout(r, 500));
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