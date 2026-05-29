"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck2,
  Loader2,
  Mail,
  Phone,
  RefreshCcw,
  User,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/shared/PageHero";
import { SectionHeader } from "@/components/shared/SectionHeader";
import {
  PrincipalApiError,
  getStudent,
  type AttendanceStatus,
  type Student,
} from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

function rupees(amount: number): string {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const ATTENDANCE_BADGE: Record<
  AttendanceStatus,
  "success" | "error" | "warning" | "info" | "violet" | "default"
> = {
  present: "success",
  absent: "error",
  late: "warning",
  excused: "info",
  half_day: "violet",
  on_leave: "default",
};

function statusVariant(
  status: string,
): "success" | "warning" | "error" | "default" {
  const s = status.toLowerCase();
  if (s === "active" || s === "enrolled") return "success";
  if (s === "inactive" || s === "graduated") return "default";
  if (s === "suspended" || s === "withdrawn") return "error";
  return "warning";
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [token, setToken] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Gate on mount.
  useEffect(() => {
    const existing = getPrincipalToken();
    if (!existing) {
      router.replace(
        `/principal/login?next=${encodeURIComponent(`/principal/students/${id}`)}`,
      );
      return;
    }
    setToken(existing);
    setIsCheckingSession(false);
  }, [router, id]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await getStudent(token, id);
        if (!cancelled) setStudent(data);
      } catch (err) {
        if (cancelled) return;
        if (
          err instanceof PrincipalApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          clearPrincipalSession();
          router.replace(
            `/principal/login?next=${encodeURIComponent(`/principal/students/${id}`)}`,
          );
          return;
        }
        if (err instanceof PrincipalApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load student");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, id, router]);

  const feeTotals = useMemo(() => {
    const accounts = student?.feeAccounts ?? [];
    return accounts.reduce(
      (acc, a) => ({
        charged: acc.charged + (a.totalCharged ?? 0),
        paid: acc.paid + (a.totalPaid ?? 0),
        due: acc.due + (a.totalDue ?? 0),
      }),
      { charged: 0, paid: 0, due: 0 },
    );
  }, [student]);

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-bg px-4">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing student profile...
        </div>
      </main>
    );
  }

  const backLink = (
    <Link
      href="/principal/students"
      className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
    >
      <ArrowLeft className="mr-1 h-3.5 w-3.5" />
      Back to student directory
    </Link>
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {backLink}
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading student…
          </div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {backLink}
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <User className="h-7 w-7 text-text-muted" />
            <p className="text-base font-semibold text-text-primary">
              Student not found
            </p>
            <p className="max-w-md text-sm text-text-secondary">
              This student may have been removed, or the link is incorrect.
            </p>
            <Link href="/principal/students" className="btn-secondary btn-sm">
              Go to directory
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  if (error || !student) {
    return (
      <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {backLink}
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <AlertCircle className="h-7 w-7 text-rose-600" />
            <p className="text-base font-semibold text-text-primary">
              Could not load student
            </p>
            <p className="max-w-md text-sm text-text-secondary">
              {error ?? "An unexpected error occurred."}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setToken((t) => t)}
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  const className = student.class
    ? student.section || student.class.section
      ? `${student.class.name} — ${student.section ?? student.class.section}`
      : student.class.name
    : "Unassigned";
  const contact = student.contactInfo;
  const recent = student.recentAttendance ?? [];

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {backLink}

        <PageHero
          icon={User}
          eyebrow="Student profile"
          title={student.name}
          description={`Roll ${student.rollNumber} · ${className}`}
          badges={[{ label: student.status }]}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile */}
          <Card className="p-5 lg:col-span-1">
            <SectionHeader eyebrow="Profile" title="Details" />
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-muted">Roll number</dt>
                <dd className="font-medium tabular-nums text-text-primary">
                  {student.rollNumber}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-muted">Class</dt>
                <dd className="font-medium text-text-primary">{className}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-muted">Status</dt>
                <dd>
                  <Badge variant={statusVariant(student.status)}>
                    {student.status}
                  </Badge>
                </dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-surface-divider pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Parent / guardian
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex items-center gap-2 text-text-primary">
                  <User className="h-3.5 w-3.5 text-text-muted" />
                  {contact?.parentName || "—"}
                </p>
                <p className="flex items-center gap-2 text-text-secondary">
                  <Phone className="h-3.5 w-3.5 text-text-muted" />
                  {contact?.phone || "—"}
                </p>
                <p className="flex items-center gap-2 text-text-secondary">
                  <Mail className="h-3.5 w-3.5 text-text-muted" />
                  {contact?.email || "—"}
                </p>
              </div>
            </div>
          </Card>

          {/* Fee summary + attendance */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="p-5">
              <SectionHeader
                eyebrow="Fees"
                title="Fee summary"
                description="Across all linked fee accounts."
              />
              {(student.feeAccounts ?? []).length === 0 ? (
                <div className="mt-4 flex items-center gap-2 rounded-md border border-surface-border bg-surface-muted/50 px-4 py-6 text-sm text-text-secondary">
                  <Wallet className="h-4 w-4 text-text-muted" />
                  No fee accounts linked to this student.
                </div>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-surface-border bg-surface-muted/50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-text-muted">
                        Charged
                      </p>
                      <p className="mt-1 text-lg font-bold text-text-primary">
                        {rupees(feeTotals.charged)}
                      </p>
                    </div>
                    <div className="rounded-md border border-surface-border bg-surface-muted/50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-text-muted">
                        Paid
                      </p>
                      <p className="mt-1 text-lg font-bold text-emerald-700">
                        {rupees(feeTotals.paid)}
                      </p>
                    </div>
                    <div className="rounded-md border border-surface-border bg-surface-muted/50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-text-muted">
                        Due
                      </p>
                      <p
                        className={
                          feeTotals.due > 0
                            ? "mt-1 text-lg font-bold text-rose-700"
                            : "mt-1 text-lg font-bold text-text-primary"
                        }
                      >
                        {rupees(feeTotals.due)}
                      </p>
                    </div>
                  </div>
                  {(student.feeAccounts ?? []).length > 1 && (
                    <p className="mt-3 text-xs text-text-muted">
                      {(student.feeAccounts ?? []).length} fee accounts
                      combined.
                    </p>
                  )}
                </>
              )}
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="border-b border-surface-border px-5 py-3.5">
                <SectionHeader
                  eyebrow="Attendance"
                  title="Recent attendance"
                  description="Most recent marked days for this student."
                />
              </div>
              {recent.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                  <CalendarCheck2 className="h-6 w-6 text-text-muted" />
                  <p className="text-sm font-medium text-text-primary">
                    No attendance records yet
                  </p>
                  <p className="max-w-md text-sm text-text-secondary">
                    Attendance marked for this student will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-surface-divider">
                  {recent.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">
                          {formatDate(a.date)}
                        </p>
                        {a.remarks && (
                          <p className="truncate text-xs text-text-muted">
                            {a.remarks}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={ATTENDANCE_BADGE[a.status] ?? "default"}
                      >
                        {a.status.replace("_", " ")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
