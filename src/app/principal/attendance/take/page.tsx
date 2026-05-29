"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  RefreshCcw,
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
  bulkMarkAttendance,
  getAttendanceOverview,
  getAttendanceRoster,
  type AttendanceOverviewRow,
  type AttendanceStatus,
  type RosterRow,
} from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

// The four core statuses surfaced in the grid (matches the UI mock).
const GRID_STATUSES: AttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "excused",
];

type StatusMeta = {
  label: string;
  chip: string;
  dot: string;
};

const STATUS_META: Record<AttendanceStatus, StatusMeta> = {
  present: {
    label: "Present",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  absent: {
    label: "Absent",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  late: {
    label: "Late",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  excused: {
    label: "Excused",
    chip: "bg-brand-sky-light text-brand-royal border-brand-royal/20",
    dot: "bg-brand-royal",
  },
  half_day: {
    label: "Half day",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
  on_leave: {
    label: "On leave",
    chip: "bg-slate-100 text-slate-700 border-slate-300",
    dot: "bg-slate-500",
  },
};

type RowState = RosterRow & { status: AttendanceStatus };

function todayISODate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

function TakeAttendanceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const queryClassId = searchParams.get("classId") ?? "";
  const queryDate = searchParams.get("date") ?? "";

  const [classId, setClassId] = useState(queryClassId);
  const [date, setDate] = useState(queryDate || todayISODate());

  const [classes, setClasses] = useState<AttendanceOverviewRow[]>([]);
  const [students, setStudents] = useState<RowState[]>([]);
  const [search, setSearch] = useState("");

  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Gate on mount.
  useEffect(() => {
    const existing = getPrincipalToken();
    if (!existing) {
      router.replace("/principal/login?next=%2Fprincipal%2Fattendance%2Ftake");
      return;
    }
    setToken(existing);
    setIsCheckingSession(false);
  }, [router]);

  const handleAuthError = (err: unknown): boolean => {
    if (
      err instanceof PrincipalApiError &&
      (err.status === 401 || err.status === 403)
    ) {
      clearPrincipalSession();
      router.replace("/principal/login?next=%2Fprincipal%2Fattendance%2Ftake");
      return true;
    }
    return false;
  };

  // Load the class list (for the selector) + default the selection.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      setIsLoadingClasses(true);
      try {
        const data = await getAttendanceOverview(token, date);
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setClasses(list);
        if (!classId && list.length > 0) {
          setClassId(list[0].classId);
        }
      } catch (err) {
        if (cancelled) return;
        if (handleAuthError(err)) return;
        // Non-fatal: the selector just stays empty; roster load reports issues.
      } finally {
        if (!cancelled) setIsLoadingClasses(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, date]);

  // Load the roster whenever the class or date changes.
  useEffect(() => {
    if (!token || !classId) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoadingRoster(true);
      setRosterError(null);
      setSaveState("idle");
      setSaveMessage(null);
      try {
        const roster = await getAttendanceRoster(token, classId, date);
        if (cancelled) return;
        setStudents(
          (Array.isArray(roster) ? roster : []).map((r) => ({
            ...r,
            // Default any unmarked student to "present".
            status: r.status ?? "present",
          })),
        );
      } catch (err) {
        if (cancelled) return;
        if (handleAuthError(err)) return;
        setRosterError(
          err instanceof Error ? err.message : "Failed to load roster",
        );
        setStudents([]);
      } finally {
        if (!cancelled) setIsLoadingRoster(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, classId, date]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((x) => (x.studentId === studentId ? { ...x, status } : x)),
    );
    setSaveState("idle");
    setSaveMessage(null);
  };

  const markAll = (status: AttendanceStatus) => {
    setStudents((prev) => prev.map((x) => ({ ...x, status })));
    setSaveState("idle");
    setSaveMessage(null);
  };

  const counts = useMemo(() => {
    const acc: Record<AttendanceStatus, number> = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      half_day: 0,
      on_leave: 0,
    };
    for (const s of students) acc[s.status] += 1;
    return acc;
  }, [students]);

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q),
    );
  }, [students, search]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.classId === classId) ?? null,
    [classes, classId],
  );

  const classLabel = selectedClass
    ? selectedClass.section
      ? `${selectedClass.className} — ${selectedClass.section}`
      : selectedClass.className
    : "Select a class";

  const handleSubmit = async () => {
    if (!token || !classId || students.length === 0) return;
    setSaveState("saving");
    setSaveMessage(null);
    try {
      await bulkMarkAttendance(token, {
        // Anchor the chosen calendar date to UTC midnight so the day the server
        // stores it (and buckets reads by) matches the date the user picked,
        // regardless of the viewer's timezone (e.g. IST) vs the server's (UTC).
        date: new Date(`${date}T00:00:00.000Z`).toISOString(),
        records: students.map((s) => ({
          studentId: s.studentId,
          status: s.status,
        })),
      });
      setSaveState("saved");
      setSaveMessage(`Attendance saved for ${students.length} students.`);
    } catch (err) {
      if (handleAuthError(err)) return;
      setSaveState("error");
      setSaveMessage(
        err instanceof Error ? err.message : "Failed to save attendance",
      );
    }
  };

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-bg px-4">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing roster...
        </div>
      </main>
    );
  }

  const canSubmit =
    !!classId &&
    students.length > 0 &&
    saveState !== "saving" &&
    !isLoadingRoster;

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
          title={classLabel}
          description="Set each student's status, then submit to save attendance for the day."
          badges={[
            { label: date, tone: "live" },
            {
              label: `${students.length} ${students.length === 1 ? "student" : "students"}`,
            },
          ]}
          actions={
            <Button variant="pay" onClick={handleSubmit} disabled={!canSubmit}>
              {saveState === "saving" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              {saveState === "saving" ? "Saving…" : "Submit"}
            </Button>
          }
        />

        {/* Toolbar */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-56"
                disabled={isLoadingClasses}
                aria-label="Select class"
              >
                {classes.length === 0 && (
                  <option value="">
                    {isLoadingClasses ? "Loading classes…" : "No classes"}
                  </option>
                )}
                {classes.map((c) => (
                  <option key={c.classId} value={c.classId}>
                    {c.section ? `${c.className} — ${c.section}` : c.className}
                  </option>
                ))}
              </Select>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-40"
                aria-label="Attendance date"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-sm border border-surface-border bg-surface-card px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-text-muted" />
                <Input
                  placeholder="Find by name or roll…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48 border-0 bg-transparent p-0 text-sm shadow-none focus:shadow-none"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => markAll("present")}
                disabled={students.length === 0}
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Mark all present
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAll("absent")}
                disabled={students.length === 0}
              >
                <XCircle className="mr-1 h-3.5 w-3.5" />
                Mark all absent
              </Button>
            </div>
          </div>

          {/* Summary chips */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-surface-divider pt-4 sm:grid-cols-4">
            {GRID_STATUSES.map((s) => {
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
          {isLoadingRoster ? (
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading roster…
            </div>
          ) : rosterError ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <AlertCircle className="h-6 w-6 text-rose-600" />
              <p className="text-sm font-medium text-text-primary">
                Could not load roster
              </p>
              <p className="max-w-md text-sm text-text-secondary">
                {rosterError}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDate((d) => d)}
              >
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : !classId ? (
            <div className="px-5 py-16 text-center text-sm text-text-secondary">
              Select a class to load its roster.
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
              <CalendarDays className="h-6 w-6 text-text-muted" />
              <p className="text-sm font-medium text-text-primary">
                No students in this class
              </p>
              <p className="max-w-md text-sm text-text-secondary">
                Enroll students into this class to mark their attendance.
              </p>
            </div>
          ) : visibleStudents.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-text-secondary">
              No students match your search.
            </div>
          ) : (
            <ul className="divide-y divide-surface-divider">
              {visibleStudents.map((s) => (
                <li
                  key={s.studentId}
                  className="grid grid-cols-[40px_1fr_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-muted/50"
                >
                  <span className="text-center text-xs font-medium text-text-muted">
                    {s.rollNumber}
                  </span>

                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-grid h-9 w-9 place-items-center rounded-full bg-brand-sky-light text-xs font-semibold text-brand-royal">
                      {initials(s.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {s.name}
                      </p>
                      <p className="font-mono text-[11px] text-text-muted">
                        {s.parentPhone ?? "No contact on file"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {GRID_STATUSES.map((opt) => {
                      const active = s.status === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setStatus(s.studentId, opt)}
                          className={cn(
                            "rounded-sm border px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                            active
                              ? STATUS_META[opt].chip
                              : "border-transparent text-text-muted hover:bg-surface-muted hover:text-text-primary",
                          )}
                        >
                          {STATUS_META[opt].label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {students.length > 0 && !isLoadingRoster && !rosterError && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-divider bg-surface-muted/40 px-5 py-3">
              <p className="flex items-center gap-1.5 text-xs">
                {saveState === "saving" && (
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </span>
                )}
                {saveState === "saved" && (
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {saveMessage}
                  </span>
                )}
                {saveState === "error" && (
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {saveMessage}
                  </span>
                )}
                {saveState === "idle" && (
                  <span className="text-text-secondary">
                    Not yet submitted for {date}.
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="info">{counts.present} present</Badge>
                <Badge variant="error">{counts.absent} absent</Badge>
                <Button
                  variant="pay"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {saveState === "saving" ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  {saveState === "saving" ? "Saving…" : "Submit attendance"}
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
        <main className="flex min-h-screen items-center justify-center bg-surface-bg px-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        </main>
      }
    >
      <TakeAttendanceInner />
    </Suspense>
  );
}
