import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: { default: "CourtVision AI", template: "%s — CourtVision AI" },
  description: "AI-powered basketball intelligence. Not just what happened — why it happened.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--cv-bg)",
        color: "var(--cv-text)",
        margin: 0,
        padding: 0,
      }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Header />
          <main style={{ flex: 1, overflowY: "auto" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}