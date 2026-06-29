import { ReactNode } from "react";

export function PageWrapper({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`p-6 space-y-6 animate-slide-up ${className ?? ""}`}>
      {children}
    </div>
  );
}
