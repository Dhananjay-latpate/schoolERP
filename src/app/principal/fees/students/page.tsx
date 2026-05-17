"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search, ChevronLeft, ChevronRight, Filter, Users } from "lucide-react";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  PrincipalApiError,
  listStudentFeeAccounts,
  type FeeAccountListItem,
} from "@/lib/principalApi";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const DUE_OPTIONS = [
  { value: "any", label: "All accounts" },
  { value: "due", label: "Outstanding only" },
  { value: "clear", label: "Cleared" },
] as const;

export default function StudentAccountsPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dueFilter, setDueFilter] = useState<"any" | "due" | "clear">("any");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<FeeAccountListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
        const result = await listStudentFeeAccounts(token, {
          search: debouncedSearch || undefined,
          dueFilter,
          page,
          limit: 25,
        });
        if (cancelled) return;
        setData(result.data);
        setTotal(result.total);
        setPages(result.pages);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof PrincipalApiError ? err.message : "Failed to load accounts";
        setError(msg);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, debouncedSearch, dueFilter, page]);

  const headerLine = useMemo(() => {
    if (total === 0) return "No accounts found";
    return `Showing ${data.length} of ${total} accounts`;
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
    <div className="flex">
      <FeesSidebar summary={summary} isLoading={isLoadingSummary} onSignOut={signOut} />
      <main className="flex-1 lg:ml-60">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
                Fees & Accounts
              </p>
              <h1 className="mt-1 text-xl font-semibold text-text-primary">
                Student Fee Accounts
              </h1>
              <p className="mt-1 text-sm text-text-secondary">{headerLine}</p>
            </div>
          </div>

          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-md border border-surface-border bg-white px-3">
                <Search className="h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by name, GR number, application ID…"
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
                  value={dueFilter}
                  onChange={(e) => {
                    setDueFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="w-44"
                >
                  {DUE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {error && (
            <Card className="border-brand-rose/25 bg-brand-rose-light p-3 text-sm text-status-error">{error}</Card>
          )}

          <Card className="overflow-x-auto p-0">
            {isLoading ? (
              <SkeletonTable rows={8} columns={7} />
            ) : data.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No accounts match"
                description="Try a different search term or clear the due-status filter."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3 text-right">Charged</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Due</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.map((account) => (
                    <tr key={account.id} className="border-b border-surface-divider last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{account.studentName}</p>
                        <p className="text-xs text-text-muted">
                          {account.applicationId ?? "—"}
                          {account.grNumber ? ` · GR ${account.grNumber}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {account.className ? (
                          <>
                            {account.className}
                            {account.section ? ` · ${account.section}` : ""}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary">
                        {formatINR(account.totalCharged)}
                      </td>
                      <td className="px-4 py-3 text-right text-status-success">
                        {formatINR(account.totalPaid)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          account.totalDue > 0 ? "text-status-error" : "text-status-success"
                        }`}
                      >
                        {formatINR(account.totalDue)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={account.totalDue === 0 ? "success" : "warning"}>
                          {account.totalDue === 0 ? "Cleared" : "Open"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/principal/fees/students/${account.id}`}
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
    </div>
  );
}
