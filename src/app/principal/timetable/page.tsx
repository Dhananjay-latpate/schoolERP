"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/shared/PageHero";
import { TabPills } from "@/components/shared/TabPills";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "success" | "warning" | "dark";
type Slot = { subject: string; teacher: string; room: string; tone: Tone };

const slot = (subject: string, teacher: string, room: string, tone: Tone = "neutral"): Slot => ({
  subject,
  teacher,
  room,
  tone,
});

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const periods = [
  { time: "08:30 – 09:20", label: "P1" },
  { time: "09:25 – 10:15", label: "P2" },
  { time: "10:20 – 11:10", label: "P3" },
  { time: "11:15 – 12:05", label: "P4" },
  { time: "12:10 – 13:00", label: "Break", isBreak: true },
  { time: "13:00 – 13:50", label: "P5" },
  { time: "13:55 – 14:45", label: "P6" },
];

const grid: (Slot | null)[][] = [
  [slot("Mathematics","Dr. Rao","204","dark"),       slot("English Lit.","Ms. Diaz","108"),       slot("Physics","Mr. Wells","Lab-2","info"),     slot("History","Mr. Patel","211"),         slot("Mathematics","Dr. Rao","204","dark"),  slot("Library hour","—","Library")],
  [slot("Physics","Mr. Wells","Lab-2","info"),       slot("Mathematics","Dr. Rao","204","dark"),  slot("Chemistry","Ms. Siddiqui","Chem-1","success"), slot("Geography","Ms. Khan","210"), slot("Biology","Dr. Hughes","Bio-1","success"), slot("English Lit.","Ms. Diaz","108")],
  [slot("English Lit.","Ms. Diaz","108"),             slot("Computer Sci.","Mr. Kapoor","Comp-1","info"), slot("Mathematics","Dr. Rao","204","dark"), slot("Chemistry","Ms. Siddiqui","Chem-1","success"), slot("Computer Sci.","Mr. Kapoor","Comp-1","info"), slot("Art","Ms. Lee","Art-1","warning")],
  [slot("History","Mr. Patel","211"),                 slot("Physics","Mr. Wells","Lab-2","info"),  slot("English Lit.","Ms. Diaz","108"),         slot("Mathematics","Dr. Rao","204","dark"), slot("Geography","Ms. Khan","210"), slot("PE","Mr. Costa","Gym-2","warning")],
  [null, null, null, null, null, null],
  [slot("Biology","Dr. Hughes","Bio-1","success"),   slot("History","Mr. Patel","211"),           slot("PE","Mr. Costa","Gym-2","warning"),       slot("English Lit.","Ms. Diaz","108"),     slot("Mathematics","Dr. Rao","204","dark"), slot("Chemistry","Ms. Siddiqui","Chem-1","success")],
  [slot("Art","Ms. Lee","Art-1","warning"),          slot("Music","Mr. Adler","Music"),           slot("Library","—","Library"),                  slot("Computer Sci.","Mr. Kapoor","Comp-1","info"), slot("Sports","Mr. Costa","Field","warning"), slot("Club hour","—","Various")],
];

const TONE: Record<Tone, string> = {
  neutral: "bg-surface-card border-surface-border text-text-primary",
  info:    "bg-brand-sky-light border-brand-royal/20 text-brand-royal",
  success: "bg-brand-emerald-light border-brand-emerald/25 text-brand-emerald",
  warning: "bg-brand-amber-light border-brand-amber/25 text-brand-amber",
  dark:    "bg-text-primary border-text-primary text-white",
};

export default function TimetablePage() {
  const [view, setView] = useState<"class" | "teacher" | "room">("class");

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={CalendarDays}
          eyebrow="Timetable"
          title="Grade 7 — Section B"
          description="Weekly class schedule. Use the view switcher to inspect by teacher or room."
          badges={[
            { label: "Week 21 · May 13 – 18", tone: "live" },
            { label: "Published" },
          ]}
          actions={
            <>
              <Button variant="secondary">
                <Download className="mr-1.5 h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="pay">
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit timetable
              </Button>
            </>
          }
        />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabPills
            tabs={[
              { key: "class", label: "Class view" },
              { key: "teacher", label: "Teacher view" },
              { key: "room", label: "Room view" },
            ]}
            active={view}
            onChange={(k) => setView(k as typeof view)}
          />

          <div className="flex items-center gap-1 rounded-sm border border-surface-border bg-surface-card p-0.5">
            <button className="grid h-8 w-8 place-items-center text-text-secondary hover:bg-surface-muted">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-xs font-medium tabular-nums text-text-primary">
              Week 21 · 2026
            </span>
            <button className="grid h-8 w-8 place-items-center text-text-secondary hover:bg-surface-muted">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span className="h-2 w-3 rounded-sm bg-text-primary" />
              Core
            </span>
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span className="h-2 w-3 rounded-sm bg-brand-emerald-light" />
              Sciences
            </span>
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span className="h-2 w-3 rounded-sm bg-brand-sky-light" />
              Specialist
            </span>
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span className="h-2 w-3 rounded-sm bg-brand-amber-light" />
              Activity
            </span>
          </div>
        </div>

        {/* Grid */}
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-[120px_repeat(6,_minmax(0,_1fr))] border-b border-surface-border bg-surface-muted">
            <div className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Period
            </div>
            {days.map((d, i) => (
              <div key={d} className={cn("border-l border-surface-divider px-4 py-3 text-center", i === 5 && "bg-brand-sky-light/40")}>
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{d}</p>
                <p className={cn("text-sm font-semibold", i === 5 ? "text-brand-royal" : "text-text-primary")}>
                  {13 + i}
                </p>
              </div>
            ))}
          </div>

          {periods.map((p, rowIdx) => (
            <div
              key={p.label}
              className="grid grid-cols-[120px_repeat(6,_minmax(0,_1fr))] border-b border-surface-divider last:border-b-0"
            >
              <div className="border-r border-surface-divider px-4 py-3">
                <p className="text-xs font-semibold text-text-primary">{p.label}</p>
                <p className="text-[10px] text-text-muted tabular-nums">{p.time}</p>
              </div>

              {p.isBreak
                ? days.map((d) => (
                    <div
                      key={d}
                      className="flex items-center justify-center border-l border-surface-divider bg-surface-muted/40 py-3 text-[11px] font-medium text-text-muted"
                    >
                      Lunch break
                    </div>
                  ))
                : grid[rowIdx].map((cell, colIdx) => (
                    <div key={colIdx} className="border-l border-surface-divider p-1.5">
                      {cell && (
                        <div className={cn("h-full rounded-sm border px-2.5 py-2", TONE[cell.tone])}>
                          <p className="text-xs font-semibold leading-tight">{cell.subject}</p>
                          <p className="mt-0.5 text-[10px] opacity-80">
                            {cell.teacher} · {cell.room}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
            </div>
          ))}
        </Card>

        <p className="flex items-center gap-1 text-xs text-text-muted">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          No conflicts detected · Last published by Ravi A. on May 12
        </p>
      </div>
    </main>
  );
}
