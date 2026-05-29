"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCcw,
  Search,
  Users2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageHero } from "@/components/shared/PageHero";
import { SectionHeader } from "@/components/shared/SectionHeader";
import {
  PrincipalApiError,
  getStudents,
  type StudentListItem,
} from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

const PAGE_SIZE = 20;

function statusVariant(
  status: string,
): "success" | "warning" | "error" | "default" {
  const s = status.toLowerCase();
  if (s === "active" || s === "enrolled") return "success";
  if (s === "inactive" || s === "graduated") return "default";
  if (s === "suspended" || s === "withdrawn") return "error";
  return "warning";
}

export default function StudentsDirectoryPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [items, setItems] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search box value + the debounced term actually sent to the API.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");

  // Gate on mount.
  useEffect(() => {
    const existing = getPrincipalToken();
    if (!existing) {
      router.replace("/principal/login?next=%2Fprincipal%2Fstudents");
      return;
    }
    setToken(existing);
    setIsCheckingSession(false);
  }, [router]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getStudents(token, {
          search: search || undefined,
          section: section || undefined,
          status: status || undefined,
          page,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      } catch (err) {
        if (cancelled) return;
        if (
          err instanceof PrincipalApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          clearPrincipalSession();
          router.replace("/principal/login?next=%2Fprincipal%2Fstudents");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load students");
        setItems([]);
        setTotal(0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, search, section, status, page, router]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const hasFilters = useMemo(
    () => Boolean(search || section || status),
    [search, section, status],
  );

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-bg px-4">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing student directory...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHero
          icon={Users2}
          eyebrow="Students"
          title="Student directory"
          description="Search and browse enrolled students across classes and sections."
          badges={[
            {
              label: `${total.toLocaleString("en-IN")} ${total === 1 ? "student" : "students"}`,
            },
          ]}
        />

        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
            <SectionHeader
              eyebrow="Directory"
              title="All students"
              description="Tap a row to view the full student profile."
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 border-b border-surface-divider px-5 py-3">
            <div className="flex items-center gap-2 rounded-sm border border-surface-border bg-surface-card px-2.5 py-1.5 text-sm">
              <Search className="h-3.5 w-3.5 text-text-muted" />
              <Input
                placeholder="Name or roll number…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-56 border-0 bg-transparent p-0 text-sm shadow-none focus:shadow-none"
              />
            </div>
            <Input
              placeholder="Section"
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                setPage(1);
              }}
              className="w-28"
              aria-label="Filter by section"
            />
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-40"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="graduated">Graduated</option>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setSection("");
                  setStatus("");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading students…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <AlertCircle className="h-6 w-6 text-rose-600" />
              <p className="text-sm font-medium text-text-primary">
                Could not load students
              </p>
              <p className="max-w-md text-sm text-text-secondary">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p)}
              >
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
              <Users2 className="h-6 w-6 text-text-muted" />
              <p className="text-sm font-medium text-text-primary">
                No students found
              </p>
              <p className="max-w-md text-sm text-text-secondary">
                {hasFilters
                  ? "No students match your filters. Try clearing them."
                  : "No students have been enrolled yet."}
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Parent contact</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => {
                  const className = s.class
                    ? s.class.name
                    : (s.classId ?? "—");
                  const sectionLabel = s.section ?? s.class?.section ?? "—";
                  const phone = s.contactInfo?.phone ?? "—";
                  return (
                    <tr key={s.id}>
                      <td className="tabular-nums text-text-secondary">
                        {s.rollNumber}
                      </td>
                      <td>
                        <Link
                          href={`/principal/students/${encodeURIComponent(s.id)}`}
                          className="font-medium text-text-primary hover:text-brand-royal hover:underline"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="text-text-secondary">{className}</td>
                      <td className="text-text-secondary">{sectionLabel}</td>
                      <td className="font-mono text-[12px] text-text-muted">
                        {phone}
                      </td>
                      <td>
                        <Badge variant={statusVariant(s.status)}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/principal/students/${encodeURIComponent(s.id)}`}
                          className="inline-flex items-center text-xs font-semibold text-brand-royal hover:underline"
                        >
                          View
                          <ChevronRight className="ml-0.5 h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {!isLoading && !error && total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-divider bg-surface-muted/40 px-5 py-3 text-sm text-text-secondary">
              <span>
                Showing {rangeStart}–{rangeEnd} of{" "}
                {total.toLocaleString("en-IN")}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                  Previous
                </Button>
                <span className="tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
