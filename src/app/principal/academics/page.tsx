"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookCheck,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Layers,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageHero } from "@/components/shared/PageHero";
import { SectionHeader } from "@/components/shared/SectionHeader";

const SUBJECTS = [
  { name: "Mathematics",       teacher: "Dr. Anita Rao",        classes: 18, coverage: 72, milestone: "Unit 5 — Quadratics" },
  { name: "Physics",           teacher: "Mr. Bernard Wells",    classes: 12, coverage: 64, milestone: "Optics lab series"   },
  { name: "Chemistry",         teacher: "Ms. Farah Siddiqui",   classes: 14, coverage: 78, milestone: "Periodic trends"     },
  { name: "Biology",           teacher: "Dr. Eleanor Hughes",   classes: 10, coverage: 81, milestone: "Cell division"       },
  { name: "English Literature",teacher: "Ms. Carla Diaz",       classes: 22, coverage: 75, milestone: "Romantic poetry"     },
  { name: "Computer Science",  teacher: "Mr. Devansh Kapoor",   classes: 8,  coverage: 60, milestone: "Intro to recursion"  },
  { name: "History",           teacher: "Mr. Rohit Patel",      classes: 16, coverage: 68, milestone: "World War I"         },
  { name: "Geography",         teacher: "Ms. Saira Khan",       classes: 12, coverage: 70, milestone: "Climate systems"     },
];

const MILESTONES = [
  { title: "Mid-term exams begin",        date: "May 22",  tone: "warning" as const, icon: ClipboardList },
  { title: "Quarterly review submission", date: "May 28",  tone: "info" as const,    icon: BookCheck     },
  { title: "Curriculum audit · Sciences", date: "Jun 2",   tone: "default" as const, icon: Layers        },
  { title: "Result publication",          date: "Jun 12",  tone: "success" as const, icon: CheckCircle2  },
];

export default function AcademicsPage() {
  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={BookCheck}
          eyebrow="Academic oversight"
          title="Curriculum & academic health"
          description="Track subject-level progress, coverage against the academic plan, and upcoming milestones."
          badges={[
            { label: "AY 2026-27 · Term 1", tone: "live" },
            { label: "8 departments · 92 staff" },
          ]}
        />

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Curriculum coverage"
            value="72%"
            meta="On track vs plan (70% by week 6)"
            icon={TrendingUp}
            tone="brand"
          />
          <StatCard
            label="Subjects on track"
            value="6 / 8"
            meta="2 behind plan — Physics, CS"
            icon={CheckCircle2}
            tone="emerald"
          />
          <StatCard
            label="Active subjects"
            value="8"
            meta="across 12 grades"
            icon={BookOpen}
            tone="brand"
          />
          <StatCard
            label="Recommended actions"
            value="3"
            meta="from AI curriculum review"
            icon={Sparkles}
            tone="amber"
          />
        </section>

        {/* Sub-module shortcuts */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="card-interactive p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-brand-sky-light text-brand-royal">
                <ClipboardList className="h-4 w-4" />
              </span>
              <Badge variant="success">Live</Badge>
            </div>
            <h3 className="mt-3 text-base font-semibold text-text-primary">Exams & gradebook</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Schedule examinations, manage gradebooks, and publish results.
            </p>
            <Link
              href="/principal/exams"
              className="mt-4 inline-flex items-center text-sm font-semibold text-brand-royal hover:underline"
            >
              Open module <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Card>

          <Card className="card-interactive p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-50 text-amber-700">
                <Layers className="h-4 w-4" />
              </span>
              <Badge variant="success">Live</Badge>
            </div>
            <h3 className="mt-3 text-base font-semibold text-text-primary">Timetable</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Weekly class schedules, teacher allocation, and room booking.
            </p>
            <Link
              href="/principal/timetable"
              className="mt-4 inline-flex items-center text-sm font-semibold text-brand-royal hover:underline"
            >
              Open module <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Card>

          <Card className="card-interactive p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-50 text-emerald-700">
                <BookOpen className="h-4 w-4" />
              </span>
              <Badge variant="success">Live</Badge>
            </div>
            <h3 className="mt-3 text-base font-semibold text-text-primary">Library</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Catalog, borrowings, returns, and reading-room operations.
            </p>
            <Link
              href="/principal/library"
              className="mt-4 inline-flex items-center text-sm font-semibold text-brand-royal hover:underline"
            >
              Open module <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Card>
        </section>

        {/* Subject coverage */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-surface-border px-5 py-3.5">
            <SectionHeader
              eyebrow="Curriculum coverage"
              title="Subjects vs plan"
              description="Coverage percentage against the academic-year plan as of today."
            />
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Lead teacher</th>
                <th>Classes</th>
                <th>Current milestone</th>
                <th>Coverage</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {SUBJECTS.map((s) => (
                <tr key={s.name}>
                  <td className="font-medium text-text-primary">{s.name}</td>
                  <td className="text-text-secondary">{s.teacher}</td>
                  <td className="tabular-nums">{s.classes}</td>
                  <td className="text-text-secondary">{s.milestone}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className={
                            s.coverage >= 75
                              ? "h-full rounded-full bg-emerald-600"
                              : s.coverage >= 65
                                ? "h-full rounded-full bg-brand-royal"
                                : "h-full rounded-full bg-amber-500"
                          }
                          style={{ width: `${s.coverage}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{s.coverage}%</span>
                    </div>
                  </td>
                  <td>
                    <Badge
                      variant={
                        s.coverage >= 75
                          ? "success"
                          : s.coverage >= 65
                            ? "info"
                            : "warning"
                      }
                    >
                      {s.coverage >= 75 ? "Ahead" : s.coverage >= 65 ? "On plan" : "Behind"}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <Link
                      href="#"
                      className="inline-flex items-center text-xs font-semibold text-brand-royal hover:underline"
                    >
                      View
                      <ChevronRight className="ml-0.5 h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Upcoming milestones */}
        <Card className="p-5">
          <SectionHeader
            eyebrow="Roadmap"
            title="Upcoming academic milestones"
            description="Term-level events that affect coverage planning."
          />
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {MILESTONES.map((m) => {
              const Icon = m.icon;
              return (
                <li
                  key={m.title}
                  className="card-interactive flex items-center gap-3 p-3"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-surface-muted text-text-secondary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {m.title}
                    </p>
                    <p className="text-xs text-text-muted">{m.date}</p>
                  </div>
                  <Badge variant={m.tone}>{m.date.split(" ")[0]}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </main>
  );
}
