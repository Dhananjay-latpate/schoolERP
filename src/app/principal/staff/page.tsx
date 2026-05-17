"use client";

import { useState } from "react";
import {
  CalendarOff,
  ChevronDown,
  Download,
  Filter,
  GraduationCap,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Plus,
  Search,
  Users2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { PageHero } from "@/components/shared/PageHero";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { TabPills } from "@/components/shared/TabPills";
import { cn } from "@/lib/utils";

type Staff = {
  name: string;
  role: "Teacher" | "HoD" | "Coordinator" | "Admin";
  dept: string;
  classes: number;
  exp: string;
  email: string;
  phone: string;
  status: "Available" | "In class" | "On leave";
};

const STAFF: Staff[] = [
  { name: "Dr. Anita Rao",        role: "HoD",         dept: "Mathematics",    classes: 6, exp: "12 yrs", email: "anita.rao@scholaris.edu",    phone: "+91 98 100 0001", status: "Available" },
  { name: "Mr. Bernard Wells",    role: "HoD",         dept: "Physics",        classes: 4, exp: "18 yrs", email: "bernard.wells@scholaris.edu",phone: "+91 98 100 0002", status: "In class"   },
  { name: "Ms. Carla Diaz",       role: "Teacher",     dept: "English Lit.",   classes: 5, exp: "7 yrs",  email: "carla.diaz@scholaris.edu",   phone: "+91 98 100 0003", status: "Available" },
  { name: "Mr. Devansh Kapoor",   role: "Teacher",     dept: "Computer Sci.",  classes: 3, exp: "5 yrs",  email: "devansh.k@scholaris.edu",    phone: "+91 98 100 0004", status: "On leave"  },
  { name: "Dr. Eleanor Hughes",   role: "HoD",         dept: "Biology",        classes: 4, exp: "22 yrs", email: "eleanor.h@scholaris.edu",    phone: "+91 98 100 0005", status: "Available" },
  { name: "Ms. Farah Siddiqui",   role: "Teacher",     dept: "Chemistry",      classes: 5, exp: "9 yrs",  email: "farah.s@scholaris.edu",      phone: "+91 98 100 0006", status: "In class"   },
  { name: "Mr. Gabriel Costa",    role: "Coordinator", dept: "PE & Sports",    classes: 8, exp: "14 yrs", email: "gabriel.c@scholaris.edu",    phone: "+91 98 100 0007", status: "Available" },
  { name: "Ms. Hannah Lee",       role: "Teacher",     dept: "Art & Design",   classes: 4, exp: "6 yrs",  email: "hannah.l@scholaris.edu",     phone: "+91 98 100 0008", status: "Available" },
  { name: "Mr. Rohit Patel",      role: "Teacher",     dept: "History",        classes: 4, exp: "11 yrs", email: "rohit.p@scholaris.edu",      phone: "+91 98 100 0009", status: "In class"   },
  { name: "Ms. Saira Khan",       role: "Teacher",     dept: "Geography",      classes: 3, exp: "8 yrs",  email: "saira.k@scholaris.edu",      phone: "+91 98 100 0010", status: "Available" },
  { name: "Mr. Tariq Adler",      role: "Teacher",     dept: "Music",          classes: 6, exp: "4 yrs",  email: "tariq.a@scholaris.edu",      phone: "+91 98 100 0011", status: "Available" },
  { name: "Ms. Vidya Nair",       role: "Admin",       dept: "Administration", classes: 0, exp: "10 yrs", email: "vidya.n@scholaris.edu",      phone: "+91 98 100 0012", status: "Available" },
];

const DEPTS = [
  { name: "Mathematics",    count: 14, color: "bg-brand-royal" },
  { name: "Sciences",       count: 22, color: "bg-emerald-600" },
  { name: "Languages",      count: 18, color: "bg-brand-violet" },
  { name: "Humanities",     count: 12, color: "bg-amber-600" },
  { name: "Arts & PE",      count: 16, color: "bg-rose-500" },
  { name: "Administration", count: 10, color: "bg-text-secondary" },
];

const ROLE_TONE: Record<Staff["role"], "info" | "violet" | "warning" | "default"> = {
  HoD: "info",
  Teacher: "default",
  Coordinator: "violet",
  Admin: "warning",
};

const STATUS_TONE: Record<Staff["status"], "success" | "info" | "warning"> = {
  Available: "success",
  "In class": "info",
  "On leave": "warning",
};

export default function StaffPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all"
      ? STAFF
      : STAFF.filter((s) => s.status.toLowerCase().includes(filter));

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={Users2}
          eyebrow="Staff"
          title="Teachers & administrative staff"
          description="Faculty directory, departmental composition, and live availability across the school."
          badges={[
            { label: "92 active staff", tone: "live" },
            { label: "8 departments" },
          ]}
          actions={
            <>
              <Button variant="secondary">
                <Download className="mr-1.5 h-4 w-4" />
                Roster
              </Button>
              <Button variant="pay">
                <Plus className="mr-1.5 h-4 w-4" />
                Add staff
              </Button>
            </>
          }
        />

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Available now" value="61"    icon={Users2}      tone="emerald" meta="of 92 active" />
          <StatCard label="In class"       value="24"    icon={GraduationCap} tone="brand" meta="across 24 sections" />
          <StatCard label="On leave"       value="5"     icon={CalendarOff} tone="amber"   meta="2 approved today" />
          <StatCard label="Substitution requests" value="2" icon={Filter} tone="rose" meta="awaiting your approval" />
        </section>

        {/* Department composition */}
        <Card className="p-5">
          <SectionHeader
            eyebrow="Departments"
            title="Composition"
            description="Faculty distribution across the school's 8 departments."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {DEPTS.map((d) => {
              const pct = Math.round((d.count / 92) * 100);
              return (
                <div key={d.name} className="rounded-md border border-surface-border bg-surface-card p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text-primary">{d.name}</span>
                    <span className="tabular-nums text-text-secondary">
                      {d.count} <span className="text-text-muted">· {pct}%</span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className={cn("h-full rounded-full", d.color)} style={{ width: `${pct * 3}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Directory */}
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
            <SectionHeader
              eyebrow="Directory"
              title="All staff"
              description="Click a row to view full profile, schedule and class assignments."
            />
            <div className="flex items-center gap-1 rounded-sm border border-surface-border bg-surface-card p-0.5">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-[6px]",
                  view === "grid" ? "bg-text-primary text-white" : "text-text-secondary hover:bg-surface-muted",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-[6px]",
                  view === "list" ? "bg-text-primary text-white" : "text-text-secondary hover:bg-surface-muted",
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-divider px-5 py-3">
            <TabPills
              tabs={[
                { key: "all", label: "All", count: STAFF.length },
                { key: "available", label: "Available", count: STAFF.filter((s) => s.status === "Available").length },
                { key: "in class", label: "In class", count: STAFF.filter((s) => s.status === "In class").length },
                { key: "leave", label: "On leave", count: STAFF.filter((s) => s.status === "On leave").length },
              ]}
              active={filter}
              onChange={setFilter}
            />
            <div className="flex items-center gap-2 rounded-sm border border-surface-border bg-surface-card px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-text-muted" />
              <Input placeholder="Search staff…" className="w-48 border-0 bg-transparent p-0 text-sm shadow-none focus:shadow-none" />
            </div>
          </div>

          {view === "grid" ? (
            <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((s) => (
                <div key={s.email} className="card-interactive p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-sky-light text-sm font-semibold text-brand-royal">
                        {s.name
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">{s.name}</p>
                        <p className="truncate text-xs text-text-secondary">{s.dept}</p>
                      </div>
                    </div>
                    <Badge variant={STATUS_TONE[s.status]}>{s.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant={ROLE_TONE[s.role]}>{s.role}</Badge>
                    <span className="text-xs text-text-muted">{s.exp} · {s.classes} classes</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-surface-divider pt-3">
                    <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary">
                      <Mail className="h-3 w-3" /> Email
                    </a>
                    <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary">
                      <Phone className="h-3 w-3" /> Call
                    </a>
                    <button className="btn-ghost btn-sm">
                      Profile <ChevronDown className="ml-1 h-3 w-3 -rotate-90" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Classes</th>
                  <th>Experience</th>
                  <th>Status</th>
                  <th className="text-right">Contact</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.email}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-sky-light text-xs font-semibold text-brand-royal">
                          {s.name
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <span className="font-medium text-text-primary">{s.name}</span>
                      </div>
                    </td>
                    <td><Badge variant={ROLE_TONE[s.role]}>{s.role}</Badge></td>
                    <td className="text-text-secondary">{s.dept}</td>
                    <td className="tabular-nums">{s.classes}</td>
                    <td className="text-text-secondary">{s.exp}</td>
                    <td><Badge variant={STATUS_TONE[s.status]}>{s.status}</Badge></td>
                    <td className="text-right">
                      <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 text-xs text-brand-royal hover:underline">
                        <Mail className="h-3 w-3" /> Email
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </main>
  );
}
