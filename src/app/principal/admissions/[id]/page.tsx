"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleDot, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  PrincipalApiError,
  getPrincipalApplicationById,
  getStudentFeeAccount,
  reviewPrincipalApplication,
  type PrincipalApplicationDetail,
  type StudentFeeAccount,
} from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

type Tab = "overview" | "documents" | "payment" | "history";
type QuickDecision = "under_review" | "approved" | "rejected" | "on_hold" | "needs_correction";
type WorkflowStatus =
  | "payment_completed"
  | "under_review"
  | "on_hold"
  | "needs_correction"
  | "approved"
  | "rejected";

type DecisionConfig = {
  label: string;
  targetStatus: "under_review" | "approved" | "rejected" | "on_hold";
  needsCorrection: boolean;
  requiresComments: boolean;
  requiresCorrectionDetails: boolean;
  variant: "primary" | "secondary" | "ghost";
};

const UI = {
  heroPad: "p-5 sm:p-6",
  sectionGap: "mt-6",
  cardPad: "p-5",
  heading: "text-2xl sm:text-3xl font-bold",
  sectionTitle: "text-lg sm:text-xl font-semibold",
  actionBtn: "h-9 px-4 text-sm",
};

const DECISION_CONFIG: Record<QuickDecision, DecisionConfig> = {
  under_review: {
    label: "Move Under Review",
    targetStatus: "under_review",
    needsCorrection: false,
    requiresComments: false,
    requiresCorrectionDetails: false,
    variant: "secondary",
  },
  approved: {
    label: "Approve",
    targetStatus: "approved",
    needsCorrection: false,
    requiresComments: true,
    requiresCorrectionDetails: false,
    variant: "primary",
  },
  rejected: {
    label: "Reject",
    targetStatus: "rejected",
    needsCorrection: false,
    requiresComments: true,
    requiresCorrectionDetails: false,
    variant: "ghost",
  },
  on_hold: {
    label: "Put On Hold",
    targetStatus: "on_hold",
    needsCorrection: false,
    requiresComments: true,
    requiresCorrectionDetails: false,
    variant: "secondary",
  },
  needs_correction: {
    label: "Needs Correction",
    targetStatus: "under_review",
    needsCorrection: true,
    requiresComments: true,
    requiresCorrectionDetails: true,
    variant: "secondary",
  },
};

const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, QuickDecision[]> = {
  payment_completed: ["under_review", "on_hold", "needs_correction", "approved", "rejected"],
  under_review: ["on_hold", "needs_correction", "approved", "rejected"],
  on_hold: ["under_review", "needs_correction", "rejected"],
  needs_correction: ["under_review", "on_hold", "rejected"],
  rejected: ["under_review"],
  approved: [],
};

function toStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function statusVariant(status: string): "default" | "success" | "warning" | "error" {
  if (["approved", "payment_completed"].includes(status)) return "success";
  if (status === "rejected") return "error";
  if (["under_review", "on_hold", "needs_correction", "payment_pending"].includes(status)) {
    return "warning";
  }
  return "default";
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PrincipalAdmissionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<PrincipalApplicationDetail | null>(null);
  const [feeAccount, setFeeAccount] = useState<StudentFeeAccount | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);
  const [decisionComments, setDecisionComments] = useState("");
  const [decisionCorrectionDetails, setDecisionCorrectionDetails] = useState("");

  useEffect(() => {
    const token = getPrincipalToken();
    if (!token) {
      router.replace(`/principal/login?next=${encodeURIComponent(`/principal/admissions/${params.id}`)}`);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [applicationData, feeData] = await Promise.all([
          getPrincipalApplicationById(token, params.id),
          getStudentFeeAccount(token, params.id),
        ]);
        setApplication(applicationData);
        setFeeAccount(feeData);
      } catch (err) {
        if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) {
          clearPrincipalSession();
          router.replace(`/principal/login?next=${encodeURIComponent(`/principal/admissions/${params.id}`)}`);
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load application details");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [params.id, router]);

  const allTransactions = useMemo(() => feeAccount?.transactions ?? [], [feeAccount]);
  const workflowStatus = useMemo<WorkflowStatus>(() => {
    if (!application) return "under_review";
    if (application.correctionNeeded) return "needs_correction";
    if (
      application.status === "payment_completed" ||
      application.status === "under_review" ||
      application.status === "on_hold" ||
      application.status === "approved" ||
      application.status === "rejected"
    ) {
      return application.status;
    }
    return "under_review";
  }, [application]);

  const allowedDecisions = useMemo(
    () => WORKFLOW_TRANSITIONS[workflowStatus] ?? [],
    [workflowStatus],
  );

  const executeDecision = async (decision: QuickDecision) => {
    if (!application) return;
    const token = getPrincipalToken();
    if (!token) {
      router.replace(`/principal/login?next=${encodeURIComponent(`/principal/admissions/${params.id}`)}`);
      return;
    }

    const comments = decisionComments.trim();
    const correctionDetails = decisionCorrectionDetails.trim();

    const rule = DECISION_CONFIG[decision];
    if (!allowedDecisions.includes(decision)) {
      setDecisionError(`Transition to ${toStatusLabel(decision)} is not allowed from current state.`);
      return;
    }
    if (rule.requiresComments && !comments) {
      setDecisionError("Comments are required for this decision.");
      return;
    }
    if (rule.requiresCorrectionDetails && !correctionDetails) {
      setDecisionError("Comments and correction details are required for needs correction.");
      return;
    }

    setDecisionLoading(true);
    setDecisionError(null);
    setDecisionSuccess(null);
    try {
      await reviewPrincipalApplication(token, {
        applicationId: application.applicationId,
        status: rule.targetStatus,
        comments: comments || `Moved to ${toStatusLabel(decision)} from detail workspace`,
        needsCorrection: rule.needsCorrection,
        correctionDetails: rule.needsCorrection ? correctionDetails : undefined,
      });

      const [applicationData, feeData] = await Promise.all([
        getPrincipalApplicationById(token, params.id),
        getStudentFeeAccount(token, params.id),
      ]);
      setApplication(applicationData);
      setFeeAccount(feeData);
      setDecisionSuccess(`Application updated to ${toStatusLabel(decision)}.`);
      setDecisionComments("");
      setDecisionCorrectionDetails("");
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : "Failed to process decision.");
    } finally {
      setDecisionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="p-6">
          <p className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading principal admission workspace...
          </p>
        </Card>
      </main>
    );
  }

  if (error || !application) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="p-6">
          <p className="text-sm font-semibold text-rose-700">
            {error || "Application not found"}
          </p>
          <Link href="/principal/admissions" className="mt-3 inline-block text-sm font-semibold text-brand-royal">
            Back to queue
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Card className={`card-accent mb-5 ${UI.heroPad}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/principal/admissions"
              className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-royal hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admissions Queue
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
              Principal Detail Workspace
            </p>
            <h1 className={`mt-1 ${UI.heading} text-text-primary`}>{application.applicationId}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {application.studentFirstName} {application.studentLastName}
            </p>
          </div>
          <Badge variant={statusVariant(application.status)}>{toStatusLabel(workflowStatus)}</Badge>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-surface-border p-4">
          <p className="text-xs uppercase text-text-muted">Admission Year</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{application.admissionYear}</p>
        </Card>
        <Card className="border border-surface-border p-4">
          <p className="text-xs uppercase text-text-muted">Payment</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{application.payment?.status ?? "none"}</p>
        </Card>
        <Card className="border border-surface-border p-4">
          <p className="text-xs uppercase text-text-muted">Documents</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{application.documents.length}</p>
        </Card>
        <Card className="border border-surface-border p-4">
          <p className="text-xs uppercase text-text-muted">Last Updated</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{formatDate(application.lastUpdatedAt)}</p>
        </Card>
      </section>

      <section className="mt-4">
        <Card className={`border border-surface-border ${UI.cardPad}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={`${UI.sectionTitle} text-text-primary`}>Principal Quick Decisions</h2>
            <p className="text-xs text-text-muted">Controlled workflow transitions</p>
          </div>
          <div className="mt-3 rounded-md border border-surface-border bg-surface-muted p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-text-primary">Current stage:</span>
              <Badge variant={statusVariant(workflowStatus)}>{toStatusLabel(workflowStatus)}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-text-secondary">
              {allowedDecisions.length === 0 ? (
                <span>No further transitions allowed from this state.</span>
              ) : (
                allowedDecisions.map((step, index) => (
                  <div key={step} className="inline-flex items-center gap-1">
                    <span className="rounded bg-white px-2 py-1 font-medium text-text-primary">
                      {toStatusLabel(step)}
                    </span>
                    {index < allowedDecisions.length - 1 ? (
                      <ArrowRight className="h-3 w-3 text-text-muted" />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
          {decisionError ? (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {decisionError}
            </p>
          ) : null}
          {decisionSuccess ? (
            <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {decisionSuccess}
            </p>
          ) : null}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <Label>Decision comments</Label>
              <Textarea
                value={decisionComments}
                onChange={(e) => setDecisionComments(e.target.value)}
                placeholder="Required for approve/reject/on hold/correction"
                className="min-h-[72px]"
              />
            </div>
            <div>
              <Label>Correction details</Label>
              <Textarea
                value={decisionCorrectionDetails}
                onChange={(e) => setDecisionCorrectionDetails(e.target.value)}
                placeholder="Required only for needs correction"
                className="min-h-[72px]"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {allowedDecisions.map((decision) => {
              const rule = DECISION_CONFIG[decision];
              return (
                <Button
                  key={decision}
                  variant={rule.variant}
                  className={UI.actionBtn}
                  disabled={decisionLoading}
                  onClick={() => void executeDecision(decision)}
                >
                  {rule.label}
                </Button>
              );
            })}
            {allowedDecisions.length === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm text-text-secondary">
                <CircleDot className="h-3.5 w-3.5" />
                Application is in terminal state.
              </span>
            ) : null}
          </div>
        </Card>
      </section>

      <div className="sticky top-2 z-20 mt-6 rounded-md border border-surface-border bg-white/95 p-2 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {(["overview", "documents", "payment", "history"] as Tab[]).map((item) => (
            <Button
              key={item}
              variant={tab === item ? "primary" : "secondary"}
              className="h-9 px-4 text-sm capitalize"
              onClick={() => setTab(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      <section className="mt-4">
        {tab === "overview" ? (
          <Card className={`border border-surface-border ${UI.cardPad}`}>
            <h2 className={`${UI.sectionTitle} text-text-primary`}>Student & Parent Overview</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-surface-border bg-surface-muted p-4">
                <p className="text-xs uppercase text-text-muted">Student</p>
                <p className="mt-2 text-sm text-text-primary">
                  {application.studentFirstName} {application.studentLastName}
                </p>
                <p className="mt-1 text-sm text-text-secondary">Contact: {application.emergencyContact}</p>
              </div>
              <div className="rounded-md border border-surface-border bg-surface-muted p-4">
                <p className="text-xs uppercase text-text-muted">Parents</p>
                <p className="mt-2 text-sm text-text-primary">Father: {application.fatherName}</p>
                <p className="mt-1 text-sm text-text-primary">Mother: {application.motherName}</p>
              </div>
              <div className="rounded-md border border-surface-border bg-surface-muted p-4 md:col-span-2">
                <p className="text-xs uppercase text-text-muted">Address</p>
                <p className="mt-2 text-sm text-text-primary">{application.address}</p>
              </div>
              {application.correctionDetails ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 md:col-span-2">
                  <p className="text-xs uppercase text-amber-700">Correction Notes</p>
                  <p className="mt-2 text-sm text-amber-800">{application.correctionDetails}</p>
                </div>
              ) : null}
              <div className="rounded-md border border-surface-border bg-white p-4 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-text-muted">Printable Review Summary</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      Use this as a quick principal summary for approvals and records.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => window.print()}>
                    Print Summary
                  </Button>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-text-primary">
                  <p>
                    <span className="font-semibold">Application:</span> {application.applicationId}
                  </p>
                  <p>
                    <span className="font-semibold">Student:</span> {application.studentFirstName}{" "}
                    {application.studentLastName}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span> {application.status}
                  </p>
                  <p>
                    <span className="font-semibold">Payment:</span> {application.payment?.status ?? "none"}
                  </p>
                  <p>
                    <span className="font-semibold">Documents:</span> {application.documents.length}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {tab === "documents" ? (
          <Card className={`border border-surface-border ${UI.cardPad}`}>
            <h2 className={`${UI.sectionTitle} text-text-primary`}>Documents</h2>
            {application.documents.length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">No documents uploaded yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {application.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-border bg-surface-muted p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{doc.name}</p>
                      <p className="text-xs text-text-secondary">
                        Uploaded: {formatDate(doc.uploadedAt)} | Type: {doc.fileType || "unknown"}
                      </p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-brand-royal hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Open
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}

        {tab === "payment" ? (
          <Card className={`border border-surface-border ${UI.cardPad}`}>
            <h2 className={`${UI.sectionTitle} text-text-primary`}>Payment Workspace</h2>
            {!feeAccount ? (
              <p className="mt-3 text-sm text-text-secondary">
                No fee account/payment plan found for this application yet.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-md border border-surface-border bg-surface-muted p-4">
                  <p className="text-xs uppercase text-text-muted">Total</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">
                    {formatMoney(feeAccount.totalAmount)}
                  </p>
                </div>
                <div className="rounded-md border border-surface-border bg-surface-muted p-4">
                  <p className="text-xs uppercase text-text-muted">Paid</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-700">
                    {formatMoney(feeAccount.paidAmount)}
                  </p>
                </div>
                <div className="rounded-md border border-surface-border bg-surface-muted p-4">
                  <p className="text-xs uppercase text-text-muted">Pending</p>
                  <p className="mt-2 text-lg font-semibold text-amber-700">
                    {formatMoney(feeAccount.remainingAmount)}
                  </p>
                </div>
                <div className="rounded-md border border-surface-border bg-surface-muted p-4 md:col-span-3">
                  <p className="text-xs uppercase text-text-muted">Installments</p>
                  <div className="mt-2 grid gap-2">
                    {feeAccount.installments.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-text-primary">{item.name}</span>
                        <span className="text-text-secondary">
                          {formatMoney(item.amount)} - {item.isPaid ? "Paid" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        ) : null}

        {tab === "history" ? (
          <Card className={`border border-surface-border ${UI.cardPad}`}>
            <h2 className={`${UI.sectionTitle} text-text-primary`}>Status & Review History</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-text-primary">Status Timeline</p>
                <div className="mt-2 space-y-2">
                  {application.statusHistory.length === 0 ? (
                    <p className="text-sm text-text-secondary">No status history available.</p>
                  ) : (
                    application.statusHistory.map((item) => (
                      <div key={item.id} className="rounded-md border border-surface-border p-3">
                        <p className="text-sm font-semibold text-text-primary">{item.status}</p>
                        <p className="text-xs text-text-secondary">
                          {formatDate(item.changedAt)} by {item.changedByName || "system"}
                        </p>
                        {item.comments ? (
                          <p className="mt-1 text-xs text-text-secondary">{item.comments}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Reviews & Transactions</p>
                <div className="mt-2 space-y-2">
                  {application.reviews.map((review) => (
                    <div key={review.id} className="rounded-md border border-surface-border p-3">
                      <p className="text-sm font-semibold text-text-primary">
                        {review.reviewerRole} - {review.status}
                      </p>
                      <p className="text-xs text-text-secondary">{formatDate(review.reviewedAt)}</p>
                      <p className="mt-1 text-xs text-text-secondary">{review.comments}</p>
                    </div>
                  ))}
                  {allTransactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="rounded-md border border-surface-border bg-surface-muted p-3">
                      <p className="text-sm font-semibold text-text-primary">
                        {tx.installmentName || "Installment payment"} - {formatMoney(tx.amount)}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatDate(tx.paidAt)} | {tx.method}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
