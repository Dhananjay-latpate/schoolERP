"use client";

import { useState } from "react";
import {
  AlertCircle,
  Bell,
  BookOpen,
  Filter,
  Library as LibraryIcon,
  Plus,
  Search,
  Upload,
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

const BOOKS = [
  { title: "Introductory Algebra",       author: "K. Iyer",           category: "Mathematics",   copies: "12 / 15", available: true,  cover: "bg-brand-royal" },
  { title: "Fundamentals of Physics",    author: "Halliday & Resnick", category: "Sciences",      copies: "6 / 10",  available: true,  cover: "bg-brand-violet" },
  { title: "To Kill a Mockingbird",      author: "Harper Lee",        category: "Literature",    copies: "0 / 8",   available: false, cover: "bg-brand-emerald" },
  { title: "A Brief History of Time",    author: "Stephen Hawking",   category: "Sciences",      copies: "3 / 5",   available: true,  cover: "bg-brand-amber" },
  { title: "World History — Vol. II",    author: "R. Patel",          category: "Humanities",    copies: "9 / 12",  available: true,  cover: "bg-text-primary" },
  { title: "Python for Young Coders",    author: "M. Singh",          category: "Computer Sci.", copies: "2 / 6",   available: true,  cover: "bg-brand-royal" },
  { title: "Chemistry of Life",          author: "Dr. Hughes",        category: "Sciences",      copies: "4 / 8",   available: true,  cover: "bg-brand-emerald" },
  { title: "Atlas of the Ancient World", author: "L. Costa",          category: "Humanities",    copies: "0 / 3",   available: false, cover: "bg-brand-rose" },
];

const BORROWINGS = [
  { name: "Aarav Mehta",   id: "STU-2026-0182", book: "Introductory Algebra",       due: "May 22", status: "On loan",  tone: "info" as const },
  { name: "Sara Hassan",   id: "STU-2026-0181", book: "A Brief History of Time",    due: "May 18", status: "Due soon", tone: "warning" as const },
  { name: "Liam Bennett",  id: "STU-2026-0180", book: "Python for Young Coders",    due: "May 11", status: "Overdue",  tone: "error" as const },
  { name: "Priya Iyer",    id: "STU-2026-0179", book: "Chemistry of Life",          due: "May 30", status: "On loan",  tone: "info" as const },
  { name: "Noah Park",     id: "STU-2026-0178", book: "World History — Vol. II",    due: "May 09", status: "Overdue",  tone: "error" as const },
  { name: "Zara Khan",     id: "STU-2026-0177", book: "To Kill a Mockingbird",      due: "May 27", status: "On loan",  tone: "info" as const },
];

const CATEGORIES = ["All", "Mathematics", "Sciences", "Literature", "Humanities", "Computer Sci.", "Arts", "Reference"];

export default function LibraryPage() {
  const [cat, setCat] = useState("All");

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={LibraryIcon}
          eyebrow="Library"
          title="Catalog & lending"
          description="Browse the catalog, manage active loans, and follow up on overdue returns."
          badges={[
            { label: "4,218 titles", tone: "live" },
            { label: "12,840 copies" },
          ]}
          actions={
            <>
              <Button variant="secondary">
                <Upload className="mr-1.5 h-4 w-4" />
                Import catalog
              </Button>
              <Button variant="pay">
                <Plus className="mr-1.5 h-4 w-4" />
                Add title
              </Button>
            </>
          }
        />

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Titles"        value="4,218" icon={BookOpen} tone="brand"   meta="184 added this term" />
          <StatCard label="On loan"       value="612"   icon={LibraryIcon} tone="brand" meta="48 issued today" />
          <StatCard label="Overdue"       value="34"    icon={AlertCircle} tone="rose"  meta="6 sent reminders" />
          <StatCard label="Visits today"  value="186"   icon={Users2}     tone="emerald" meta="↑ 12% vs avg." />
        </section>

        {/* Catalog */}
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
            <SectionHeader
              eyebrow="Catalog"
              title="Browse titles"
              description="Search by title, author, or ISBN. Filter by category."
            />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-sm border border-surface-border bg-surface-card px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-text-muted" />
                <Input placeholder="Search catalog…" className="w-56 border-0 bg-transparent p-0 text-sm shadow-none focus:shadow-none" />
              </div>
              <Button variant="secondary" size="sm">
                <Filter className="mr-1 h-3.5 w-3.5" />
                Filter
              </Button>
            </div>
          </div>

          <div className="border-b border-surface-divider px-5 py-3">
            <TabPills
              tabs={CATEGORIES.map((c) => ({ key: c, label: c }))}
              active={cat}
              onChange={setCat}
            />
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {BOOKS.map((b) => (
              <div key={b.title} className="card-interactive flex gap-3 p-3">
                <div className={`relative h-24 w-16 shrink-0 rounded-sm ${b.cover}`}>
                  <div className="absolute inset-x-2 top-2 h-px bg-white/30" />
                  <div className="absolute inset-x-2 bottom-2 h-px bg-white/30" />
                  <p className="absolute inset-2 grid place-items-center text-center text-[10px] font-semibold leading-tight text-white">
                    {b.title.split(" ").slice(0, 3).join(" ")}
                  </p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-sm font-semibold text-text-primary">{b.title}</p>
                  <p className="text-xs text-text-secondary">{b.author}</p>
                  <p className="mt-1 text-[11px] text-text-muted">{b.category}</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <Badge variant={b.available ? "success" : "error"}>{b.copies}</Badge>
                    <button className="text-[11px] font-semibold text-brand-royal hover:underline">Issue</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Active borrowings */}
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
            <SectionHeader
              eyebrow="Borrowings"
              title="Active loans"
              description="34 overdue across 612 active loans."
            />
            <Button variant="secondary" size="sm">
              <Bell className="mr-1 h-3.5 w-3.5" />
              Remind overdue
            </Button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>ID</th>
                <th>Book</th>
                <th>Due</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {BORROWINGS.map((b) => (
                <tr key={b.id + b.book}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-sky-light text-xs font-semibold text-brand-royal">
                        {b.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                      </span>
                      <span className="font-medium text-text-primary">{b.name}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-text-muted">{b.id}</td>
                  <td className="text-text-secondary">{b.book}</td>
                  <td className="tabular-nums">{b.due}</td>
                  <td><Badge variant={b.tone}>{b.status}</Badge></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-ghost btn-sm">Return</button>
                      <button className="btn-ghost btn-sm">Renew</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </main>
  );
}
