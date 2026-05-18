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
import { PayInstallmentButton } from "../_components/PayInstallmentButton";
import { useParentSession } from "../_components/useParentSession";

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function ParentFeesOverviewPage() {
  const { token, isChecking, signOut } = useParentSession();
  const [overview, setOverview] = useState<ParentOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

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
        {toast && (
          <Card
            className={`p-3 text-sm ${
              toast.kind === "success"
                ? "border-brand-emerald/25 bg-brand-emerald-light text-status-success"
                : "border-brand-rose/25 bg-brand-rose-light text-status-error"
            }`}
          >
            {toast.message}
          </Card>
        )}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
          </Card>
        ) : error ? (
          <Card className="border-brand-rose/25 bg-brand-rose-light p-4 text-sm text-status-error">
            {error}
          </Card>
        ) : !overview ? null : (
          <>
            <Card className="overflow-hidden p-0">
              <div className="brand-gradient p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                  Fee account
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {overview.studentName}
                </h1>
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
                <Tile label="Concessions" value={formatINR(overview.totalConcession)} tone="text-status-success" />
                <Tile label="Paid" value={formatINR(overview.totalPaid)} tone="text-brand-royal" />
                <Tile
                  label="Outstanding"
                  value={formatINR(overview.totalDue)}
                  tone={overview.totalDue > 0 ? "text-status-error" : "text-status-success"}
                />
              </div>
            </Card>

            {overview.totalDue > 0 ? (
              <Card className="border-brand-amber/30 bg-brand-amber-light p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-status-warning" />
                    <div>
                      <p className="text-sm font-semibold text-status-warning">
                        Pending payment of {formatINR(overview.totalDue)}
                      </p>
                      <p className="mt-0.5 text-xs text-status-warning">
                        View dues to pay individual installments online or at the school
                        counter.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/parent/fees/dues"
                    className="btn-primary btn-sm no-underline"
                  >
                    View dues <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            ) : (
              <Card className="border-brand-emerald/25 bg-brand-emerald-light p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-status-success" />
                  <p className="text-sm font-semibold text-status-success">
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
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-border px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {inst.name}
                          {inst.isCustom && (
                            <span className="ml-2 text-xs text-status-warning">(custom)</span>
                          )}
                        </p>
                        <p className="text-xs text-text-muted">Due {inst.dueDate}</p>
                        {!inst.isPaid && (inst.paidAmount ?? 0) > 0 && (
                          <p className="text-xs text-status-success">
                            {formatINR(inst.paidAmount ?? 0)} paid ·{" "}
                            {formatINR(inst.amount - (inst.paidAmount ?? 0))} left
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-text-primary">
                          {formatINR(inst.amount)}
                        </span>
                        {(() => {
                          const partial =
                            !inst.isPaid && (inst.paidAmount ?? 0) > 0;
                          return (
                            <Badge
                              variant={
                                inst.isPaid
                                  ? "success"
                                  : partial
                                    ? "info"
                                    : "warning"
                              }
                            >
                              {inst.isPaid
                                ? "Paid"
                                : partial
                                  ? "Partial"
                                  : "Pending"}
                            </Badge>
                          );
                        })()}
                        {!inst.isPaid && (
                          <PayInstallmentButton
                            token={token}
                            installmentId={inst.id}
                            studentName={overview.studentName}
                            amount={inst.amount - (inst.paidAmount ?? 0)}
                            onPaid={(receipt) => {
                              setToast({
                                kind: "success",
                                message: `Payment successful. Receipt: ${receipt}`,
                              });
                              void refresh();
                            }}
                            onError={(message) =>
                              setToast({ kind: "error", message })
                            }
                            label={`Pay ${formatINR(
                              inst.amount - (inst.paidAmount ?? 0),
                            )}`}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-semibold text-text-primary">Payment history</p>
                <p className="text-xs text-text-muted">
                  See every recorded payment and download receipts.
                </p>
              </div>
              <Link
                href="/parent/fees/history"
                className="inline-flex items-center rounded-md border border-surface-border px-3 py-1.5 text-sm font-medium text-brand-royal hover:bg-surface-muted"
              >
                View history →
              </Link>
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
