"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Activity, LoaderCircle, RefreshCw } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

const publicPaths = new Set(["/login", "/register"]);

export function AuthFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, error, refresh, signOut } = useAuth();
  const isPublic = publicPaths.has(pathname);

  useEffect(() => {
    if (!isPublic && status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isPublic, pathname, router, status]);

  if (isPublic) return <>{children}</>;

  if (status === "error") {
    return (
      <div style={centerStyle}>
        <div style={statusCardStyle}>
          <Activity size={22} color="var(--cv-orange)" />
          <h1 style={{ margin: "1rem 0 0.5rem", fontSize: "1.15rem" }}>Could not verify your session</h1>
          <p style={{ color: "var(--cv-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>{error}</p>
          <button onClick={() => void refresh()} style={retryStyle}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <div style={centerStyle} role="status" aria-label="Loading your account">
        <LoaderCircle size={24} color="var(--cv-orange)" className="auth-spinner" />
      </div>
    );
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // AuthProvider exposes the session error in the app frame.
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Header user={user} onSignOut={handleSignOut} />
        <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}

const centerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "var(--cv-bg)",
  color: "var(--cv-text)",
  padding: "1rem",
};

const statusCardStyle: React.CSSProperties = {
  width: "min(100%, 390px)",
  padding: "2rem",
  border: "1px solid var(--cv-border)",
  borderRadius: "16px",
  background: "var(--cv-surface)",
};

const retryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  border: 0,
  borderRadius: "8px",
  marginTop: "1rem",
  padding: "0.65rem 0.9rem",
  background: "var(--cv-orange)",
  color: "#111",
  fontWeight: 700,
  cursor: "pointer",
};
