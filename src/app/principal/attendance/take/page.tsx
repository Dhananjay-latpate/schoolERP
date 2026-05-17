"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Save,
  Search,
  XCircle,
  Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHero } from "@/components/shared/PageHero";
import { cn } from "@/lib/utils";

type Status = "present" | "absent" | "late" | "excused";

type Student = {
  id: string;
  roll: string;
  name: string;
  guardianPhone: string;
  status: Status;
};

const SEED: Student[] = [
  { id: "STU-2026-0182", roll: "07", name: "Aarav Mehta",     guardianPhone: "+91 98 0001 1820", status: "present" },
  { id: "STU-2026-0192", roll: "08", name: "Bilal Anwar",     guardianPhone: "+91 98 0001 1921", status: "present" },
  { id: "STU-2026-0145", roll: "09", name: "Chen Wei",        guardianPhone: "+91 98 0001 1450", status: "absent"  },
  { id: "STU-2026-0167", roll: "10", name: "Diya Patel",      guardianPhone: "+91 98 0001 1671", status: "present" },
  { id: "STU-2026-0211", roll: "11", name: "Ezra Cohen",      guardianPhone: "+91 98 0002 1111", status: "late"    },
  { id: "STU-2026-0203", roll: "12", name: "Fatima Noor",     guardianPhone: "+91 98 0002 0303", status: "present" },
  { id: "STU-2026-0156", roll: "13", name: "Gabriel Lima",    guardianPhone: "+91 98 0001 5611", status: "present" },
  { id: "STU-2026-0188", roll: "14", name: "Hina Suzuki",     guardianPhone: "+91 98 0001 8888", status: "excused" },
  { id: "STU-2026-0174", roll: "15", name: "Idris Adebayo",   guardianPhone: "+91 98 0001 7474", status: "present" },
  { id: "STU-2026-0199", roll: "16", name: "Julia Romero",    guardianPhone: "+91 98 0001 9999", status: "present" },
  { id: "STU-2026-0211", roll: "17", name: "Kabir Banerjee",  guardianPhone: "+91 98 0002 1212", status: "present" },
  { id: "STU-2026-0220", roll: "18", name: "Lina Petrova",    guardianPhone: "+91 98 0002 2020", status: "present" },
];

const STATUS_META: Record<Status, { label: string; chip: string; dot: string; badge: "success" | "error" | "warning" | "info" }> = {
  present: { label: "Present", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", badge: "success" },
  absent:  { label: "Absent",  chip: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500",    badge: "error"   },
  late:    { label: "Late",    chip: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500",   badge: "warning" },
  excused: { label: "Excused", chip: "bg-brand-sky-light text-brand-royal border-brand-royal/20", dot: "bg-brand-royal", badge: "info" },
};

export default function TakeAttendancePage() {
  const [students, setStudents] = useState<Student[]>(SEED);

  const setStatus = (id: string, roll: string, status: Status) =>
    setStudents((s) =>
      s.map((x) => (x.id === id && x.roll === roll ? { ...x, status } : x)),
    );

  const markAll = (status: Status) =>
    setStudents((s) => s.map((x) => ({ ...x, status })));

  const counts = students.reduce(
    (acc, s) => ({ ...acc, [s.status]: (acc[s.status] ?? 0) + 1 }),
    { present: 0, absent: 0, late: 0, excused: 0 } as Record<Status, number>,
  );

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href="/principal/attendance"
          className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Back to attendance overview
        </Link>

        <PageHero
          icon={CalendarDays}
          eyebrow="Mark attendance"
          title="Grade 7 — Section B"
          description="Mark each student. Bulk-action available in the toolbar. Saves automatically every 30 seconds."
          badges={[
            { label: "Period 1 · 08:30 AM", tone: "live" },
            { label: "Dr. Anita Rao" },
          ]}
          actions={
            <Button variant="pay">
              <Save className="mr-1.5 h-4 w-4" />
              Submit
            </Button>
          }
        />

        {/* Toolbar */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button className="btn-ghost btn-sm">
                <ChevronDown className="mr-1 h-3.5 w-3.5" />
                Grade 7 — Section B
              </button>
              <span className="h-5 w-px bg-surface-divider" />
              <span className="text-sm text-text-secondary">
                {students.length} students
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-sm border border-surface-border bg-surface-card px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-text-muted" />
                <Input
                  placeholder="Find by name or roll…"
                  className="w-48 border-0 bg-transparent p-0 text-sm shadow-none focus:shadow-none"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={() => markAll("present")}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Mark all present
              </Button>
              <Button variant="ghost" size="sm" onClick={() => markAll("absent")}>
                <XCircle className="mr-1 h-3.5 w-3.5" />
                Mark all absent
              </Button>
            </div>
          </div>

          {/* Summary chips */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-surface-divider pt-4 sm:grid-cols-4">
            {(Object.keys(STATUS_META) as Status[]).map((s) => {
              const meta = STATUS_META[s];
              return (
                <div
                  key={s}
                  className="flex items-center justify-between rounded-md border border-surface-border bg-surface-muted/60 px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                    {meta.label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-text-primary">
                    {counts[s]}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Roster */}
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-surface-divider">
            {students.map((s) => {
              const meta = STATUS_META[s.status];
              return (
                <li
                  key={s.id + s.roll}
                  className="grid grid-cols-[40px_1fr_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-muted/50"
                >
                  <span className="text-center text-xs font-medium text-text-muted">
                    {s.roll}
                  </span>

                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-grid h-9 w-9 place-items-center rounded-full bg-brand-sky-light text-xs font-semibold text-brand-royal">
                      {s.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {s.name}
                      </p>
                      <p className="font-mono text-[11px] text-text-muted">
                        {s.id} · {s.guardianPhone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {(Object.keys(STATUS_META) as Status[]).map((opt) => {
                      const active = s.status === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setStatus(s.id, s.roll, opt)}
                          className={cn(
                            "rounded-sm border px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                            active
                              ? STATUS_META[opt].chip
                              : "border-transparent text-text-muted hover:bg-surface-muted hover:text-text-primary",
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    {s.status === "absent" && (
                      <button
                        className="ml-1 rounded-sm border border-surface-border bg-surface-card px-2 py-1 text-[11px] text-text-secondary hover:bg-surface-muted"
                        title="Notify guardian"
                      >
                        <Mail className="inline h-3 w-3" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between border-t border-surface-divider bg-surface-muted/40 px-5 py-3">
            <p className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Clock className="h-3.5 w-3.5" />
              Auto-saved 12:14 PM
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="info">{counts.present} present</Badge>
              <Badge variant="error">{counts.absent} absent</Badge>
              <Button variant="pay">
                <Save className="mr-1.5 h-4 w-4" />
                Submit attendance
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
