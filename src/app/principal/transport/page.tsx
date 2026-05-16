"use client";

import {
  AlertTriangle,
  Bus,
  CalendarDays,
  CheckCircle2,
  Gauge,
  MapPin,
  Plus,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageHero } from "@/components/shared/PageHero";
import { SectionHeader } from "@/components/shared/SectionHeader";

type RouteStatus = "In service" | "Delayed" | "Returned" | "Maintenance";

const ROUTES: {
  id: string;
  name: string;
  driver: string;
  bus: string;
  students: number;
  stops: number;
  pct: number;
  status: RouteStatus;
}[] = [
  { id: "RT-01", name: "North campus loop",   driver: "Mr. R. Kumar",  bus: "BUS-401", students: 38, stops: 12, pct: 78,  status: "In service"   },
  { id: "RT-02", name: "East suburbs",        driver: "Mr. A. Mehta",  bus: "BUS-402", students: 42, stops: 14, pct: 65,  status: "In service"   },
  { id: "RT-03", name: "South-west express",  driver: "Mr. S. Naidu",  bus: "BUS-403", students: 36, stops: 10, pct: 45,  status: "Delayed"      },
  { id: "RT-04", name: "Riverfront loop",     driver: "Ms. L. Pinto",  bus: "BUS-404", students: 30, stops: 9,  pct: 100, status: "Returned"     },
  { id: "RT-05", name: "Downtown shuttle",    driver: "Mr. T. Khan",   bus: "BUS-405", students: 28, stops: 8,  pct: 30,  status: "In service"   },
  { id: "RT-06", name: "Hill route",          driver: "Mr. M. Joshi",  bus: "BUS-406", students: 22, stops: 7,  pct: 0,   status: "Maintenance"  },
];

const STATUS_TONE: Record<RouteStatus, "success" | "warning" | "default" | "error"> = {
  "In service": "success",
  "Delayed": "warning",
  "Returned": "default",
  "Maintenance": "error",
};

const PINS = [
  { top: "20%", left: "12%", tone: "bg-brand-royal",    id: "BUS-401" },
  { top: "55%", left: "32%", tone: "bg-emerald-600",    id: "BUS-402" },
  { top: "30%", left: "62%", tone: "bg-amber-500",      id: "BUS-403" },
  { top: "65%", left: "78%", tone: "bg-brand-royal",    id: "BUS-405" },
];

const NEXT_PICKUPS = [
  { stop: "Greenwood Crossing", time: "07:42", n: 4 },
  { stop: "Lakeview Heights",   time: "07:48", n: 3 },
  { stop: "Maple Avenue",       time: "07:55", n: 5 },
  { stop: "Hilltop School Gate",time: "08:10", n: 8, last: true },
];

export default function TransportPage() {
  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={Bus}
          eyebrow="Transport"
          title="Routes & live tracking"
          description="Monitor bus routes in real time, pickup progress, and fleet maintenance."
          badges={[
            { label: "14 buses on road", tone: "live" },
            { label: "486 students" },
          ]}
          actions={
            <>
              <Button variant="secondary">
                <CalendarDays className="mr-1.5 h-4 w-4" />
                Today's roster
              </Button>
              <Button variant="pay">
                <Plus className="mr-1.5 h-4 w-4" />
                Add route
              </Button>
            </>
          }
        />

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Buses on road"       value="14" icon={Bus}         tone="emerald" meta="of 18 fleet" />
          <StatCard label="In maintenance"      value="3"  icon={Wrench}      tone="amber"   meta="2 scheduled service" />
          <StatCard label="Avg. occupancy"      value="82%" icon={Gauge}      tone="brand"   meta="↑ 4% vs last week" />
          <StatCard label="Delays this week"    value="5"  icon={AlertTriangle} tone="rose"  meta="2 weather-related" />
        </section>

        {/* Map + pickups */}
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="overflow-hidden p-0 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
              <SectionHeader
                eyebrow="Live"
                title="Route status"
                description="Real-time bus positions · Updated 30s ago"
              />
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  14 in service
                </span>
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  1 delayed
                </span>
              </div>
            </div>

            <div className="relative m-5 h-72 overflow-hidden rounded-md border border-surface-border bg-surface-muted">
              <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(20,19,15,0.06)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <path d="M 0 180 Q 200 60 400 200 T 800 160" stroke="rgba(11,110,95,0.35)" strokeWidth="3" fill="none" strokeDasharray="6 6" />
                <path d="M 80 0 L 80 320 M 320 0 L 320 320 M 560 0 L 560 320" stroke="rgba(20,19,15,0.10)" strokeWidth="2" fill="none" />
              </svg>

              {PINS.map((p) => (
                <div
                  key={p.id}
                  className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
                  style={{ top: p.top, left: p.left }}
                >
                  <div className={`grid h-9 w-9 place-items-center rounded-full text-white shadow-md ${p.tone}`}>
                    <Bus className="h-4 w-4" />
                  </div>
                  <span className="mt-1 rounded-md bg-surface-card px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-primary shadow-sm">
                    {p.id}
                  </span>
                </div>
              ))}

              <div className="absolute bottom-3 left-3 rounded-md border border-surface-border bg-surface-card/90 px-3 py-1.5 text-xs text-text-secondary backdrop-blur">
                Showing 4 of 14 active buses
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <div className="border-b border-surface-border px-5 py-3.5">
              <SectionHeader eyebrow="RT-01 · North loop" title="Next pickups" />
            </div>
            <ul>
              {NEXT_PICKUPS.map((s) => (
                <li
                  key={s.stop}
                  className="flex items-start gap-3 border-b border-surface-divider px-5 py-3 last:border-b-0"
                >
                  <div className="relative mt-1 h-2 w-2 rounded-full bg-brand-royal">
                    {!s.last && (
                      <span className="absolute left-1/2 top-3 h-8 w-px -translate-x-1/2 bg-surface-divider" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{s.stop}</p>
                    <p className="text-xs text-text-secondary">{s.n} students board</p>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-text-secondary">{s.time}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Route table */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-surface-border px-5 py-3.5">
            <SectionHeader
              eyebrow="Routes"
              title="All routes"
              description="Tap a route to view manifest and live trace."
            />
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Driver</th>
                <th>Bus #</th>
                <th>Students</th>
                <th>Stops</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ROUTES.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-sky-light text-brand-royal">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium text-text-primary">{r.name}</p>
                        <p className="font-mono text-[11px] text-text-muted">{r.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-text-secondary">{r.driver}</td>
                  <td className="font-mono text-xs">{r.bus}</td>
                  <td className="tabular-nums">{r.students}</td>
                  <td className="tabular-nums">{r.stops}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-muted">
                        <div className="h-full rounded-full bg-brand-royal" style={{ width: `${r.pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{r.pct}%</span>
                    </div>
                  </td>
                  <td><Badge variant={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </main>
  );
}
