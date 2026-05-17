"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  TrendingUp,
  AlertTriangle,
  CalendarCheck2,
  Users,
  Wallet,
  Loader2,
  ArrowRight,
  Receipt,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard, type StatTone } from "@/components/ui/StatCard";
import { getIntegrityFindings, getPayoutAccount } from "@/lib/principalApi";
import { FeesSidebar } from "./_components/Sidebar";
import { useFeesSession } from "./_components/useFeesSession";

const formatINR = (value: number, opts: { compact?: boolean } = {}) =>
  `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: opts.compact ? 0 : 2,
    minimumFractionDigits: opts.compact ? 0 : 0,
  })}`;

export default function FeesDashboardPage() {
  const { token, isChecking, summary, isLoadingSummary, summaryError, refreshSummary, signOut } =
    useFeesSession();
  // null = unknown/loading; true/false = whether a payout gateway is active.
  const [payoutActive, setPayoutActive] = useState<boolean | null>(null);
  // Count of open data-integrity findings (null while loading).
  const [integrityOpen, setIntegrityOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getPayoutAccount(token)
      .then((acc) => {
        if (cancelled) return;
        setPayoutActive(
          !!acc && acc.gatewayLinks.some((l) => l.status === "active"),
        );
      })
      .catch(() => {
        if (!cancelled) setPayoutActive(null);
      });
    getIntegrityFindings(token, "open")
      .then((r) => {
        if (!cancelled) setIntegrityOpen(r.findings.length);
      })
      .catch(() => {
        if (!cancelled) setIntegrityOpen(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const kpis = useMemo(() => {
    if (!summary)
      return [] as Array<{
        label: string;
        value: string;
        tone: StatTone;
        icon: typeof TrendingUp;
        meta: string;
      }>;
    return [
      {
        label: "Today's Collection",
        value: formatINR(summary.todayCollection, { compact: true }),
        tone: "emerald" as StatTone,
        icon: TrendingUp,
        meta: `${summary.todayTransactionCount} transactions`,
      },
      {
        label: "Outstanding Dues",
        value: formatINR(summary.totalDue, { compact: true }),
        tone: "amber" as StatTone,
        icon: AlertTriangle,
        meta: `${summary.overdueCharges} overdue`,
      },
      {
        label: "Collected (MTD)",
        value: formatINR(summary.monthCollection, { compact: true }),
        tone: "brand" as StatTone,
        icon: CalendarCheck2,
        meta: `${summary.monthTransactionCount} transactions`,
      },
      {
        label: "Active Accounts",
        value: String(summary.totalAccounts),
        tone: "neutral" as StatTone,
        icon: Users,
        meta: `${summary.pendingApprovals} approvals pending`,
      },
    ];
  }, [summary]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-bg">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading fees workspace...
        </div>
      </main>
    );
  }

  if (!token) return null;

  return (
    <div className="flex">
      <FeesSidebar summary={summary} isLoading={isLoadingSummary} onSignOut={signOut} />
      <main className="flex-1 lg:ml-60">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <Card className="overflow-hidden p-0">
            <div className="brand-gradient p-6 text-white sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex rounded-full bg-surface-card/20 p-2">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                    Fees & Accounts Command Center
                  </p>
                  <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Collections Overview</h1>
                  <p className="mt-2 max-w-3xl text-sm text-white/70">
                    Track payments, manage student accounts, run the cashier counter, and
                    configure fee masters from a single workspace.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-surface-card/20 text-white">Live</Badge>
                </div>
              </div>
            </div>
          </Card>

          {summaryError && (
            <Card className="flex flex-wrap items-center justify-between gap-3 border-rose-200 bg-rose-50 p-3">
              <p className="text-sm text-rose-700">{summaryError}</p>
              <Button variant="secondary" onClick={() => void refreshSummary()}>
                Retry
              </Button>
            </Card>
          )}

          {payoutActive === false && (
            <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <p className="text-sm text-amber-800">
                  No payment gateway is active — online collections are not yet routing to
                  the school's bank account. Set up the Payment Account to enable routing.
                </p>
              </div>
              <Link
                href="/principal/fees/settings"
                className="inline-flex items-center rounded-md bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800"
              >
                Set up <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Card>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isLoadingSummary || !summary
              ? Array.from({ length: 4 }).map((_, i) => (
                  <StatCard key={i} loading label="" value="" />
                ))
              : kpis.map((kpi) => (
                  <StatCard
                    key={kpi.label}
                    label={kpi.label}
                    value={kpi.value}
                    meta={kpi.meta}
                    icon={kpi.icon}
                    tone={kpi.tone}
                  />
                ))}
          </section>

          {/* Data-integrity health strip */}
          <Card
            className={`flex flex-wrap items-center justify-between gap-3 p-3 ${
              integrityOpen && integrityOpen > 0
                ? "border-amber-200 bg-amber-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {integrityOpen && integrityOpen > 0 ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
              ) : (
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
              )}
              <p
                className={`text-sm ${
                  integrityOpen && integrityOpen > 0
                    ? "text-amber-800"
                    : "text-emerald-800"
                }`}
              >
                {integrityOpen === null
                  ? "Checking ledger integrity…"
                  : integrityOpen > 0
                    ? `${integrityOpen} data-integrity finding${integrityOpen === 1 ? "" : "s"} need review — account totals have drifted from the ledger.`
                    : "All account totals reconcile with the ledger."}
              </p>
            </div>
          </Card>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card className="card-interactive p-5">
              <div className="inline-flex rounded-md bg-surface-muted p-2">
                <Users className="h-4 w-4 text-text-secondary" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-text-primary">
                Student Fee Accounts
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Browse balances, assign charges, record payments, view ledger and approvals
                for every enrolled student.
              </p>
              <Link
                href="/principal/fees/students"
                className="mt-4 inline-flex items-center text-sm font-semibold text-brand-royal hover:underline"
              >
                Open accounts <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Card>

            <Card className="card-interactive p-5">
              <div className="inline-flex rounded-md bg-surface-muted p-2">
                <Wallet className="h-4 w-4 text-text-secondary" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-text-primary">
                Cashier Counter
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Open the day with an opening float, collect payments at the counter, and
                close with a reconciled cash count.
              </p>
              <Link
                href="/principal/fees/cashier"
                className="mt-4 inline-flex items-center text-sm font-semibold text-brand-royal hover:underline"
              >
                Open counter <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Card>

            <Card className="card-interactive p-5">
              <div className="inline-flex rounded-md bg-surface-muted p-2">
                <Receipt className="h-4 w-4 text-text-secondary" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-text-primary">
                Approvals Queue
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Review concession requests, late-fee waivers, custom installment plans, and
                refunds awaiting your decision.
              </p>
              <p className="mt-4 text-sm font-semibold text-text-muted">
                {summary ? `${summary.pendingApprovals} pending` : "..."}
              </p>
            </Card>
          </section>

          <Card className="border border-surface-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Looking for masters?</p>
                <p className="text-sm text-text-secondary">
                  Fee heads, structures and installment templates live under Masters in the
                  sidebar.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  window.location.href = "/principal/fees/masters/fee-heads";
                }}
              >
                Open Masters
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
