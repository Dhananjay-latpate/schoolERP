import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ActiveSessionBadge } from "@/components/admission/ActiveSessionBadge";
import { NewApplicationButton } from "@/components/admission/NewApplicationButton";

export const metadata: Metadata = {
  title: {
    template: "%s — Resillix Admissions",
    default: "Resillix Admissions",
  },
  description:
    "Apply for admission at Resillix Public School — a fast, parent-friendly admission experience.",
};

export default function AdmissionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-surface-bg">
      <header className="sticky top-0 z-20 border-b border-surface-border bg-surface-card/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/admissions/apply"
            className="flex items-center gap-3 no-underline"
          >
            <span className="logo-mark h-9 w-9 text-sm">R</span>
            <span className="flex items-baseline gap-1.5 leading-none">
              <span className="text-[0.9375rem] font-semibold tracking-tight text-text-primary">
                Resillix
              </span>
              <span className="hidden text-[0.9375rem] font-normal text-text-muted sm:inline">
                Admissions
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            <ActiveSessionBadge />
            <NewApplicationButton />
          </div>
        </div>
      </header>

      <section className="page-shell py-10 sm:py-14">{children}</section>
    </main>
  );
}
