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
  Landmark,
  ConciergeBell,
  Home,
  FileText,
  Bus,
  Tag,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { FeesDashboardSummary } from "@/lib/principalApi";

interface FeesSidebarProps {
  summary: FeesDashboardSummary | null;
  isLoading: boolean;
  onSignOut: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

// The fees workspace has ~17 destinations. A flat list reads as an
// undifferentiated wall; grouping them by the job-to-be-done (take money,
// clear requests, run billing, read reports, configure) makes the workspace
// scannable. Order within a group is most-used first.
const navGroups: Array<{ title: string | null; items: NavItem[] }> = [
  {
    title: null,
    items: [
      {
        href: "/principal/fees",
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "Collections",
    items: [
      { href: "/principal/fees/cashier", label: "Cashier", icon: Wallet },
      { href: "/principal/fees/students", label: "Student Accounts", icon: Users },
      { href: "/principal/fees/families", label: "Families", icon: Home },
    ],
  },
  {
    title: "Requests & Approvals",
    items: [
      { href: "/principal/fees/approvals", label: "Approvals", icon: Inbox },
      { href: "/principal/fees/refunds", label: "Refunds", icon: Undo2 },
    ],
  },
  {
    title: "Billing",
    items: [
      {
        href: "/principal/fees/services",
        label: "Services",
        icon: ConciergeBell,
      },
      { href: "/principal/fees/transport", label: "Transport", icon: Bus },
      {
        href: "/principal/fees/late-fees",
        label: "Late Fees",
        icon: AlarmClock,
      },
      { href: "/principal/fees/tax", label: "Tax & GST", icon: FileText },
    ],
  },
  {
    title: "Insights",
    items: [
      {
        href: "/principal/fees/reports",
        label: "Reports",
        icon: FileBarChart,
      },
      {
        href: "/principal/fees/reconciliation",
        label: "Reconciliation",
        icon: FileCheck2,
      },
      {
        href: "/principal/fees/reminders",
        label: "Reminders",
        icon: BellRing,
      },
    ],
  },
  {
    title: "Setup",
    items: [
      {
        href: "/principal/fees/masters/fee-heads",
        label: "Fee Heads",
        icon: Tag,
      },
      {
        href: "/principal/fees/masters/structures",
        label: "Fee Structures",
        icon: Settings2,
      },
      {
        href: "/principal/fees/masters/templates",
        label: "Installment Templates",
        icon: CalendarClock,
      },
      {
        href: "/principal/fees/settings",
        label: "Payment Account",
        icon: Landmark,
      },
    ],
  },
];

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function FeesSidebar({
  summary,
  isLoading,
  onSignOut,
}: FeesSidebarProps) {
  const pathname = usePathname();

  const isItemActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
      <div className="border-b border-slate-100 px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-royal">
          Principal
        </p>
        <h1 className="mt-1 text-base font-bold text-slate-900">
          Fees & Accounts
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <Link
          href="/principal"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
        >
          ← Back to modules
        </Link>
        <div className="my-2 border-t border-slate-100" />

        {navGroups.map((group, groupIndex) => (
          <div key={group.title ?? `group-${groupIndex}`} className="mb-1.5">
            {group.title && (
              <p className="px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 transition ${
                      isActive
                        ? "bg-brand-royal/10 text-brand-royal"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
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
