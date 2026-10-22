import type { Metadata } from "next";
import "../styles/globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthFrame } from "@/components/auth/AuthFrame";

export const metadata: Metadata = {
  title: { default: "CourtVision AI", template: "%s — CourtVision AI" },
  description: "AI-powered basketball intelligence. Not just what happened — why it happened.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        background: "var(--cv-bg)",
        color: "var(--cv-text)",
        margin: 0,
        padding: 0,
      }}>
        <AuthProvider>
          <AuthFrame>{children}</AuthFrame>
        </AuthProvider>
      </body>
    </html>
  );
}