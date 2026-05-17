"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Inbox, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import {
  PrincipalApiError,
  listPendingApprovals,
  reviewConcession,
  reviewLateFeeWaiver,
  type PendingFeeApproval,
} from "@/lib/principalApi";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";
import { ToastContainer, nextToastId, type ToastItem } from "../_components/ToastContainer";

type FilterTab = "all" | "concession" | "late_fee_waiver" | "custom_installment";

const TYPE_LABEL: Record<string, string> = {
  concession: "Concession",
  late_fee_waiver: "Late-fee Waiver",
  custom_installment: "Custom Installment Plan",
  refund: "Refund",
};

const formatPaiseRupees = (paise: string | number) => {
  const rupees = Number(paise) / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
};

export default function ApprovalsQueuePage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [approvals, setApprovals] = useState<PendingFeeApproval[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = nextToastId();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await listPendingApprovals(token);
      setApprovals(data);
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load approvals");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  const filtered = useMemo(() => {
    if (filter === "all") return approvals;
    return approvals.filter((a) => a.type === filter);
  }, [filter, approvals]);

  const handleReview = useCallback(
    async (approval: PendingFeeApproval, approved: boolean) => {
      if (!token) return;
      const reviewerNotes = notes[approval.id]?.trim();
      setPendingId(approval.id);
      try {
        if (approval.type === "concession") {
          if (!approval.concession?.id) {
            throw new Error("Concession reference missing");
          }
          await reviewConcession(token, {
            id: approval.concession.id,
            approved,
            reviewerNotes,
          });
        } else if (approval.type === "late_fee_waiver") {
          if (!approval.lateFeeWaiver?.id) {
            throw new Error("Waiver reference missing");
          }
          await reviewLateFeeWaiver(token, {
            id: approval.lateFeeWaiver.id,
            approved,
            reviewerNotes,
          });
        } else {
          throw new Error(
            `Reviewing ${TYPE_LABEL[approval.type] ?? approval.type} from this queue is not yet supported. Open the related module.`,
          );
        }
        addToast("success", approved ? "Approved" : "Rejected");
        await refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Review failed";
        addToast("error", msg);
      } finally {
        setPendingId(null);
      }
    },
    [token, notes, addToast, refresh],
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
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
              Fees & Accounts
            </p>
            <h1 className="mt-1 text-xl font-semibold text-text-primary">Approvals Queue</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Concession, late-fee waiver, and custom installment requests awaiting your
              decision.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-surface-border">
            {(["all", "concession", "late_fee_waiver", "custom_installment"] as FilterTab[]).map(
              (tab) => {
                const isActive = filter === tab;
                const count =
                  tab === "all" ? approvals.length : approvals.filter((a) => a.type === tab).length;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilter(tab)}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-brand-royal text-brand-royal"
                        : "border-transparent text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {tab === "all" ? "All" : TYPE_LABEL[tab]}{" "}
                    <span className="ml-1 text-xs text-text-muted">({count})</span>
                  </button>
                );
              },
            )}
          </div>

          {error && (
            <Card className="border-brand-rose/25 bg-brand-rose-light p-3 text-sm text-status-error">{error}</Card>
          )}

          {isLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <Inbox className="mx-auto h-6 w-6 text-text-muted" />
              <p className="mt-2 text-sm text-text-secondary">No pending requests in this view.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((approval) => {
                const isPending = pendingId === approval.id;
                const amountLabel =
                  approval.concession?.amountInPaise !== undefined
                    ? formatPaiseRupees(approval.concession.amountInPaise)
                    : approval.lateFeeWaiver?.amountInPaise !== undefined
                      ? formatPaiseRupees(approval.lateFeeWaiver.amountInPaise)
                      : null;
                const isReviewable =
                  approval.type === "concession" || approval.type === "late_fee_waiver";

                return (
                  <Card key={approval.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="warning">{TYPE_LABEL[approval.type] ?? approval.type}</Badge>
                          {approval.concession?.type && (
                            <Badge variant="default">{approval.concession.type}</Badge>
                          )}
                          {amountLabel && (
                            <span className="text-sm font-semibold text-text-primary">
                              {amountLabel}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-text-primary">{approval.reason}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          Requested by {approval.requestedBy?.name ?? "—"} ·{" "}
                          {new Date(approval.createdAt).toLocaleString("en-IN")}
                        </p>
                        {approval.documents.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {approval.documents.map((doc) => (
                              <a
                                key={doc.id}
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-brand-royal hover:underline"
                              >
                                📎 {doc.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {isReviewable ? (
                      <div className="mt-4 space-y-2 border-t border-surface-border pt-3">
                        <Textarea
                          rows={2}
                          value={notes[approval.id] ?? ""}
                          onChange={(e) =>
                            setNotes((prev) => ({ ...prev, [approval.id]: e.target.value }))
                          }
                          placeholder="Reviewer notes (optional)"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="danger"
                            disabled={isPending}
                            onClick={() => void handleReview(approval, false)}
                          >
                            {isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="mr-1 h-4 w-4" />
                            )}
                            Reject
                          </Button>
                          <Button
                            disabled={isPending}
                            onClick={() => void handleReview(approval, true)}
                          >
                            {isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 border-t border-surface-border pt-3 text-xs text-text-muted">
                        Review this {TYPE_LABEL[approval.type] ?? approval.type} from the related
                        module.
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
