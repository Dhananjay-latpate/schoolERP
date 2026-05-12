"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
  FileText,
  User,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import {
  listPendingApprovals,
  reviewConcession,
  reviewCustomPaymentPlan,
  reviewLateFeeWaiver,
  PrincipalApiError,
  type PendingFeeApproval,
} from "@/lib/principalApi";
import {
  clearPrincipalSession,
  getPrincipalToken,
} from "@/lib/principalSession";

const TOAST_TTL_MS = 3500;

type ToastItem = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

const TYPE_LABELS: Record<PendingFeeApproval["type"], string> = {
  custom_installment: "Custom Payment Plan",
  concession: "Fee Concession",
  late_fee_waiver: "Late Fee Waiver",
};

const TYPE_COLORS: Record<PendingFeeApproval["type"], string> = {
  custom_installment: "bg-violet-100 text-violet-700",
  concession: "bg-emerald-100 text-emerald-700",
  late_fee_waiver: "bg-amber-100 text-amber-700",
};

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<PendingFeeApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Per-card state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const addToast = useCallback((type: ToastItem["type"], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  const loadApprovals = useCallback(
    async (authToken: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listPendingApprovals(authToken);
        setApprovals(data);
      } catch (err) {
        if (
          err instanceof PrincipalApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          clearPrincipalSession();
          router.replace("/principal/login?next=%2Fprincipal%2Fapprovals");
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to load approvals",
        );
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const t = getPrincipalToken();
    if (!t) {
      router.replace("/principal/login?next=%2Fprincipal%2Fapprovals");
      return;
    }
    setToken(t);
    void loadApprovals(t);
  }, [router, loadApprovals]);

  const handleReview = useCallback(
    async (approval: PendingFeeApproval, approved: boolean) => {
      if (!token) return;
      setSubmitting((prev) => ({ ...prev, [approval.id]: true }));
      const notes = reviewNotes[approval.id] ?? "";
      try {
        if (approval.type === "concession") {
          await reviewConcession(token, {
            id: approval.id,
            approved,
            reviewerNotes: notes || undefined,
          });
        } else if (approval.type === "late_fee_waiver") {
          await reviewLateFeeWaiver(token, {
            id: approval.id,
            approved,
            reviewerNotes: notes || undefined,
          });
        } else {
          await reviewCustomPaymentPlan(token, {
            planId: approval.id,
            approved,
            comments: notes || undefined,
          });
        }
        addToast(
          "success",
          `${TYPE_LABELS[approval.type]} ${approved ? "approved" : "rejected"} successfully.`,
        );
        setApprovals((prev) => prev.filter((a) => a.id !== approval.id));
        setExpandedId(null);
      } catch (err) {
        if (
          err instanceof PrincipalApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          clearPrincipalSession();
          router.replace("/principal/login?next=%2Fprincipal%2Fapprovals");
          return;
        }
        addToast("error", err instanceof Error ? err.message : "Review failed");
      } finally {
        setSubmitting((prev) => ({ ...prev, [approval.id]: false }));
      }
    },
    [token, reviewNotes, addToast, router],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-lg ${
              t.type === "success"
                ? "bg-green-600 text-white"
                : t.type === "error"
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-white"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {t.message}
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pending Approvals
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Fee concessions, custom payment plans, and late fee waivers
              awaiting review
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => token && void loadApprovals(token)}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* States */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading approvals…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && approvals.length === 0 && (
          <Card className="p-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-400" />
            <p className="font-semibold text-gray-700">All caught up!</p>
            <p className="mt-1 text-sm text-gray-500">
              No pending approvals at this time.
            </p>
          </Card>
        )}

        {!loading && !error && approvals.length > 0 && (
          <div className="flex flex-col gap-3">
            {approvals.map((approval) => {
              const isExpanded = expandedId === approval.id;
              const isBusy = submitting[approval.id] ?? false;

              return (
                <Card key={approval.id} className="overflow-hidden">
                  {/* Card header */}
                  <button
                    className="flex w-full items-start justify-between gap-4 p-5 text-left"
                    onClick={() =>
                      setExpandedId((prev) =>
                        prev === approval.id ? null : approval.id,
                      )
                    }
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[approval.type]}`}
                        >
                          {TYPE_LABELS[approval.type]}
                        </span>
                        <Badge variant="default" className="text-xs">
                          {approval.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-800">
                        {approval.reason}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {approval.requestedBy && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {approval.requestedBy.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(approval.createdAt)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Expanded review panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-5">
                      {/* Documents */}
                      {approval.documents.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Supporting Documents
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {approval.documents.map((doc) => (
                              <a
                                key={doc.id}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-md border border-surface-border bg-surface-card px-3 py-1.5 text-xs text-brand-royal hover:bg-brand-sky-light"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                {doc.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reviewer notes */}
                      <div className="mb-4">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Reviewer Notes (optional)
                        </label>
                        <Textarea
                          rows={3}
                          placeholder="Add notes for your decision…"
                          value={reviewNotes[approval.id] ?? ""}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({
                              ...prev,
                              [approval.id]: e.target.value,
                            }))
                          }
                          disabled={isBusy}
                          className="text-sm"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => void handleReview(approval, true)}
                          disabled={isBusy}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          {isBusy ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => void handleReview(approval, false)}
                          disabled={isBusy}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          {isBusy ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
