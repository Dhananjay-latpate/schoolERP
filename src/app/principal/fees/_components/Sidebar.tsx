"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Inbox,
  AlarmClock,
  Undo2,
  FileBarChart,
  BellRing,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { FeesDashboardSummary } from "@/lib/principalApi";

interface FeesSidebarProps {
  summary: FeesDashboardSummary | null;
  isLoading: boolean;
  onSignOut: () => void;
}

const navItems = [
  { href: "/principal/fees", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/principal/fees/students", label: "Student Accounts", icon: Users },
  { href: "/principal/fees/cashier", label: "Cashier", icon: Wallet },
  { href: "/principal/fees/approvals", label: "Approvals", icon: Inbox },
  { href: "/principal/fees/late-fees", label: "Late Fees", icon: AlarmClock },
  { href: "/principal/fees/refunds", label: "Refunds", icon: Undo2 },
  { href: "/principal/fees/reports", label: "Reports", icon: FileBarChart },
  { href: "/principal/fees/reminders", label: "Reminders", icon: BellRing },
  { href: "/principal/fees/reconciliation", label: "Reconciliation", icon: FileCheck2 },
];

const masterItems = [
  { href: "/principal/fees/masters/fee-heads", label: "Fee Heads" },
  { href: "/principal/fees/masters/structures", label: "Fee Structures" },
  { href: "/principal/fees/masters/templates", label: "Installment Templates" },
];

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function FeesSidebar({ summary, isLoading, onSignOut }: FeesSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
      <div className="border-b border-slate-100 px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-royal">
          Principal
        </p>
        <h1 className="mt-1 text-base font-bold text-slate-900">Fees & Accounts</h1>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        <Link
          href="/principal"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
        >
          ← Back to modules
        </Link>
        <div className="my-2 border-t border-slate-100" />
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition ${
                isActive
                  ? "bg-brand-royal/10 text-brand-royal"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}

        <div className="mt-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Settings2 className="h-3 w-3" /> Masters
          </div>
          {masterItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-xs transition ${
                  isActive
                    ? "bg-brand-royal/10 font-semibold text-brand-royal"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-100 p-3 space-y-2">
        <div className="flex items-start justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <CheckCircle2 className="h-3 w-3" />
            <span>Collected (MTD)</span>
          </div>
          <span className="font-semibold text-emerald-700">
            {isLoading || !summary ? "..." : formatINR(summary.monthCollection)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <AlertCircle className="h-3 w-3" />
            <span>Outstanding</span>
          </div>
          <span className="font-semibold text-amber-700">
            {isLoading || !summary ? "..." : formatINR(summary.totalDue)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Receipt className="h-3 w-3" />
            <span>Today's txns</span>
          </div>
          <span className="font-semibold text-slate-700">
            {isLoading || !summary ? "..." : summary.todayTransactionCount}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-100 p-2">
        <Button
          variant="secondary"
          className="h-8 w-full justify-center text-xs"
          onClick={onSignOut}
        >
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
