import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import type { User } from "firebase/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<unknown>;
  registerWithEmail: (email: string, password: string) => Promise<unknown>;
  loginWithGoogle: () => Promise<unknown>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
