"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Play, Inbox } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import {
  PrincipalApiError,
  executeRefund,
  listRefunds,
  reviewRefund,
  type FeeRefund,
  type FeeRefundStatus,
} from "@/lib/principalApi";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";
import { ToastContainer, nextToastId, type ToastItem } from "../_components/ToastContainer";

const STATUS_FILTERS: { value: FeeRefundStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "executed", label: "Executed" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
];

const STATUS_VARIANT: Record<FeeRefundStatus, "default" | "warning" | "success" | "error" | "info"> = {
  pending: "warning",
  approved: "info",
  executed: "success",
  rejected: "error",
  failed: "error",
  cancelled: "default",
};

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function RefundsPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [refunds, setRefunds] = useState<FeeRefund[]>([]);
  const [status, setStatus] = useState<FeeRefundStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = nextToastId();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await listRefunds(token, status ? { status } : undefined);
      setRefunds(data.data);
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [token, status, addToast]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  const handleReview = useCallback(
    async (refund: FeeRefund, approved: boolean) => {
      if (!token) return;
      setPendingId(refund.id);
      try {
        await reviewRefund(token, { refundId: refund.id, approved });
        addToast("success", approved ? "Refund approved" : "Refund rejected");
        await refresh();
      } catch (err) {
        addToast("error", err instanceof PrincipalApiError ? err.message : "Review failed");
      } finally {
        setPendingId(null);
      }
    },
    [token, addToast, refresh],
  );

  const handleExecute = useCallback(
    async (refund: FeeRefund) => {
      if (!token) return;
      setPendingId(refund.id);
      try {
        await executeRefund(token, refund.id, {
          refundReferenceId: refs[refund.id]?.trim() || undefined,
        });
        addToast("success", "Refund executed; ledger updated");
        await refresh();
      } catch (err) {
        addToast("error", err instanceof PrincipalApiError ? err.message : "Execute failed");
      } finally {
        setPendingId(null);
      }
    },
    [token, refs, addToast, refresh],
  );

  const grouped = useMemo(() => {
    return {
      pending: refunds.filter((r) => r.status === "pending"),
      approved: refunds.filter((r) => r.status === "approved"),
      done: refunds.filter((r) =>
        ["executed", "rejected", "failed", "cancelled"].includes(r.status),
      ),
    };
  }, [refunds]);

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
        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        />
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
                Fees & Accounts
              </p>
              <h1 className="mt-1 text-xl font-semibold text-text-primary">Refunds</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Review and execute refund requests. Execution posts a reversal entry to the
                ledger and recalculates account totals.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <Label htmlFor="rf-status">Status</Label>
                <Select
                  id="rf-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FeeRefundStatus | "")}
                  className="mt-1 h-9"
                >
                  {STATUS_FILTERS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
            </Card>
          ) : refunds.length === 0 ? (
            <Card className="p-12 text-center">
              <Inbox className="mx-auto h-6 w-6 text-text-muted" />
              <p className="mt-2 text-sm text-text-secondary">No refunds match the filter.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {(["pending", "approved", "done"] as const).map((group) => {
                const rows = grouped[group];
                if (rows.length === 0) return null;
                return (
                  <section key={group}>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                      {group === "pending"
                        ? "Awaiting Approval"
                        : group === "approved"
                          ? "Approved · Pending Execution"
                          : "Completed"}
                    </h2>
                    <div className="space-y-2">
                      {rows.map((refund) => {
                        const isWorking = pendingId === refund.id;
                        return (
                          <Card key={refund.id} className="p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={STATUS_VARIANT[refund.status]}>
                                    {refund.status}
                                  </Badge>
                                  <Badge variant="default">{refund.method}</Badge>
                                  <span className="text-sm font-semibold text-text-primary">
                                    {formatINR(refund.amount)}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-text-primary">{refund.reason}</p>
                                <p className="mt-1 text-xs text-text-muted">
                                  Requested by {refund.requestedBy?.name ?? "—"} ·{" "}
                                  {new Date(refund.createdAt).toLocaleString("en-IN")}
                                </p>
                                {refund.bankDetails && (
                                  <p className="mt-1 text-xs text-text-secondary">
                                    Bank/UPI: {refund.bankDetails}
                                  </p>
                                )}
                                {refund.refundReferenceId && (
                                  <p className="mt-1 text-xs text-text-secondary">
                                    Reference: {refund.refundReferenceId}
                                  </p>
                                )}
                                {refund.executionError && (
                                  <p className="mt-1 text-xs text-status-error">
                                    Error: {refund.executionError}
                                  </p>
                                )}
                              </div>
                            </div>

                            {refund.status === "pending" && (
                              <div className="mt-3 flex justify-end gap-2 border-t border-surface-border pt-3">
                                <Button
                                  variant="danger"
                                  disabled={isWorking}
                                  onClick={() => void handleReview(refund, false)}
                                >
                                  {isWorking ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="mr-1 h-4 w-4" />
                                  )}
                                  Reject
                                </Button>
                                <Button
                                  disabled={isWorking}
                                  onClick={() => void handleReview(refund, true)}
                                >
                                  {isWorking ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-1 h-4 w-4" />
                                  )}
                                  Approve
                                </Button>
                              </div>
                            )}

                            {refund.status === "approved" && (
                              <div className="mt-3 border-t border-surface-border pt-3">
                                <div className="flex flex-wrap items-end gap-2">
                                  <div className="flex-1 min-w-[200px]">
                                    <Label htmlFor={`ref-${refund.id}`}>
                                      Refund reference (gateway ID, cheque #, etc.)
                                    </Label>
                                    <Input
                                      id={`ref-${refund.id}`}
                                      value={refs[refund.id] ?? ""}
                                      onChange={(e) =>
                                        setRefs((prev) => ({ ...prev, [refund.id]: e.target.value }))
                                      }
                                      className="mt-1"
                                      placeholder="Optional"
                                    />
                                  </div>
                                  <Button
                                    className="btn-pay"
                                    disabled={isWorking}
                                    onClick={() => void handleExecute(refund)}
                                  >
                                    {isWorking ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Play className="mr-1 h-4 w-4" />
                                    )}
                                    Execute refund
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
