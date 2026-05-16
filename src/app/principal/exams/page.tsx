"use client";

import Link from "next/link";
import {
  Award,
  CalendarDays,
  ClipboardCheck,
  Download,
  FileText,
  GraduationCap,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageHero } from "@/components/shared/PageHero";
import { SectionHeader } from "@/components/shared/SectionHeader";

type ExamStatus = "Scheduled" | "Live" | "Grading" | "Published" | "Draft";

const EXAMS: {
  id: string;
  title: string;
  subject: string;
  grade: string;
  date: string;
  students: number;
  status: ExamStatus;
}[] = [
  { id: "EX-2026-041", title: "Mid-term — Mathematics",   subject: "Mathematics",  grade: "Grade 7",      date: "May 22 · 09:00", students: 124, status: "Scheduled" },
  { id: "EX-2026-040", title: "Mid-term — Physics",        subject: "Physics",      grade: "Grade 9–11",   date: "May 23 · 10:00", students: 218, status: "Scheduled" },
  { id: "EX-2026-039", title: "Mid-term — English Lit.",   subject: "English",      grade: "All grades",   date: "May 24 · 09:00", students: 1284, status: "Draft" },
  { id: "EX-2026-038", title: "Unit Test 4 — Chemistry",   subject: "Chemistry",    grade: "Grade 10–12",  date: "May 19 · 11:00", students: 196, status: "Live" },
  { id: "EX-2026-037", title: "Practical — Biology",       subject: "Biology",      grade: "Grade 11-S",   date: "May 17 · 14:00", students: 24,  status: "Grading" },
  { id: "EX-2026-036", title: "Unit Test 3 — History",     subject: "History",      grade: "Grade 8",      date: "May 12 · 09:30", students: 118, status: "Published" },
];

const STATUS_TONE: Record<ExamStatus, "info" | "warning" | "success" | "default" | "violet"> = {
  Scheduled: "info",
  Live: "warning",
  Grading: "violet",
  Published: "success",
  Draft: "default",
};

const TOP_PERFORMERS = [
  { name: "Priya Iyer",    grade: "Grade 11-S", subject: "Mathematics", score: 98 },
  { name: "Sara Hassan",   grade: "Grade 9-A",  subject: "Physics",     score: 96 },
  { name: "Aarav Mehta",   grade: "Grade 7-B",  subject: "English",     score: 94 },
  { name: "Ethan Wong",    grade: "Grade 10-B", subject: "Chemistry",   score: 92 },
  { name: "Zara Khan",     grade: "Grade 8-D",  subject: "Biology",     score: 95 },
];

const SUBJECTS = [
  { name: "Mathematics", avg: 78, prev: 76 },
  { name: "Physics",     avg: 72, prev: 75 },
  { name: "English",     avg: 81, prev: 79 },
  { name: "Chemistry",   avg: 69, prev: 71 },
  { name: "Biology",     avg: 76, prev: 74 },
  { name: "History",     avg: 74, prev: 70 },
];

export default function ExamsPage() {
  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={GraduationCap}
          eyebrow="Exams"
          title="Exam schedule & results"
          description="Schedule examinations, manage gradebooks, and publish consolidated results to parents."
          badges={[
            { label: "Mid-term cycle · May 17 – Jun 5", tone: "live" },
            { label: "5 active exams" },
          ]}
          actions={
            <>
              <Button variant="secondary">
                <Download className="mr-1.5 h-4 w-4" />
                Result analytics
              </Button>
              <Button variant="pay">
                <Plus className="mr-1.5 h-4 w-4" />
                Schedule exam
              </Button>
            </>
          }
        />

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active exams"     value="5"      meta="3 scheduled, 1 live, 1 grading"    icon={ClipboardCheck} tone="brand" />
          <StatCard label="Avg. score (May)" value="76.4"   meta="↑ 2.1 vs last cycle"                icon={TrendingUp}     tone="emerald" />
          <StatCard label="Pass rate"        value="93.7%"  meta="↑ 1.5% YoY"                         icon={Award}          tone="emerald" />
          <StatCard label="Awaiting grading" value="284"    meta="32 cleared this morning"            icon={FileText}       tone="amber" />
        </section>

        {/* Schedule table */}
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
            <SectionHeader
              eyebrow="Cycle · May 17 – Jun 5"
              title="Upcoming & recent exams"
            />
            <Button variant="secondary" size="sm">
              <CalendarDays className="mr-1 h-3.5 w-3.5" />
              Calendar view
            </Button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Subject</th>
                <th>Grade</th>
                <th>Date & time</th>
                <th>Students</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {EXAMS.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-sky-light text-brand-royal">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium text-text-primary">{e.title}</p>
                        <p className="font-mono text-[11px] text-text-muted">{e.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-text-secondary">{e.subject}</td>
                  <td className="text-text-secondary">{e.grade}</td>
                  <td className="text-text-secondary tabular-nums">{e.date}</td>
                  <td className="tabular-nums">{e.students}</td>
                  <td><Badge variant={STATUS_TONE[e.status]}>{e.status}</Badge></td>
                  <td className="text-right">
                    <button className="btn-ghost btn-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Subject performance + Grade distribution */}
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2 p-5">
            <SectionHeader
              eyebrow="Subject performance"
              title="Class averages — current cycle"
              description="Compared against the previous cycle. Click a subject for class-by-class breakdown."
              actions={
                <Link href="#" className="inline-flex items-center text-xs font-semibold text-brand-royal hover:underline">
                  Detailed report →
                </Link>
              }
            />
            <ul className="mt-4 space-y-3">
              {SUBJECTS.map((s) => {
                const delta = s.avg - s.prev;
                return (
                  <li key={s.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-text-primary">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted">prev {s.prev}%</span>
                        <span className="tabular-nums font-semibold">{s.avg}%</span>
                        <span
                          className={
                            delta > 0
                              ? "rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
                              : delta < 0
                                ? "rounded-sm bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                                : "rounded-sm bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary"
                          }
                        >
                          {delta > 0 ? "+" : ""}
                          {delta}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-brand-royal"
                        style={{ width: `${s.avg}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-5">
            <SectionHeader eyebrow="Distribution" title="Grades · current cycle" />
            <div className="mt-4 space-y-3">
              {[
                { g: "A+", pct: 18, color: "bg-emerald-600" },
                { g: "A",  pct: 26, color: "bg-emerald-400" },
                { g: "B",  pct: 31, color: "bg-brand-royal" },
                { g: "C",  pct: 14, color: "bg-amber-400" },
                { g: "D",  pct: 8,  color: "bg-amber-600" },
                { g: "F",  pct: 3,  color: "bg-rose-500" },
              ].map((row) => (
                <div key={row.g}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{row.g}</span>
                    <span className="tabular-nums text-text-secondary">{row.pct}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct * 3}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top performers */}
        <Card className="p-5">
          <SectionHeader
            eyebrow="Top performers"
            title="Highest scores this cycle"
            actions={
              <Link href="#" className="inline-flex items-center text-xs font-semibold text-brand-royal hover:underline">
                Full leaderboard →
              </Link>
            }
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {TOP_PERFORMERS.map((t, i) => (
              <div
                key={t.name}
                className="card-interactive flex items-center gap-3 p-3"
              >
                <span className="grid h-10 w-10 place-items-center rounded-md bg-amber-50 text-amber-700">
                  {i === 0 ? <Trophy className="h-5 w-5" /> : <Award className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{t.name}</p>
                  <p className="truncate text-xs text-text-muted">{t.grade} · {t.subject}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-sm font-bold tabular-nums text-emerald-700">
                  {t.score}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
