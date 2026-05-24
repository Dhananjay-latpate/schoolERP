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
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageHero } from "@/components/shared/PageHero";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { TabPills } from "@/components/shared/TabPills";
import {
  PrincipalApiError,
  getAttendanceOverview,
  type AttendanceOverview,
} from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

const todayISO = () => new Date().toISOString().slice(0, 10);

const prettyDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
};

export default function AttendanceModulePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [date, setDate] = useState(todayISO());
  const [tab, setTab] = useState<"all" | "marked" | "pending">("all");
  const [overview, setOverview] = useState<AttendanceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = getPrincipalToken();
    if (!existing) {
      router.replace("/principal/login?next=%2Fprincipal%2Fattendance");
      return;
    }
    setToken(existing);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);
    setError("");
    (async () => {
      try {
        const data = await getAttendanceOverview(token, date);
        if (!cancelled) setOverview(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) {
          clearPrincipalSession();
          router.replace("/principal/login?next=%2Fprincipal%2Fattendance");
          return;
        }
        setError(err instanceof PrincipalApiError ? err.message : "Failed to load attendance");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, date, router]);

  const classes = useMemo(() => overview?.classes ?? [], [overview]);
  const totals = overview?.totals;

  const filtered = useMemo(() => {
    if (tab === "marked") return classes.filter((c) => c.status === "marked");
    if (tab === "pending") return classes.filter((c) => c.status !== "marked");
    return classes;
  }, [classes, tab]);

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={CalendarCheck2}
          eyebrow="Attendance"
          title="Daily attendance"
          description="Track classroom-level attendance and follow up on absences across grades."
          badges={[
            { label: prettyDate(date), tone: "live" },
            { label: `${totals?.totalClasses ?? 0} classes` },
          ]}
          actions={
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="input-base w-44"
            />
          }
        />

        {error && (
          <Card className="border-brand-rose/25 bg-brand-rose-light p-3 text-sm text-status-error">
            {error}
          </Card>
        )}

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Present"
            value={isLoading ? "…" : String(totals?.present ?? 0)}
            meta={`${totals?.enrolled ?? 0} enrolled`}
            icon={CheckCircle2}
            tone="emerald"
          />
          <StatCard
            label="Absent"
            value={isLoading ? "…" : String(totals?.absent ?? 0)}
            meta={`${totals?.late ?? 0} late · ${totals?.excused ?? 0} excused`}
            icon={AlertCircle}
            tone="rose"
          />
          <StatCard
            label="On leave"
            value={isLoading ? "…" : String(totals?.onLeave ?? 0)}
            meta={`${totals?.halfDay ?? 0} half-day`}
            icon={Clock}
            tone="amber"
          />
          <StatCard
            label="Classes marked"
            value={isLoading ? "…" : `${totals?.classesMarked ?? 0} / ${totals?.totalClasses ?? 0}`}
            meta="completed today"
            icon={Users}
            tone="brand"
          />
        </section>

        {/* Classes table */}
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
            <SectionHeader
              eyebrow={prettyDate(date)}
              title="Class submissions"
              description="Tap a class to mark or review its roster for the selected day."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-divider px-5 py-3">
            <TabPills
              tabs={[
                { key: "all", label: "All classes", count: classes.length },
                { key: "marked", label: "Marked", count: classes.filter((c) => c.status === "marked").length },
                { key: "pending", label: "Pending", count: classes.filter((c) => c.status !== "marked").length },
              ]}
              active={tab}
              onChange={(k) => setTab(k as typeof tab)}
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-text-secondary">
              No classes to show for this filter.
            </p>
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
                  const pct = c.total > 0 ? Math.round((c.present / c.total) * 100) : 0;
                  return (
                    <tr key={c.classId}>
                      <td>
                        <span className="font-medium text-text-primary">
                          {c.className}
                          {c.section ? ` — ${c.section}` : ""}
                        </span>
                      </td>
                      <td className="tabular-nums">{c.total}</td>
                      <td className="tabular-nums text-emerald-700">
                        {c.status === "pending" ? "—" : c.present}
                      </td>
                      <td className="tabular-nums text-rose-700">
                        {c.status === "pending" ? "—" : c.absent}
                      </td>
                      <td className="tabular-nums text-amber-700">
                        {c.status === "pending" ? "—" : c.late}
                      </td>
                      <td>
                        {c.status === "pending" ? (
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
                            <span className="text-xs font-medium tabular-nums">{pct}%</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {c.status === "marked" && <Badge variant="success">Marked</Badge>}
                        {c.status === "in_progress" && <Badge variant="warning">In progress</Badge>}
                        {c.status === "pending" && <Badge variant="error">Pending</Badge>}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/principal/attendance/take?classId=${encodeURIComponent(c.classId)}&date=${date}`}
                          className="inline-flex items-center text-xs font-semibold text-brand-royal hover:underline"
                        >
                          {c.status === "marked" ? "Review" : "Mark now"}
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

        <Link
          href="/principal/attendance/take"
          className="inline-flex items-center text-sm font-semibold text-brand-royal hover:underline"
        >
          Open the marking workspace <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </div>
    </main>
  );
}
