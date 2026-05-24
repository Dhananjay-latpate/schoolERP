"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  GraduationCap,
  Loader2,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero } from "@/components/shared/PageHero";
import {
  PrincipalApiError,
  listStudents,
  listClasses,
  type StudentListItem,
  type PrincipalClass,
} from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export default function StudentDirectoryPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [classId, setClassId] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [classes, setClasses] = useState<PrincipalClass[]>([]);
  const [data, setData] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = getPrincipalToken();
    if (!existing) {
      router.replace("/principal/login?next=%2Fprincipal%2Fstudents");
      return;
    }
    setToken(existing);
    setIsChecking(false);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    listClasses(token, undefined, true)
      .then(setClasses)
      .catch(() => setClasses([]));
  }, [token]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);
    setError("");
    (async () => {
      try {
        const result = await listStudents(token, {
          search: debouncedSearch || undefined,
          classId: classId !== "all" ? classId : undefined,
          status: status !== "all" ? status : undefined,
          page,
          limit: 25,
        });
        if (cancelled) return;
        setData(result.data);
        setTotal(result.total);
        setPages(result.pages);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) {
          clearPrincipalSession();
          router.replace("/principal/login?next=%2Fprincipal%2Fstudents");
          return;
        }
        setError(err instanceof PrincipalApiError ? err.message : "Failed to load students");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, debouncedSearch, classId, status, page, router]);

  const headerLine = useMemo(() => {
    if (total === 0) return "No students found";
    return `Showing ${data.length} of ${total} students`;
  }, [data.length, total]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-bg">
        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
      </main>
    );
  }
  if (!token) return null;

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={GraduationCap}
          eyebrow="Students"
          title="Student directory"
          description="Search and manage every enrolled student. Enroll approved applicants to grow the roster."
          badges={[{ label: `${total} enrolled`, tone: "live" }]}
          actions={
            <Link href="/principal/students/enroll" className="btn-pay">
              <UserPlus className="mr-1.5 h-4 w-4" />
              Enroll applicants
            </Link>
          }
        />

        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-surface-border bg-white px-3">
              <Search className="h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name, roll number, parent, phone…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="flex-1 border-0 bg-transparent py-2 text-sm outline-none placeholder:text-text-muted"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-text-muted" />
              <Select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setPage(1);
                }}
                className="w-48"
              >
                <option value="all">All classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                    {cls.section ? ` · ${cls.section}` : ""}
                  </option>
                ))}
              </Select>
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-40"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        {error && (
          <Card className="border-brand-rose/25 bg-brand-rose-light p-3 text-sm text-status-error">
            {error}
          </Card>
        )}

        <Card className="overflow-x-auto p-0">
          <p className="border-b border-surface-divider px-4 py-3 text-sm text-text-secondary">
            {headerLine}
          </p>
          {isLoading ? (
            <SkeletonTable rows={8} columns={5} />
          ) : data.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No students match"
              description="Try a different search or enroll approved applicants to populate the roster."
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3">Roll</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Guardian</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.map((student) => (
                  <tr key={student.id} className="border-b border-surface-divider last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      {student.rollNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{student.name}</p>
                      {student.grNumber && (
                        <p className="text-xs text-text-muted">GR {student.grNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {student.className ? (
                        <>
                          {student.className}
                          {student.section ? ` · ${student.section}` : ""}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <p>{student.parentName}</p>
                      <p className="text-xs text-text-muted">{student.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={student.status === "active" ? "success" : "default"}>
                        {student.status === "active" ? "Active" : student.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/principal/students/${student.id}`}
                        className="text-sm font-medium text-brand-royal hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {pages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-text-secondary">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Prev
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages || isLoading}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
