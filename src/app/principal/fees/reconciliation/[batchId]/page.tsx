"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Link2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  PrincipalApiError,
  getReconciliationBatch,
  manuallyMatchReconciliationItem,
  markReconciliationItemMismatch,
  type ReconciliationBatch,
} from "@/lib/principalApi";
import { FeesSidebar } from "../../_components/Sidebar";
import { useFeesSession } from "../../_components/useFeesSession";
import { ToastContainer, type ToastItem } from "../../_components/ToastContainer";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  pending: "warning",
  matched: "success",
  mismatch: "warning",
  unmatched: "error",
};

const formatINRPaise = (paise: string | number) =>
  `₹${(Number(paise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function ReconciliationBatchDetailPage() {
  const params = useParams<{ batchId: string }>();
  const batchId = params?.batchId;
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [batch, setBatch] = useState<ReconciliationBatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [matchInputs, setMatchInputs] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const refresh = useCallback(async () => {
    if (!token || !batchId) return;
    setIsLoading(true);
    try {
      setBatch(await getReconciliationBatch(token, batchId));
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [token, batchId, addToast]);

  useEffect(() => {
    if (token && batchId) void refresh();
  }, [token, batchId, refresh]);

  const handleMatch = useCallback(
    async (itemId: string) => {
      if (!token || !batchId) return;
      const txnId = matchInputs[itemId]?.trim();
      if (!txnId) {
        addToast("error", "Enter a fee transaction ID to match against");
        return;
      }
      setBusyItemId(itemId);
      try {
        await manuallyMatchReconciliationItem(token, batchId, itemId, txnId);
        addToast("success", "Item matched");
        await refresh();
      } catch (err) {
        addToast("error", err instanceof PrincipalApiError ? err.message : "Match failed");
      } finally {
        setBusyItemId(null);
      }
    },
    [token, batchId, matchInputs, addToast, refresh],
  );

  const handleMismatch = useCallback(
    async (itemId: string) => {
      if (!token || !batchId) return;
      const reason = window.prompt("Reason for marking mismatch? (optional)") ?? "";
      setBusyItemId(itemId);
      try {
        await markReconciliationItemMismatch(token, batchId, itemId, reason || undefined);
        addToast("success", "Item marked as mismatch");
        await refresh();
      } catch (err) {
        addToast("error", err instanceof PrincipalApiError ? err.message : "Failed");
      } finally {
        setBusyItemId(null);
      }
    },
    [token, batchId, addToast, refresh],
  );

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
          <Link
            href="/principal/fees/reconciliation"
            className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All batches
          </Link>

          {isLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
            </Card>
          ) : !batch ? (
            <Card className="p-6 text-sm text-text-muted">Batch not found.</Card>
          ) : (
            <>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted">Source</p>
                    <h1 className="mt-1 text-xl font-semibold text-text-primary">
                      {batch.source}
                    </h1>
                    <p className="mt-1 text-xs text-text-muted">
                      Statement{" "}
                      {batch.statementDate
                        ? new Date(batch.statementDate).toLocaleDateString("en-IN")
                        : "—"}{" "}
                      · Uploaded {new Date(batch.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[batch.status] ?? "default"}>
                    {batch.status}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <Tile label="Items" value={String(batch.itemCount)} tone="text-text-primary" />
                  <Tile
                    label="Matched"
                    value={`${batch.matchedCount}/${batch.itemCount}`}
                    tone="text-emerald-700"
                  />
                  <Tile
                    label="Total"
                    value={formatINRPaise(batch.totalAmountInPaise)}
                    tone="text-text-primary"
                  />
                  <Tile
                    label="Matched amount"
                    value={formatINRPaise(batch.matchedAmountInPaise)}
                    tone="text-emerald-700"
                  />
                </div>
              </Card>

              <Card className="overflow-x-auto p-0">
                <h3 className="px-4 py-3 text-sm font-semibold text-text-primary">Items</h3>
                {!batch.items || batch.items.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-text-muted">
                    Batch has no items.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Payment ID / UTR</th>
                        <th className="px-4 py-3">Payer</th>
                        <th className="px-4 py-3">Paid on</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 last:border-0 align-top">
                          <td className="px-4 py-3">
                            <Badge variant={STATUS_VARIANT[item.status] ?? "default"}>
                              {item.status}
                            </Badge>
                            {item.mismatchReason && (
                              <p className="mt-1 text-xs text-rose-600">
                                {item.mismatchReason}
                              </p>
                            )}
                            {item.feeTransactionId && (
                              <p className="mt-1 text-xs text-text-muted">
                                ↔ {item.feeTransactionId.slice(0, 12)}…
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                            {item.externalPaymentId ?? item.utrNumber ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {item.payerName ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {item.paidAt
                              ? new Date(item.paidAt).toLocaleDateString("en-IN")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-text-secondary">
                            {formatINRPaise(item.amountInPaise)}
                          </td>
                          <td className="px-4 py-3">
                            {item.status === "matched" ? (
                              <span className="text-xs text-emerald-700">✓ matched</span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Label
                                    htmlFor={`m-${item.id}`}
                                    className="sr-only text-xs"
                                  >
                                    Fee txn ID
                                  </Label>
                                  <Input
                                    id={`m-${item.id}`}
                                    placeholder="FeeTransaction id"
                                    value={matchInputs[item.id] ?? ""}
                                    onChange={(e) =>
                                      setMatchInputs((prev) => ({
                                        ...prev,
                                        [item.id]: e.target.value,
                                      }))
                                    }
                                    className="h-8 w-48 font-mono text-xs"
                                  />
                                  <Button
                                    onClick={() => void handleMatch(item.id)}
                                    disabled={busyItemId === item.id}
                                    className="h-8 px-2 text-xs"
                                  >
                                    {busyItemId === item.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Link2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                                <Button
                                  variant="secondary"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => void handleMismatch(item.id)}
                                  disabled={busyItemId === item.id}
                                >
                                  <XCircle className="mr-1 h-3 w-3" /> Flag
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
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
