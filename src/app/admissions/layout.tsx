import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
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
    <main className="relative min-h-screen overflow-hidden bg-surface-bg">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-20 h-96 w-96 rounded-full bg-brand-sky/10 blur-[80px]" />
        <div className="absolute -right-40 top-60 h-80 w-80 rounded-full bg-brand-royal/10 blur-[70px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-brand-amber/8 blur-[60px]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-surface-border/60 bg-white/85 backdrop-blur-xl">
        {/* Thin accent line at very top */}
        <div
          className="h-0.5 w-full"
          style={{
            background:
              "linear-gradient(90deg, #1A4DAD 0%, #3B82F6 50%, #F59E0B 100%)",
          }}
        />
        <div className="mx-auto flex h-[60px] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/admissions/apply" className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black tracking-tight text-white shadow-sm"
              style={{
                background:
                  "linear-gradient(140deg, #0A1628 0%, #142D5C 50%, #1A4DAD 100%)",
                boxShadow: "0 2px 8px rgb(26 77 173 / 0.4)",
              }}
            >
              R
            </span>
            <div className="leading-none">
              <p className="text-[0.875rem] font-bold tracking-tight text-text-primary">
                Resillix
              </span>
              <span className="hidden text-xs text-text-muted sm:inline">
                Admissions
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ActiveSessionBadge />
            <NewApplicationButton />
          </div>
        </div>
      </header>

      <section className="page-shell py-8 sm:py-10">{children}</section>
    </main>
  );
}
