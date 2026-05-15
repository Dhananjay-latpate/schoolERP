import Link from "next/link";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { ActiveSessionBadge } from "@/components/admission/ActiveSessionBadge";

export default function AdmissionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-surface-bg">
      <header className="sticky top-0 z-20 border-b border-surface-border bg-surface-card/85 backdrop-blur-md">
        <div className="page-shell flex h-14 items-center justify-between">
          <Link href="/admissions/apply" className="flex items-center gap-2.5">
            <span className="logo-mark h-8 w-8 text-sm">R</span>
            <span className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tracking-tight text-text-primary">
                Resillix
              </span>
              <span className="hidden text-xs text-text-muted sm:inline">
                Admissions
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ActiveSessionBadge />
            <Link
              href="/admissions/apply"
              className="btn-secondary btn-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              New application
            </Link>
          </div>
        </div>
      </header>

      <section className="page-shell py-8 sm:py-10">{children}</section>
    </main>
  );
}
