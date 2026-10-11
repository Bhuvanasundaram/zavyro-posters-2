import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export type UserRole = "owner" | "admin" | "staff" | "customer";
export type AuthUser = { id: string; fullName: string; email: string; role: UserRole };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
      const payload = await response.json().catch(() => null);
      const nextUser = response.ok && payload?.success ? payload.user as AuthUser : null;
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
