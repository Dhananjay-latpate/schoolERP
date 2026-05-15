"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  studentName?: string | null;
  onSignOut: () => void;
}

const NAV = [
  { href: "/parent/fees", label: "Overview", exact: true },
  { href: "/parent/fees/dues", label: "Dues" },
  { href: "/parent/fees/history", label: "Payment History" },
];

export function ParentHeader({ studentName, onSignOut }: Props) {
  const pathname = usePathname();
  return (
    <header className="border-b border-surface-border bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/parent/fees" className="flex items-center gap-2">
          <span className="rounded-md bg-brand-royal px-2 py-1 text-sm font-bold text-white">
            R
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">Parent Portal</p>
            {studentName && (
              <p className="text-xs text-text-muted">{studentName}</p>
            )}
          </div>
        </Link>
        <nav className="hidden gap-1 sm:flex">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-brand-royal/10 font-semibold text-brand-royal"
                    : "text-text-secondary hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={onSignOut}
          className="rounded-md border border-surface-border bg-white px-3 py-1.5 text-xs text-text-secondary hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-surface-border px-4 py-2 sm:hidden">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs transition ${
                active
                  ? "bg-brand-royal/10 font-semibold text-brand-royal"
                  : "text-text-secondary"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
