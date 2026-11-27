"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { signOut as authSignOut } from "@/services/authService";

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Verdadeiro enquanto o logout está em andamento: listeners devem ser encerrados. */
  signingOut: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
  /** Força re-renderização após atualizar o perfil do Firebase Auth. */
  refreshUser: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [signingOut, setSigningOut] = useState(false);
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(firebaseAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
  }, [configured]);

  const signOut = useCallback(async () => {
    // Encerra os listeners do Firestore antes do signOut para evitar erros de permissão transitórios.
    setSigningOut(true);
    await new Promise((r) => setTimeout(r, 0));
    try {
      await authSignOut();
    } finally {
      setSigningOut(false);
    }
  }, []);

  const refreshUser = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo(
    () => ({ user, loading, signingOut, configured, signOut, refreshUser }),
    [user, loading, signingOut, configured, signOut, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
