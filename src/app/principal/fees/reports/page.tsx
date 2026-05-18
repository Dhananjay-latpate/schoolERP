"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, FileBarChart, Calendar, Layers, AlertTriangle, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  PrincipalApiError,
  getFeeReport,
  type AgingBuckets,
  type CashbookRow,
  type ClassWiseRow,
  type DefaulterRow,
  type HeadWiseRow,
} from "@/lib/principalApi";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";

type ReportTab = "collection" | "aging" | "defaulters" | "class-wise" | "head-wise";

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const TABS: Array<{ id: ReportTab; label: string; icon: typeof TrendingUp }> = [
  { id: "collection", label: "Daily Collection", icon: TrendingUp },
  { id: "aging", label: "Aging Analysis", icon: Calendar },
  { id: "defaulters", label: "Defaulters", icon: AlertTriangle },
  { id: "class-wise", label: "Class-wise", icon: Layers },
  { id: "head-wise", label: "Head-wise", icon: FileBarChart },
];

// Format using local date parts — toISOString() shifts to UTC and would pick
// the wrong calendar day for IST users near midnight.
const localISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayISO = () => localISO(new Date());
const monthStartISO = () => {
  const d = new Date();
  return localISO(new Date(d.getFullYear(), d.getMonth(), 1));
};

