import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, title, subtitle, action }: { children: ReactNode; title?: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-md min-h-screen relative pb-28">
        {(title || action) && (
          <header className="px-5 pt-8 pb-4 flex items-start justify-between gap-3">
            <div>
              {subtitle && <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">{subtitle}</p>}
              {title && <h1 className="text-2xl font-bold text-foreground mt-1">{title}</h1>}
            </div>
            {action}
          </header>
        )}
        <main className="px-5">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
