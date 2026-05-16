"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Filter,
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

type ClassRow = {
  id: string;
  grade: string;
  section: string;
  teacher: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  status: "marked" | "pending" | "in_progress";
};

const CLASSES: ClassRow[] = [
  { id: "7B",  grade: "Grade 7",  section: "B", teacher: "Dr. Anita Rao",      total: 32, present: 30, absent: 1, late: 1, status: "marked" },
  { id: "9A",  grade: "Grade 9",  section: "A", teacher: "Mr. Bernard Wells",  total: 28, present: 26, absent: 2, late: 0, status: "marked" },
  { id: "3C",  grade: "Grade 3",  section: "C", teacher: "Ms. Carla Diaz",     total: 30, present: 0,  absent: 0, late: 0, status: "pending" },
  { id: "11S", grade: "Grade 11", section: "S", teacher: "Dr. Eleanor Hughes", total: 24, present: 23, absent: 0, late: 1, status: "marked" },
  { id: "5A",  grade: "Grade 5",  section: "A", teacher: "Ms. Hannah Lee",     total: 31, present: 18, absent: 0, late: 0, status: "in_progress" },
  { id: "8D",  grade: "Grade 8",  section: "D", teacher: "Ms. Farah Siddiqui", total: 29, present: 0,  absent: 0, late: 0, status: "pending" },
  { id: "10B", grade: "Grade 10", section: "B", teacher: "Mr. Devansh Kapoor", total: 30, present: 28, absent: 1, late: 1, status: "marked" },
  { id: "6A",  grade: "Grade 6",  section: "A", teacher: "Mr. Gabriel Costa",  total: 33, present: 31, absent: 2, late: 0, status: "marked" },
];

const ALERTS = [
  { name: "Liam Bennett",  id: "STU-2026-0180", absentStreak: 4, grade: "Grade 3-C", reason: "Reported sick" },
  { name: "Noah Park",     id: "STU-2026-0178", absentStreak: 3, grade: "Grade 5-A", reason: "No explanation" },
  { name: "Zara Khan",     id: "STU-2026-0177", absentStreak: 2, grade: "Grade 8-D", reason: "Family event" },
];

export default function AttendanceModulePage() {
  const [tab, setTab] = useState<"today" | "marked" | "pending">("today");

  const filtered =
    tab === "marked"
      ? CLASSES.filter((c) => c.status === "marked")
      : tab === "pending"
        ? CLASSES.filter((c) => c.status !== "marked")
        : CLASSES;

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={CalendarCheck2}
          eyebrow="Attendance"
          title="Daily attendance"
          description="Track classroom-level attendance, follow up on absences, and review trends across grades."
          badges={[
            { label: "Today · Sat, May 16", tone: "live" },
            { label: "48 classes" },
          ]}
          actions={
            <>
              <Button variant="secondary">
                <Download className="mr-1.5 h-4 w-4" />
                Report
              </Button>
              <Link href="/principal/attendance/take" className="btn-pay">
                Take attendance
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </>
          }
        />

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Present today"
            value="1,238"
            meta="96.4% of enrolled"
            icon={CheckCircle2}
            tone="emerald"
          />
          <StatCard
            label="Absent today"
            value="46"
            meta="3.6% — 4 unexplained"
            icon={AlertCircle}
            tone="rose"
          />
          <StatCard
            label="Late arrivals"
            value="12"
            meta="2 first-time this month"
            icon={Clock}
            tone="amber"
          />
          <StatCard
            label="Classes marked"
            value="42 / 48"
            meta="6 pending teacher submission"
            icon={Users}
            tone="brand"
          />
        </section>

        {/* Classes table */}
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
            <SectionHeader
              eyebrow="Today · Sat, May 16"
              title="Class submissions"
              description="Each class is owned by its homeroom teacher. Tap a row to view the roster."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-divider px-5 py-3">
            <TabPills
              tabs={[
                { key: "today", label: "All classes", count: CLASSES.length },
                { key: "marked", label: "Marked", count: CLASSES.filter((c) => c.status === "marked").length },
                { key: "pending", label: "Pending", count: CLASSES.filter((c) => c.status !== "marked").length },
              ]}
              active={tab}
              onChange={(k) => setTab(k as typeof tab)}
            />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-sm border border-surface-border bg-surface-card px-2.5 py-1.5 text-sm">
                <Search className="h-3.5 w-3.5 text-text-muted" />
                <Input
                  placeholder="Class, teacher…"
                  className="w-44 border-0 bg-transparent p-0 text-sm shadow-none focus:shadow-none"
                />
              </div>
              <Button variant="secondary" size="sm">
                <Filter className="mr-1 h-3.5 w-3.5" />
                Filter
              </Button>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Homeroom teacher</th>
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
                  c.status === "pending"
                    ? 0
                    : Math.round((c.present / c.total) * 100);
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="font-medium text-text-primary">
                        {c.grade} — {c.section}
                      </span>
                    </td>
                    <td className="text-text-secondary">{c.teacher}</td>
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
                          <span className="text-xs font-medium tabular-nums">
                            {pct}%
                          </span>
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
                        href="/principal/attendance/take"
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
        </Card>

        {/* Alerts + trend */}
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2 p-5">
            <SectionHeader
              eyebrow="Trend · 30 days"
              title="School-wide attendance"
              description="Daily attendance percentage across all enrolled students."
            />
            <div className="mt-4 flex h-44 items-end gap-1.5">
              {Array.from({ length: 30 }).map((_, i) => {
                const v = 80 + ((i * 7 + 11) % 20);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={
                        i === 29
                          ? "w-full rounded-sm bg-brand-royal"
                          : v >= 92
                            ? "w-full rounded-sm bg-emerald-200"
                            : v >= 85
                              ? "w-full rounded-sm bg-surface-muted"
                              : "w-full rounded-sm bg-amber-200"
                      }
                      style={{ height: `${v}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-surface-divider pt-3 text-xs text-text-muted">
              <span>30 days ago</span>
              <span>Today · 96.4%</span>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader
              eyebrow="Needs follow-up"
              title="Absence alerts"
              description="Students with 2+ consecutive absences."
            />
            <ul className="mt-4 divide-y divide-surface-divider">
              {ALERTS.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-700">
                    <AlertCircle className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {a.name}
                      </p>
                      <Badge variant="error">{a.absentStreak} days</Badge>
                    </div>
                    <p className="font-mono text-[11px] text-text-muted">
                      {a.id} · {a.grade}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">{a.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/principal/attendance/take"
              className="mt-3 inline-flex items-center text-xs font-semibold text-brand-royal hover:underline"
            >
              Contact guardians <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Card>
        </div>
      </div>
    </main>
  );
}
