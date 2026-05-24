"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Save,
  Search,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageHero } from "@/components/shared/PageHero";
import { cn } from "@/lib/utils";
import {
  PrincipalApiError,
  getAttendanceRoster,
  listClasses,
  submitClassAttendance,
  type AttendanceRoster,
  type AttendanceRosterStatus,
  type PrincipalClass,
} from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

type Status = "present" | "absent" | "late" | "excused";

type RosterRow = {
  id: string;
  rollNumber: string;
  name: string;
  phone: string;
  status: AttendanceRosterStatus;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_META: Record<Status, { label: string; chip: string; dot: string }> = {
  present: { label: "Present", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  absent: { label: "Absent", chip: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  late: { label: "Late", chip: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  excused: { label: "Excused", chip: "bg-brand-sky-light text-brand-royal border-brand-royal/20", dot: "bg-brand-royal" },
};

const TOGGLES: Status[] = ["present", "absent", "late", "excused"];

function TakeAttendanceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId") ?? "";
  const initialDate = searchParams.get("date") ?? todayISO();

  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<PrincipalClass[]>([]);
  const [classId, setClassId] = useState(initialClassId);
  const [date, setDate] = useState(initialDate);

  const [roster, setRoster] = useState<AttendanceRoster | null>(null);
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const existing = getPrincipalToken();
    if (!existing) {
      router.replace("/principal/login?next=%2Fprincipal%2Fattendance%2Ftake");
      return;
    }
    setToken(existing);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    listClasses(token, undefined, true)
      .then((data) => {
        setClasses(data);
        if (!classId && data.length > 0) setClassId(data[0].id);
      })
      .catch(() => setClasses([]));
  }, [token, classId]);

  const loadRoster = useCallback(async () => {
    if (!token || !classId) return;
    setIsLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await getAttendanceRoster(token, classId, date);
      setRoster(data);
      setRows(
        data.students.map((s) => ({
          id: s.id,
          rollNumber: s.rollNumber,
          name: s.name,
          phone: s.phone,
          status: (s.status ?? "present") as AttendanceRosterStatus,
        })),
      );
    } catch (err) {
      if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) {
        clearPrincipalSession();
        router.replace("/principal/login?next=%2Fprincipal%2Fattendance%2Ftake");
        return;
      }
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load roster");
      setRoster(null);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, classId, date, router]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const setStatus = (id: string, status: Status) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));

  const markAll = (status: Status) => setRows((rs) => rs.map((r) => ({ ...r, status })));

  const counts = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [rows],
  );

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.rollNumber.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const handleSubmit = async () => {
    if (!token || !classId || rows.length === 0) return;
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await submitClassAttendance(token, {
        classId,
        date,
        records: rows.map((r) => ({ studentId: r.id, status: r.status })),
      });
      setNotice(`Saved attendance for ${result.saved} student${result.saved === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to save attendance");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === classId);

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href="/principal/attendance"
          className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to attendance overview
        </Link>

        <PageHero
          icon={CalendarDays}
          eyebrow="Mark attendance"
          title={
            roster
              ? `${roster.class.name}${roster.class.section ? ` — ${roster.class.section}` : ""}`
              : selectedClass
                ? `${selectedClass.name}${selectedClass.section ? ` — ${selectedClass.section}` : ""}`
                : "Select a class"
          }
          description="Mark each student, then submit. Re-submitting updates the day's record."
          badges={[{ label: new Date(date).toDateString(), tone: "live" }]}
          actions={
            <Button variant="pay" onClick={handleSubmit} disabled={isSaving || rows.length === 0}>
              {isSaving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Submit
            </Button>
          }
        />

        {/* Controls */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-56"
              >
                <option value="" disabled>
                  Choose a class
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.section ? ` · ${c.section}` : ""}
                  </option>
                ))}
              </Select>
              <input
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className="input-base w-44"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-sm border border-surface-border bg-surface-card px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-text-muted" />
                <Input
                  placeholder="Find by name or roll…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-48 border-0 bg-transparent p-0 text-sm shadow-none focus:shadow-none"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={() => markAll("present")} disabled={rows.length === 0}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> All present
              </Button>
              <Button variant="ghost" size="sm" onClick={() => markAll("absent")} disabled={rows.length === 0}>
                <XCircle className="mr-1 h-3.5 w-3.5" /> All absent
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-surface-divider pt-4 sm:grid-cols-4">
            {TOGGLES.map((s) => {
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
                    {counts[s] ?? 0}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {notice && (
          <Card className="border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</Card>
        )}
        {error && (
          <Card className="border-brand-rose/25 bg-brand-rose-light p-3 text-sm text-status-error">
            {error}
          </Card>
        )}

        {/* Roster */}
        <Card className="overflow-hidden p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
            </div>
          ) : rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-text-secondary">
              {classId
                ? "No active students in this class yet."
                : "Choose a class to load its roster."}
            </p>
          ) : (
            <ul className="divide-y divide-surface-divider">
              {visibleRows.map((s) => (
                <li
                  key={s.id}
                  className="grid grid-cols-[40px_1fr_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-muted/50"
                >
                  <span className="text-center text-xs font-medium text-text-muted">
                    {s.rollNumber}
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
                      <p className="truncate text-sm font-medium text-text-primary">{s.name}</p>
                      <p className="font-mono text-[11px] text-text-muted">{s.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {TOGGLES.map((opt) => {
                      const active = s.status === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setStatus(s.id, opt)}
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
                  </div>
                </li>
              ))}
            </ul>
          )}

          {rows.length > 0 && (
            <div className="flex items-center justify-between border-t border-surface-divider bg-surface-muted/40 px-5 py-3">
              <p className="text-xs text-text-secondary">{rows.length} students</p>
              <div className="flex items-center gap-2">
                <Badge variant="success">{counts.present ?? 0} present</Badge>
                <Badge variant="error">{counts.absent ?? 0} absent</Badge>
                <Button variant="pay" onClick={handleSubmit} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  Submit attendance
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

export default function TakeAttendancePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-surface-bg">
          <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
        </main>
      }
    >
      <TakeAttendanceInner />
    </Suspense>
  );
}
