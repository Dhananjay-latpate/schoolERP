"use client";

import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Banknote,
  CalendarCheck2,
  Download,
  GraduationCap,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageHero } from "@/components/shared/PageHero";
import { SectionHeader } from "@/components/shared/SectionHeader";

const REVENUE_TREND = [60, 72, 78, 84, 76, 88, 92, 89, 78, 84, 96, 78];
const ATTENDANCE_TREND = [92, 94, 91, 96, 95, 97, 93, 94, 92, 96, 95, 96];

const HIGHLIGHTS = [
  {
    title: "Admissions pipeline is strong",
    body: "182 new applications submitted in May — 24% up on April. Decisions for the next cycle should keep pace.",
    tone: "success" as const,
    icon: TrendingUp,
  },
  {
    title: "Grade 9-A attendance dipped",
    body: "Grade 9-A attendance fell to 88% over the last 7 days, mainly due to seasonal absences. Worth flagging to homeroom.",
    tone: "warning" as const,
    icon: TrendingDown,
  },
  {
    title: "Fees collection on track",
    body: "78% of May invoices cleared. Auto-reminders fired this morning; 68 overdue students still need follow-up.",
    tone: "info" as const,
    icon: Banknote,
  },
];

export default function ReportsPage() {
  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={BarChart3}
          eyebrow="Reports & analytics"
          title="School performance overview"
          description="A single page for the principal to see the school's health across admissions, finance, attendance and academics."
          badges={[
            { label: "Live · refreshed 12:14 PM", tone: "live" },
            { label: "May 2026" },
          ]}
          actions={
            <>
              <Button variant="secondary">
                <Download className="mr-1.5 h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="pay">
                <Sparkles className="mr-1.5 h-4 w-4" />
                AI summary
              </Button>
            </>
          }
        />

        {/* Top-level KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total students"   value="1,284" icon={Users2}        tone="brand"   meta="↑ 3.2% this term" />
          <StatCard label="Attendance · MTD" value="94.8%" icon={CalendarCheck2} tone="emerald" meta="↑ 0.6 vs Apr"     />
          <StatCard label="Fees collected"   value="₹14.6L" icon={Banknote}     tone="amber"   meta="78% of target"     />
          <StatCard label="Avg. exam score"  value="76.4"   icon={GraduationCap} tone="emerald" meta="↑ 2.1 vs prev"     />
        </section>

        {/* Trend cards */}
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-5">
            <SectionHeader
              eyebrow="Finance"
              title="Fees collected · last 12 months"
              actions={
                <a href="/principal/fees" className="inline-flex items-center text-xs font-semibold text-brand-royal hover:underline">
                  Open fees <ArrowUpRight className="ml-0.5 h-3 w-3" />
                </a>
              }
            />
            <div className="mt-4 flex h-44 items-end gap-2">
              {REVENUE_TREND.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={
                      i === REVENUE_TREND.length - 1
                        ? "w-full rounded-sm bg-brand-royal"
                        : "w-full rounded-sm bg-brand-sky-light"
                    }
                    style={{ height: `${v}%` }}
                  />
                  <span className="text-[10px] text-text-muted">
                    {["A","M","J","J","A","S","O","N","D","J","F","M"][i]}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader
              eyebrow="Attendance"
              title="School-wide attendance · last 12 months"
              actions={
                <a href="/principal/attendance" className="inline-flex items-center text-xs font-semibold text-brand-royal hover:underline">
                  Open attendance <ArrowUpRight className="ml-0.5 h-3 w-3" />
                </a>
              }
            />
            <div className="mt-4 flex h-44 items-end gap-2">
              {ATTENDANCE_TREND.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm bg-brand-emerald"
                    style={{ height: `${(v - 80) * 5}%` }}
                  />
                  <span className="text-[10px] text-text-muted">
                    {["A","M","J","J","A","S","O","N","D","J","F","M"][i]}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-muted">
              Y-axis scale: 80–100%. Current month: <span className="font-semibold text-text-primary">96.4%</span>
            </p>
          </Card>
        </div>

        {/* Highlights */}
        <Card className="p-5">
          <SectionHeader
            eyebrow="AI highlights"
            title="What needs your attention"
            description="Generated from school-wide data. Click any item to drill in."
          />
          <ul className="mt-4 space-y-3">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <li
                  key={h.title}
                  className="flex items-start gap-3 rounded-md border border-surface-border bg-surface-card p-4"
                >
                  <span
                    className={
                      h.tone === "success"
                        ? "grid h-9 w-9 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700"
                        : h.tone === "warning"
                          ? "grid h-9 w-9 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-700"
                          : "grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-sky-light text-brand-royal"
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{h.title}</p>
                      <Badge variant={h.tone}>{h.tone}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">{h.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Module health */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-surface-border px-5 py-3.5">
            <SectionHeader
              eyebrow="Snapshot"
              title="Module health"
              description="A snapshot of operational health by module."
            />
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>This week</th>
                <th>vs last week</th>
                <th>Trend</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Admissions",  this: "182 apps",    delta: "+24%", tone: "success" as const, status: "Healthy" },
                { name: "Fees",        this: "₹3.6L coll.", delta: "+12%", tone: "success" as const, status: "Healthy" },
                { name: "Attendance",  this: "94.8%",       delta: "+0.6", tone: "success" as const, status: "Healthy" },
                { name: "Library",     this: "612 loans",   delta: "+48",  tone: "default" as const, status: "Steady"  },
                { name: "Transport",   this: "14 buses",    delta: "0",    tone: "warning" as const, status: "1 delay" },
                { name: "Exams",       this: "5 active",    delta: "+1",   tone: "default" as const, status: "Steady"  },
              ].map((m) => (
                <tr key={m.name}>
                  <td className="font-medium text-text-primary">{m.name}</td>
                  <td className="tabular-nums">{m.this}</td>
                  <td className="tabular-nums text-text-secondary">{m.delta}</td>
                  <td>
                    <div className="flex h-5 items-end gap-0.5">
                      {[3, 5, 4, 7, 6, 8, 9].map((v, i) => (
                        <span key={i} className="w-1 rounded-sm bg-surface-border" style={{ height: `${v * 10}%` }} />
                      ))}
                    </div>
                  </td>
                  <td><Badge variant={m.tone}>{m.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </main>
  );
}
