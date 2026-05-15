"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ParentApiError,
  getParentOverview,
  type ParentOverview,
} from "@/lib/parentFeesApi";
import { ParentHeader } from "../_components/ParentHeader";
import { useParentSession } from "../_components/useParentSession";

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function ParentFeesOverviewPage() {
  const { token, isChecking, signOut } = useParentSession();
  const [overview, setOverview] = useState<ParentOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setOverview(await getParentOverview(token));
    } catch (err) {
      setError(err instanceof ParentApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
      </main>
    );
  }
  if (!token) return null;

  return (
    <>
      <ParentHeader studentName={overview?.studentName ?? null} onSignOut={signOut} />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
          </Card>
        ) : error ? (
          <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </Card>
        ) : !overview ? null : (
          <>
            <Card className="overflow-hidden p-0">
              <div className="brand-gradient p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                  Fee account
                </p>
                <h1 className="mt-1 text-2xl font-bold">{overview.studentName}</h1>
                <p className="mt-1 text-sm text-white/80">
                  {overview.applicationId ?? "—"}
                  {overview.grNumber ? ` · GR ${overview.grNumber}` : ""}
                  {overview.className ? ` · ${overview.className}` : ""}
                  {overview.section ? ` ${overview.section}` : ""}
                </p>
                <Badge className="mt-3 bg-white/20 text-white">{overview.academicYear}</Badge>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-4">
                <Tile label="Total Charged" value={formatINR(overview.totalCharged)} tone="text-text-primary" />
                <Tile label="Concessions" value={formatINR(overview.totalConcession)} tone="text-emerald-700" />
                <Tile label="Paid" value={formatINR(overview.totalPaid)} tone="text-brand-royal" />
                <Tile
                  label="Outstanding"
                  value={formatINR(overview.totalDue)}
                  tone={overview.totalDue > 0 ? "text-rose-700" : "text-emerald-700"}
                />
              </div>
            </Card>

            {overview.totalDue > 0 ? (
              <Card className="border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-amber-700" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Pending payment of {formatINR(overview.totalDue)}
                      </p>
                      <p className="mt-0.5 text-xs text-amber-700">
                        View dues to pay individual installments online or at the school
                        counter.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/parent/fees/dues"
                    className="inline-flex items-center rounded-md bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800"
                  >
                    View dues <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            ) : (
              <Card className="border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <p className="text-sm font-semibold text-emerald-900">
                    All dues are cleared. Thank you!
                  </p>
                </div>
              </Card>
            )}

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-text-primary">Installments</h3>
              {overview.installments.length === 0 ? (
                <p className="mt-3 text-sm text-text-muted">No installments scheduled.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {overview.installments.map((inst) => (
                    <li
                      key={inst.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-surface-border px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {inst.name}
                          {inst.isCustom && (
                            <span className="ml-2 text-xs text-amber-700">(custom)</span>
                          )}
                        </p>
                        <p className="text-xs text-text-muted">Due {inst.dueDate}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-text-primary">
                          {formatINR(inst.amount)}
                        </span>
                        <Badge variant={inst.isPaid ? "success" : "warning"}>
                          {inst.isPaid ? "Paid" : "Pending"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Recent Payments</h3>
                <Link
                  href="/parent/fees/history"
                  className="text-xs font-medium text-brand-royal hover:underline"
                >
                  View all →
                </Link>
              </div>
            </Card>
          </>
        )}
      </main>
    </>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-3 text-center">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
