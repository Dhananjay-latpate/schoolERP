"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCcw,
  Search,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { PageHero } from "@/components/shared/PageHero";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { TabPills } from "@/components/shared/TabPills";
import {
  PrincipalApiError,
  getAttendanceOverview,
  type AttendanceOverviewRow,
} from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

function todayISODate(): string {
  // Local YYYY-MM-DD (avoids the UTC shift of toISOString()).
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function formatTodayLabel(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type Tab = "today" | "marked" | "pending";

export default function AttendanceModulePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [rows, setRows] = useState<AttendanceOverviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("today");
  const [search, setSearch] = useState("");

  const date = todayISODate();

  // Gate on mount — mirror /principal/page.tsx.
  useEffect(() => {
    const existing = getPrincipalToken();
    if (!existing) {
      router.replace("/principal/login?next=%2Fprincipal%2Fattendance");
      return;
    }
    setToken(existing);
    setIsCheckingSession(false);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAttendanceOverview(token, date);
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        if (
          err instanceof PrincipalApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          clearPrincipalSession();
          router.replace("/principal/login?next=%2Fprincipal%2Fattendance");
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to load attendance overview",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, date, router]);

  const kpis = useMemo(() => {
    let totalStudents = 0;
    let present = 0;
    let absent = 0;
    let late = 0;
    let markedClasses = 0;
    for (const r of rows) {
      totalStudents += r.totalStudents;
      present += r.present;
      absent += r.absent;
      late += r.late;
      if (r.marked) markedClasses += 1;
    }
    const presentPct =
      totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0;
    const absentPct =
      totalStudents > 0 ? Math.round((absent / totalStudents) * 100) : 0;
    return {
      totalStudents,
      present,
      absent,
      late,
      presentPct,
      absentPct,
      markedClasses,
      totalClasses: rows.length,
      pendingClasses: rows.length - markedClasses,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (tab === "marked") list = list.filter((r) => r.marked);
    else if (tab === "pending") list = list.filter((r) => !r.marked);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const label = `${r.className} ${r.section ?? ""}`.toLowerCase();
        return label.includes(q);
      });
    }
    return list;
  }, [rows, tab, search]);

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-bg px-4">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing attendance...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={CalendarCheck2}
          eyebrow="Attendance"
          title="Daily attendance"
          description="Track classroom-level attendance, follow up on absences, and review submissions across grades."
          badges={[
            { label: `Today · ${formatTodayLabel()}`, tone: "live" },
            { label: `${rows.length} ${rows.length === 1 ? "class" : "classes"}` },
          ]}
          actions={
            <Link href="/principal/attendance/take" className="btn-pay">
              Take attendance
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          }
        />

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Present today"
            value={isLoading ? "—" : kpis.present.toLocaleString("en-IN")}
            meta={
              isLoading
                ? "Loading…"
                : `${kpis.presentPct}% of ${kpis.totalStudents.toLocaleString("en-IN")} enrolled`
            }
            icon={CheckCircle2}
            tone="emerald"
            loading={isLoading}
          />
          <StatCard
            label="Absent today"
            value={isLoading ? "—" : kpis.absent.toLocaleString("en-IN")}
            meta={isLoading ? "Loading…" : `${kpis.absentPct}% of enrolled`}
            icon={AlertCircle}
            tone="rose"
            loading={isLoading}
          />
          <StatCard
            label="Late arrivals"
            value={isLoading ? "—" : kpis.late.toLocaleString("en-IN")}
            meta={isLoading ? "Loading…" : "Marked late today"}
            icon={Clock}
            tone="amber"
            loading={isLoading}
          />
          <StatCard
            label="Classes marked"
            value={isLoading ? "—" : `${kpis.markedClasses} / ${kpis.totalClasses}`}
            meta={
              isLoading
                ? "Loading…"
                : `${kpis.pendingClasses} pending submission`
            }
            icon={Users}
            tone="brand"
            loading={isLoading}
          />
        </section>

        {/* Classes table */}
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
            <SectionHeader
              eyebrow={`Today · ${formatTodayLabel()}`}
              title="Class submissions"
              description="Tap a class to open its roster and mark attendance."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-divider px-5 py-3">
            <TabPills
              tabs={[
                { key: "today", label: "All classes", count: rows.length },
                {
                  key: "marked",
                  label: "Marked",
                  count: rows.filter((r) => r.marked).length,
                },
                {
                  key: "pending",
                  label: "Pending",
                  count: rows.filter((r) => !r.marked).length,
                },
              ]}
              active={tab}
              onChange={(k) => setTab(k as Tab)}
            />
            <div className="flex items-center gap-2 rounded-sm border border-surface-border bg-surface-card px-2.5 py-1.5 text-sm">
              <Search className="h-3.5 w-3.5 text-text-muted" />
              <Input
                placeholder="Find a class…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-44 border-0 bg-transparent p-0 text-sm shadow-none focus:shadow-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading class submissions…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <AlertCircle className="h-6 w-6 text-rose-600" />
              <p className="text-sm font-medium text-text-primary">
                Could not load attendance
              </p>
              <p className="max-w-md text-sm text-text-secondary">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setToken((t) => t)}
              >
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
              <CalendarCheck2 className="h-6 w-6 text-text-muted" />
              <p className="text-sm font-medium text-text-primary">
                No classes to show
              </p>
              <p className="max-w-md text-sm text-text-secondary">
                No active classes were found for today. Set up classes in the
                Admissions module to begin marking attendance.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-text-secondary">
              No classes match your filters.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Strength</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>%</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const pct =
                    !c.marked || c.totalStudents === 0
                      ? 0
                      : Math.round((c.present / c.totalStudents) * 100);
                  const label = c.section
                    ? `${c.className} — ${c.section}`
                    : c.className;
                  return (
                    <tr key={c.classId}>
                      <td>
                        <span className="font-medium text-text-primary">
                          {label}
                        </span>
                      </td>
                      <td className="tabular-nums">{c.totalStudents}</td>
                      <td className="tabular-nums text-emerald-700">
                        {c.marked ? c.present : "—"}
                      </td>
                      <td className="tabular-nums text-rose-700">
                        {c.marked ? c.absent : "—"}
                      </td>
                      <td className="tabular-nums text-amber-700">
                        {c.marked ? c.late : "—"}
                      </td>
                      <td>
                        {!c.marked ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted">
                              <div
                                className={
                                  pct >= 95
                                    ? "h-full rounded-full bg-emerald-600"
                                    : pct >= 85
                                      ? "h-full rounded-full bg-brand-royal"
                                      : "h-full rounded-full bg-amber-600"
                                }
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium tabular-nums">
                              {pct}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        {c.marked ? (
                          <Badge variant="success">Marked</Badge>
                        ) : c.markedCount > 0 ? (
                          <Badge variant="warning">In progress</Badge>
                        ) : (
                          <Badge variant="error">Pending</Badge>
                        )}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/principal/attendance/take?classId=${encodeURIComponent(c.classId)}`}
                          className="inline-flex items-center text-xs font-semibold text-brand-royal hover:underline"
                        >
                          {c.marked ? "Review" : "Mark now"}
                          <ChevronRight className="ml-0.5 h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </main>
  );
}
