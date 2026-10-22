"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthUser = {
  id: number;
  email: string;
  display_name: string;
};

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const AuthContext = createContext<AuthContextValue | null>(null);

async function responseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(" ");
    }
  } catch {
    return `Request failed (${response.status}).`;
  }
  return `Request failed (${response.status}).`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (response.status === 401) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }
      if (!response.ok) throw new Error(await responseError(response));
      setUser((await response.json()) as AuthUser);
      setStatus("authenticated");
    } catch (cause) {
      setUser(null);
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Could not connect to CourtVision.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const authenticate = useCallback(async (path: string, payload: Record<string, string>) => {
    setError(null);
    let response: Response;
    try {
      response = await fetch(`${API}/auth/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error("Could not connect to CourtVision. Check that the server is running.");
    }
    if (!response.ok) throw new Error(await responseError(response));
    setUser((await response.json()) as AuthUser);
    setStatus("authenticated");
  }, []);

  const signIn = useCallback(
    (email: string, password: string) => authenticate("login", { email, password }),
    [authenticate],
  );
  const register = useCallback(
    (displayName: string, email: string, password: string) =>
      authenticate("register", { display_name: displayName, email, password }),
    [authenticate],
  );

  const signOut = useCallback(async () => {
    try {
      const response = await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error(await responseError(response));
      setUser(null);
      setStatus("unauthenticated");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign out.");
      setStatus("error");
      throw cause;
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, error, signIn, register, signOut, refresh }),
    [user, status, error, signIn, register, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