export default function ReportsPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [tab, setTab] = useState<ReportTab>("collection");
  const [academicYear, setAcademicYear] = useState("");
  const [fromDate, setFromDate] = useState(monthStartISO());
  const [toDate, setToDate] = useState(todayISO());
  const [minOverdueDays, setMinOverdueDays] = useState("0");

  const [collectionData, setCollectionData] = useState<CashbookRow[] | null>(null);
  const [agingData, setAgingData] = useState<AgingBuckets | null>(null);
  const [defaultersData, setDefaultersData] = useState<DefaulterRow[] | null>(null);
  const [classWiseData, setClassWiseData] = useState<ClassWiseRow[] | null>(null);
  const [headWiseData, setHeadWiseData] = useState<HeadWiseRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    // Clear the active tab's data first so a validation error or a failed
    // request never leaves stale rows from a previous load on screen.
    try {
      if (tab === "collection") {
        setCollectionData(null);
        if (!fromDate || !toDate) {
          setError("Pick a date range.");
          return;
        }
        const data = await getFeeReport<CashbookRow[]>(token, "daily-cashbook", {
          fromDate,
          toDate,
        });
        setCollectionData(data);
      } else if (tab === "aging") {
        setAgingData(null);
        if (!academicYear) {
          setError("Set the academic year above.");
          return;
        }
        const data = await getFeeReport<AgingBuckets>(token, "aging", { academicYear });
        setAgingData(data);
      } else if (tab === "defaulters") {
        setDefaultersData(null);
        if (!academicYear) {
          setError("Set the academic year above.");
          return;
        }
        const data = await getFeeReport<DefaulterRow[]>(token, "defaulters", {
          academicYear,
          minOverdueDays: parseInt(minOverdueDays, 10) || 0,
        });
        setDefaultersData(data);
      } else if (tab === "class-wise") {
        setClassWiseData(null);
        if (!academicYear) {
          setError("Set the academic year above.");
          return;
        }
        const data = await getFeeReport<ClassWiseRow[]>(token, "class-wise-collection", {
          academicYear,
        });
        setClassWiseData(data);
      } else if (tab === "head-wise") {
        setHeadWiseData(null);
        if (!academicYear) {
          setError("Set the academic year above.");
          return;
        }
        const data = await getFeeReport<HeadWiseRow[]>(token, "head-wise-collection", {
          academicYear,
        });
        setHeadWiseData(data);
      }
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [token, tab, academicYear, fromDate, toDate, minOverdueDays]);

  useEffect(() => {
    if (token) void loadReport();
  }, [token, tab, loadReport]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-bg">
        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
      </main>
    );
  }
  if (!token) return null;

  return (
    <div className="flex">
      <FeesSidebar summary={summary} isLoading={isLoadingSummary} onSignOut={signOut} />
      <main className="flex-1 lg:ml-60">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
              Fees & Accounts
            </p>
            <h1 className="mt-1 text-xl font-semibold text-text-primary">Reports</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Analytics & reconciliation snapshots, computed live against the fee ledger.
            </p>
          </div>

          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[160px]">
                <Label htmlFor="rep-year">Academic year</Label>
                <Input
                  id="rep-year"
                  placeholder="e.g., 2026-27"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="mt-1"
                />
              </div>
              {tab === "collection" && (
                <>
                  <div>
                    <Label htmlFor="rep-from">From</Label>
                    <Input
                      id="rep-from"
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rep-to">To</Label>
                    <Input
                      id="rep-to"
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              {tab === "defaulters" && (
                <div>
                  <Label htmlFor="rep-min">Min overdue days</Label>
                  <Input
                    id="rep-min"
                    type="number"
                    min="0"
                    value={minOverdueDays}
                    onChange={(e) => setMinOverdueDays(e.target.value)}
                    className="mt-1 w-32"
                  />
                </div>
              )}
              <Button onClick={() => void loadReport()} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Refresh
              </Button>
            </div>
          </Card>

          <div className="flex flex-wrap gap-2 border-b border-surface-border">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-brand-royal text-brand-royal"
                      : "border-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {error && (
            <Card className="border-brand-rose/25 bg-brand-rose-light p-3 text-sm text-status-error">{error}</Card>
          )}

          {isLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
            </Card>
          ) : (
            <>
              {tab === "collection" && <CollectionView rows={collectionData} />}
              {tab === "aging" && <AgingView buckets={agingData} />}
              {tab === "defaulters" && <DefaultersView rows={defaultersData} />}
              {tab === "class-wise" && <ClassWiseView rows={classWiseData} />}
              {tab === "head-wise" && <HeadWiseView rows={headWiseData} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function CollectionView({ rows }: { rows: CashbookRow[] | null }) {
  const grouped = useMemo(() => {
    if (!rows) return null;
    const totalsByMethod = new Map<string, { total: number; count: number }>();
    let grandTotal = 0;
    let grandCount = 0;
    for (const r of rows) {
      const bucket = totalsByMethod.get(r.method) ?? { total: 0, count: 0 };
      bucket.total += r.amount;
      bucket.count += r.count;
      totalsByMethod.set(r.method, bucket);
      grandTotal += r.amount;
      grandCount += r.count;
    }
    return { totalsByMethod: Array.from(totalsByMethod.entries()), grandTotal, grandCount };
  }, [rows]);

  if (!rows) return <Card className="p-8 text-center text-sm text-text-muted">No data.</Card>;
  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-text-muted">
        No transactions in the selected window.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Total collected</p>
            <p className="mt-1 text-2xl font-bold text-status-success">
              {formatINR(grouped?.grandTotal ?? 0)}
            </p>
          </div>
          <p className="text-sm text-text-muted">{grouped?.grandCount ?? 0} transactions</p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {grouped?.totalsByMethod.map(([method, bucket]) => (
            <div
              key={method}
              className="rounded-md border border-surface-border bg-white p-3"
            >
              <p className="text-xs uppercase tracking-wide text-text-muted">{method}</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">
                {formatINR(bucket.total)}
              </p>
              <p className="text-xs text-text-muted">{bucket.count} txns</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <h3 className="px-4 py-3 text-sm font-semibold text-text-primary">Day-by-day</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-surface-divider last:border-0">
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(r.day).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="default">{r.method}</Badge>
                </td>
                <td className="px-4 py-3 text-right text-status-success">{formatINR(r.amount)}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AgingView({ buckets }: { buckets: AgingBuckets | null }) {
  if (!buckets) return <Card className="p-8 text-center text-sm text-text-muted">No data.</Card>;
  const order: Array<keyof AgingBuckets> = ["0-30", "31-60", "61-90", "90+"];
  const total = order.reduce((sum, k) => sum + (buckets[k] ?? 0), 0);
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-xs uppercase tracking-wide text-text-muted">Total outstanding</p>
        <p className="mt-1 text-2xl font-bold text-status-error">{formatINR(total)}</p>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {order.map((bucket) => {
          const value = buckets[bucket] ?? 0;
          const pct = total > 0 ? (value / total) * 100 : 0;
          const tone =
            bucket === "0-30"
              ? "text-status-success"
              : bucket === "31-60"
                ? "text-status-warning"
                : "text-status-error";
          return (
            <Card key={bucket} className="p-4">
              <p className="text-xs uppercase tracking-wide text-text-muted">{bucket} days</p>
              <p className={`mt-1 text-xl font-bold ${tone}`}>{formatINR(value)}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full bg-brand-royal"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-text-muted">{pct.toFixed(1)}% of dues</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function DefaultersView({ rows }: { rows: DefaulterRow[] | null }) {
  if (!rows) return <Card className="p-8 text-center text-sm text-text-muted">No data.</Card>;
  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-status-success">
        🎉 No defaulters with the current filter.
      </Card>
    );
  }
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Class</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3 text-right">Due</th>
            <th className="px-4 py-3 text-right">Overdue charges</th>
            <th className="px-4 py-3">Oldest due</th>
            <th className="px-4 py-3 text-right">Days</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.accountId} className="border-b border-surface-divider last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium text-text-primary">{r.studentName}</p>
                <p className="text-xs text-text-muted">
                  {r.applicationId ?? "—"}
                  {r.grNumber ? ` · GR ${r.grNumber}` : ""}
                </p>
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {r.className ? `${r.className}${r.section ? " · " + r.section : ""}` : "—"}
              </td>
              <td className="px-4 py-3 text-text-secondary">{r.contact ?? "—"}</td>
              <td className="px-4 py-3 text-right font-semibold text-status-error">
                {formatINR(r.totalDue)}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary">{r.overdueCharges}</td>
              <td className="px-4 py-3 text-text-secondary">{r.oldestDueDate ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                <Badge variant={r.daysOverdue > 30 ? "error" : "warning"}>
                  {r.daysOverdue}d
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href={`/principal/fees/students/${r.accountId}`}
                  className="text-xs font-medium text-brand-royal hover:underline"
                >
                  Open →
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function ClassWiseView({ rows }: { rows: ClassWiseRow[] | null }) {
  if (!rows) return <Card className="p-8 text-center text-sm text-text-muted">No data.</Card>;
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3">Class ID</th>
            <th className="px-4 py-3 text-right">Students</th>
            <th className="px-4 py-3 text-right">Charged</th>
            <th className="px-4 py-3 text-right">Paid</th>
            <th className="px-4 py-3 text-right">Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-surface-divider last:border-0">
              <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                {r.classId ?? "—"}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary">{r.students}</td>
              <td className="px-4 py-3 text-right text-text-secondary">{formatINR(r.charged)}</td>
              <td className="px-4 py-3 text-right text-status-success">{formatINR(r.paid)}</td>
              <td className="px-4 py-3 text-right text-status-error">{formatINR(r.due)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function HeadWiseView({ rows }: { rows: HeadWiseRow[] | null }) {
  if (!rows) return <Card className="p-8 text-center text-sm text-text-muted">No data.</Card>;
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3">Fee Head ID</th>
            <th className="px-4 py-3 text-right">Charged</th>
            <th className="px-4 py-3 text-right">Paid</th>
            <th className="px-4 py-3 text-right">Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-surface-divider last:border-0">
              <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                {r.feeHeadId ?? "(unattributed)"}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary">{formatINR(r.charged)}</td>
              <td className="px-4 py-3 text-right text-status-success">{formatINR(r.paid)}</td>
              <td className="px-4 py-3 text-right text-status-error">{formatINR(r.due)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
