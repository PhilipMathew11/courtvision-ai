"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Activity, ArrowRight, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "./AuthProvider";

type AuthMode = "login" | "register";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function authenticatedDestination(search: string) {
  const requestedNext = new URLSearchParams(search).get("next");
  return requestedNext &&
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.startsWith("/\\")
    ? requestedNext
    : "/";
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { user, status, signIn, register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(authenticatedDestination(window.location.search));
    }
  }, [router, status, user]);

  useEffect(() => {
    const providerError = new URLSearchParams(window.location.search).get("error");
    const messages: Record<string, string> = {
      google_unconfigured: "Google sign-in is not configured yet. Ask the administrator to add Google OAuth credentials.",
      google_account_disabled: "This CourtVision account is disabled. Contact the administrator.",
      google_account_conflict: "This Google account could not be linked. Try signing in with your existing account.",
      google_failed: "Google sign-in could not be completed. Please try again.",
    };
    if (providerError && messages[providerError]) setError(messages[providerError]);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isRegister) await register(displayName, email, password);
      else await signIn(email, password);
      router.replace(authenticatedDestination(window.location.search));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't complete your request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={glowStyle} aria-hidden="true" />
      <section style={panelStyle}>
        <Link href="/" style={brandStyle} aria-label="CourtVision home">
          <span style={brandIconStyle}><Activity size={19} /></span>
          <span>
            <strong style={{ display: "block", fontSize: "1rem", letterSpacing: "-0.03em" }}>CourtVision</strong>
            <span style={brandSubStyle}>BASKETBALL INTELLIGENCE</span>
          </span>
        </Link>

        <div style={{ marginTop: "2.5rem" }}>
          <p style={eyebrowStyle}>{isRegister ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}</p>
          <h1 style={titleStyle}>{isRegister ? "Build your edge." : "Your court, in focus."}</h1>
          <p style={descriptionStyle}>
            {isRegister
              ? "Join CourtVision to explore the game with sharper data and AI tools."
              : "Sign in to pick up where your basketball analysis left off."}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: "2rem" }}>
          {isRegister && (
            <label style={labelStyle}>
              Name
              <input
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                required
                maxLength={80}
                style={inputStyle}
              />
            </label>
          )}
          <label style={{ ...labelStyle, marginTop: isRegister ? "1rem" : 0 }}>
            Email address
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              maxLength={254}
              style={inputStyle}
            />
          </label>
          <label style={{ ...labelStyle, marginTop: "1rem" }}>
            Password
            <span style={{ position: "relative", display: "block" }}>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isRegister ? "At least 10 characters" : "Enter your password"}
                required
                minLength={10}
                maxLength={128}
                style={{ ...inputStyle, paddingRight: "2.8rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={passwordToggleStyle}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          {error && <p role="alert" style={errorStyle}>{error}</p>}

          <button type="submit" disabled={submitting} style={submitStyle}>
            {submitting ? <LoaderCircle size={16} className="auth-spinner" /> : null}
            {submitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={dividerStyle}><span>OR CONTINUE WITH</span></div>
        <a
          href={`${API}/auth/google`}
          onClick={(event) => {
            event.preventDefault();
            const next = authenticatedDestination(window.location.search);
            window.location.assign(`${API}/auth/google?next=${encodeURIComponent(next)}`);
          }}
          style={googleButtonStyle}
        >
          <GoogleMark />
          Continue with Google
        </a>

        <div style={securityNoteStyle}>
          <ShieldCheck size={15} />
          <span>Your password is encrypted and never stored in plain text.</span>
        </div>

        {!isRegister && (
          <p style={recoveryNoteStyle}>
            Password recovery needs email delivery to be configured. Contact your administrator for help.
          </p>
        )}

        <p style={switchStyle}>
          {isRegister ? "Already have an account?" : "New to CourtVision?"}{" "}
          <Link href={isRegister ? "/login" : "/register"} style={linkStyle}>
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
      <p style={footerStyle}>BUILT FOR THE LOVE OF THE GAME</p>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  padding: "2rem 1rem 4rem",
  background: "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.09), transparent 46%), var(--cv-bg)",
  color: "var(--cv-text)",
};
const glowStyle: React.CSSProperties = {
  position: "absolute",
  width: "400px",
  height: "400px",
  borderRadius: "50%",
  filter: "blur(110px)",
  background: "rgba(249,115,22,0.07)",
  pointerEvents: "none",
};
const panelStyle: React.CSSProperties = {
  position: "relative",
  width: "min(100%, 440px)",
  padding: "clamp(1.5rem, 6vw, 2.5rem)",
  border: "1px solid var(--cv-border)",
  borderRadius: "18px",
  background: "rgba(17,20,28,0.94)",
  boxShadow: "0 24px 90px rgba(0,0,0,0.28)",
};
const brandStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.75rem",
  color: "var(--cv-text)",
  textDecoration: "none",
};
const brandIconStyle: React.CSSProperties = {
  width: "38px",
  height: "38px",
  display: "grid",
  placeItems: "center",
  borderRadius: "11px",
  background: "rgba(249,115,22,0.14)",
  color: "var(--cv-orange)",
};
const brandSubStyle: React.CSSProperties = {
  color: "var(--cv-muted)",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.56rem",
  letterSpacing: "0.08em",
};
const eyebrowStyle: React.CSSProperties = {
  color: "var(--cv-orange)",
  fontSize: "0.65rem",
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
  letterSpacing: "0.12em",
};
const titleStyle: React.CSSProperties = {
  margin: "0.55rem 0",
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "clamp(1.7rem, 6vw, 2rem)",
  letterSpacing: "-0.055em",
};
const descriptionStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--cv-muted)",
  fontSize: "0.9rem",
  lineHeight: 1.65,
};
const labelStyle: React.CSSProperties = {
  display: "block",
  color: "var(--cv-text)",
  fontSize: "0.78rem",
  fontWeight: 600,
};
const inputStyle: React.CSSProperties = {
  boxSizing: "border-box",
  display: "block",
  width: "100%",
  marginTop: "0.5rem",
  padding: "0.78rem 0.85rem",
  border: "1px solid var(--cv-border)",
  borderRadius: "8px",
  outline: "none",
  background: "var(--cv-card)",
  color: "var(--cv-text)",
  fontFamily: "inherit",
  fontSize: "0.875rem",
};
const passwordToggleStyle: React.CSSProperties = {
  position: "absolute",
  right: "0.65rem",
  top: "calc(50% + 0.25rem)",
  transform: "translateY(-50%)",
  display: "grid",
  placeItems: "center",
  width: "28px",
  height: "28px",
  border: 0,
  background: "transparent",
  color: "var(--cv-muted)",
  cursor: "pointer",
};
const errorStyle: React.CSSProperties = {
  margin: "1rem 0 0",
  padding: "0.75rem",
  border: "1px solid rgba(248,113,113,0.35)",
  borderRadius: "8px",
  background: "rgba(248,113,113,0.08)",
  color: "#fca5a5",
  fontSize: "0.8rem",
  lineHeight: 1.5,
};
const submitStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "0.55rem",
  width: "100%",
  marginTop: "1.4rem",
  padding: "0.82rem 1rem",
  border: 0,
  borderRadius: "8px",
  background: "var(--cv-orange)",
  color: "#17120e",
  fontSize: "0.875rem",
  fontWeight: 700,
  cursor: "pointer",
};
const securityNoteStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.45rem",
  marginTop: "1.2rem",
  color: "var(--cv-muted)",
  fontSize: "0.69rem",
};
const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  margin: "1.4rem 0 1rem",
  color: "var(--cv-subtle)",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.58rem",
  letterSpacing: "0.08em",
};
const googleButtonStyle: React.CSSProperties = {
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.65rem",
  width: "100%",
  padding: "0.75rem 1rem",
  border: "1px solid var(--cv-border)",
  borderRadius: "8px",
  background: "var(--cv-card)",
  color: "var(--cv-text)",
  fontSize: "0.84rem",
  fontWeight: 600,
  textDecoration: "none",
};
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.2-1.8 13.6-4.9L31 34c-1.8 1.2-4.1 2-7 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.5 20.5 0 0 0 24 44Z" />
      <path fill="#4A90E2" d="M12.6 27.6a12.3 12.3 0 0 1 0-7.2v-5.3H5.8a20.5 20.5 0 0 0 0 17.8l6.8-5.3Z" />
      <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9A19.7 19.7 0 0 0 24 4 20.5 20.5 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z" />
    </svg>
  );
}
const recoveryNoteStyle: React.CSSProperties = {
  margin: "1.1rem 0 0",
  color: "var(--cv-muted)",
  fontSize: "0.72rem",
  lineHeight: 1.5,
  textAlign: "center",
};
const switchStyle: React.CSSProperties = {
  margin: "1.2rem 0 0",
  paddingTop: "1.1rem",
  borderTop: "1px solid var(--cv-border)",
  color: "var(--cv-muted)",
  fontSize: "0.8rem",
  textAlign: "center",
};
const linkStyle: React.CSSProperties = {
  color: "var(--cv-orange)",
  fontWeight: 700,
  textDecoration: "none",
};
const footerStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "1.2rem",
  color: "var(--cv-subtle)",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.6rem",
  letterSpacing: "0.12em",
};
