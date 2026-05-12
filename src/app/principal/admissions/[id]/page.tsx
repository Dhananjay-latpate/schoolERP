"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  Files,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  PrincipalApiError,
  buildAdmissionLetterUrls,
  getPrincipalApplicationById,
  getStudentFeeAccount,
  reviewPrincipalApplication,
  type PrincipalApplicationDetail,
  type StudentFeeAccount,
} from "@/lib/principalApi";
import { DecisionCard } from "@/components/admission/DecisionCard";
import { StatusTimeline } from "@/components/admission/StatusTimeline";
import { WorkflowStepper } from "@/components/admission/WorkflowStepper";
import {
  STATUS_LABELS,
  type ActionContext,
  type ApplicationStatus,
} from "@/lib/admissionWorkflow";
import {
  clearPrincipalSession,
  getPrincipalToken,
} from "@/lib/principalSession";
import { FeeAccountSummary } from "@/components/fees/FeeAccountSummary";
import { FeeChargesTab } from "@/components/fees/FeeChargesTab";
import { FeeLedgerTab } from "@/components/fees/FeeLedgerTab";
import { FeeApprovalsTab } from "@/components/fees/FeeApprovalsTab";
import { RecordPaymentModal } from "@/components/fees/RecordPaymentModal";
import { type FeeAccount } from "@/lib/principalApi";

type Tab =
  | "overview"
  | "documents"
  | "payment"
  | "history"
  | "charges"
  | "ledger"
  | "fee_approvals";
type WorkflowStatus =
  | "payment_completed"
  | "under_review"
  | "on_hold"
  | "needs_correction"
  | "approved"
  | "rejected";

const UI = {
  heroPad: "p-5 sm:p-6",
  sectionGap: "mt-6",
  cardPad: "p-5",
  heading: "text-2xl sm:text-3xl font-bold",
  sectionTitle: "text-lg sm:text-xl font-semibold",
  actionBtn: "h-9 px-4 text-sm",
};

function toStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function statusVariant(
  status: string,
): "default" | "success" | "warning" | "error" {
  if (["approved", "payment_completed"].includes(status)) return "success";
  if (status === "rejected") return "error";
  if (
    ["under_review", "on_hold", "needs_correction", "payment_pending"].includes(
      status,
    )
  ) {
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
  const [application, setApplication] =
    useState<PrincipalApplicationDetail | null>(null);
  const [feeAccount, setFeeAccount] = useState<StudentFeeAccount | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);
  const [feeData, setFeeData] = useState<FeeAccount | null>(null);
  const [feeDataLoaded, setFeeDataLoaded] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const token = getPrincipalToken();
    if (!token) {
      router.replace(
        `/principal/login?next=${encodeURIComponent(`/principal/admissions/${params.id}`)}`,
      );
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
        if (
          err instanceof PrincipalApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          clearPrincipalSession();
          router.replace(
            `/principal/login?next=${encodeURIComponent(`/principal/admissions/${params.id}`)}`,
          );
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load application details",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [params.id, router]);

  useEffect(() => {
    if (
      (tab === "charges" || tab === "ledger" || tab === "fee_approvals") &&
      !feeDataLoaded
    ) {
      void loadFeeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, feeDataLoaded]);

  const allTransactions = useMemo(
    () => feeAccount?.transactions ?? [],
    [feeAccount],
  );
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

  const loadFeeData = async () => {
    const t = getPrincipalToken();
    if (!t) {
      router.replace(
        `/principal/login?next=${encodeURIComponent(`/principal/admissions/${params.id}`)}`,
      );
      return;
    }
    setFeeLoading(true);
    setFeeError(null);
    try {
      const acct = await getStudentFeeAccount(t, params.id);
      setFeeData(acct?.feeAccount ?? null);
      setFeeDataLoaded(true);
    } catch (err) {
      if (
        err instanceof PrincipalApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        clearPrincipalSession();
        router.replace(
          `/principal/login?next=${encodeURIComponent(`/principal/admissions/${params.id}`)}`,
        );
        return;
      }
      setFeeError(
        err instanceof Error ? err.message : "Failed to load fee data",
      );
    } finally {
      setFeeLoading(false);
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
          <Link
            href="/principal/admissions"
            className="mt-3 inline-block text-sm font-semibold text-brand-royal"
          >
            Back to queue
          </Link>
        </Card>
      </main>
    );
  }

  const studentInitials = `${application.studentFirstName?.[0] ?? ""}${
    application.studentLastName?.[0] ?? ""
  }`.toUpperCase();
  const classDisplay = application.class
    ? `${application.class.name}${application.class.section ? ` - ${application.class.section}` : ""}`
    : "—";
  const statusKey = application.status as ApplicationStatus;
  const statusLabel = STATUS_LABELS[statusKey] ?? application.status;
  const heroAccentClass =
    statusKey === "approved"
      ? "from-emerald-50 via-emerald-50/40 to-white border-emerald-200"
      : statusKey === "rejected"
        ? "from-rose-50 via-rose-50/40 to-white border-rose-200"
        : statusKey === "cancelled"
          ? "from-slate-100 via-slate-50/40 to-white border-slate-300"
          : statusKey === "on_hold"
            ? "from-amber-50 via-amber-50/40 to-white border-amber-200"
            : statusKey === "needs_correction"
              ? "from-orange-50 via-orange-50/40 to-white border-orange-200"
              : statusKey === "under_review"
                ? "from-violet-50 via-violet-50/40 to-white border-violet-200"
                : "from-blue-50 via-blue-50/40 to-white border-blue-200";

  const letterUrls = buildAdmissionLetterUrls(application.applicationId);

  const decisionContext: ActionContext = {
    status: statusKey,
    paymentCompleted: application.payment?.status === "completed",
    // The server enforces the documents-required check using
    // ADMISSION_REQUIRED_DOCUMENTS env var. The client doesn't know that
    // list, so we default to permissive — the server returns a clean 400
    // with the missing-document names if any are actually required, and
    // the DecisionCard surfaces that as the action error.
    hasRequiredDocuments: true,
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/principal/admissions"
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-royal hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admissions Queue
      </Link>

      {/* Hero */}
      <Card
        className={`overflow-hidden border bg-linear-to-br ${heroAccentClass} shadow-sm`}
      >
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-7">
          {/* Avatar */}
          <div
            className="logo-mark h-16 w-16 rounded-2xl text-2xl"
            aria-hidden="true"
          >
            {studentInitials || "?"}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-royal">
              Principal · Application Workspace
            </p>
            <h1 className="mt-0.5 truncate text-2xl font-bold text-slate-900 sm:text-3xl">
              {application.studentFirstName}{" "}
              {application.studentMiddleName
                ? `${application.studentMiddleName} `
                : ""}
              {application.studentLastName}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span className="font-mono text-xs font-semibold tracking-wide text-slate-700">
                {application.applicationId}
              </span>
              {application.grNumber ? (
                <>
                  <span className="text-slate-300">·</span>
                  <span>
                    GR{" "}
                    <span className="font-semibold text-slate-700">
                      {application.grNumber}
                    </span>
                  </span>
                </>
              ) : null}
              <span className="text-slate-300">·</span>
              <span>
                Class{" "}
                <span className="font-semibold text-slate-700">
                  {classDisplay}
                </span>
              </span>
              <span className="text-slate-300">·</span>
              <span>
                Session{" "}
                <span className="font-semibold text-slate-700">
                  {application.admissionYear}
                </span>
              </span>
            </p>
          </div>

          {/* Status pill */}
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <Badge variant={statusVariant(application.status)}>
              {statusLabel}
            </Badge>
            <p className="text-[11px] text-slate-500">
              Updated {formatDate(application.lastUpdatedAt)}
            </p>
          </div>
        </div>

        {/* Stepper strip */}
        <div className="border-t border-slate-200/80 bg-white/50 px-6 py-5 sm:px-7">
          <WorkflowStepper status={statusKey} />
        </div>
      </Card>

      {/* KPI strip — compact, info-rich */}
      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <Card className="border border-surface-border p-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Payment
              </p>
              <p className="mt-0.5 text-sm font-bold capitalize text-slate-900">
                {application.payment?.status ?? "Not started"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border border-surface-border p-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Files className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Documents
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {application.documents.length} uploaded
              </p>
            </div>
          </div>
        </Card>
        <Card className="border border-surface-border p-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Submitted
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {formatDate(application.submittedAt)}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Decision Card with letter slot inline when approved */}
      <section className="mt-4">
        <DecisionCard
          context={decisionContext}
          isSubmitting={decisionLoading}
          errorMessage={decisionError}
          successMessage={decisionSuccess}
          approvedSlot={
            statusKey === "approved" ? (
              <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-emerald-50/30 p-4 sm:flex-row sm:items-center">
                <div className="flex shrink-0 items-center gap-2">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">
                      Confirmation letter ready
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      Pre-filled with school branding from settings.
                    </p>
                  </div>
                </div>
                <div className="flex flex-1 flex-wrap justify-end gap-2">
                  <a
                    href={letterUrls.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-emerald-700 bg-white px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Preview Letter
                  </a>
                  <a
                    href={letterUrls.pdfUrl}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Download PDF
                  </a>
                </div>
              </div>
            ) : null
          }
          onSubmit={async ({ action, comments, correctionDetails }) => {
            const token = getPrincipalToken();
            if (!token) {
              router.replace(
                `/principal/login?next=${encodeURIComponent(`/principal/admissions/${params.id}`)}`,
              );
              return;
            }
            setDecisionLoading(true);
            setDecisionError(null);
            setDecisionSuccess(null);
            try {
              // Map the canonical action onto the principal review payload.
              // The review endpoint accepts a tighter set of statuses, so we
              // route `needs_correction` and `cancelled` through the generic
              // status patch endpoint instead.
              const reviewActions: ApplicationStatus[] = [
                "under_review",
                "approved",
                "rejected",
                "on_hold",
              ];
              if (action === "needs_correction" || action === "cancelled") {
                // Use the generic status PATCH so we don't get blocked by
                // reviewApplication's narrower whitelist.
                const res = await fetch(
                  `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"}/api/admissions/${encodeURIComponent(application.applicationId)}/status`,
                  {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      status: action,
                      comments,
                      changedBy: "Principal",
                      changedByRole: "PRINCIPAL",
                    }),
                  },
                );
                if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  throw new Error(body?.message || "Failed to apply action.");
                }
                if (action === "needs_correction" && correctionDetails) {
                  // Persist the correction details payload via the review
                  // endpoint so the parent sees them in their portal.
                  await reviewPrincipalApplication(token, {
                    applicationId: application.applicationId,
                    status: "under_review",
                    comments,
                    needsCorrection: true,
                    correctionDetails,
                  });
                }
              } else if (reviewActions.includes(action as ApplicationStatus)) {
                await reviewPrincipalApplication(token, {
                  applicationId: application.applicationId,
                  status: action as
                    | "under_review"
                    | "approved"
                    | "rejected"
                    | "on_hold",
                  comments,
                  needsCorrection: false,
                });
              }
              const [applicationData, feeData] = await Promise.all([
                getPrincipalApplicationById(token, params.id),
                getStudentFeeAccount(token, params.id),
              ]);
              setApplication(applicationData);
              setFeeAccount(feeData);
              setDecisionSuccess(
                `Application updated — ${STATUS_LABELS[action] ?? action.replace(/_/g, " ")}.`,
              );
            } catch (err) {
              setDecisionError(
                err instanceof Error ? err.message : "Failed to apply action.",
              );
            } finally {
              setDecisionLoading(false);
            }
          }}
        />
      </section>

      <div className="sticky top-2 z-20 mt-6 rounded-md border border-surface-border bg-white/95 p-2 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {(
            [
              "overview",
              "documents",
              "payment",
              "history",
              "charges",
              "ledger",
              "fee_approvals",
            ] as Tab[]
          ).map((item) => (
            <Button
              key={item}
              variant={tab === item ? "primary" : "secondary"}
              className="h-9 px-4 text-sm capitalize"
              onClick={() => setTab(item)}
            >
              {item === "fee_approvals" ? "Fee Approvals" : item}
            </Button>
          ))}
        </div>
      </div>

      <section className="mt-4">
        {tab === "overview" ? (
          <Card className={`border border-surface-border ${UI.cardPad}`}>
            <h2 className={`${UI.sectionTitle} text-text-primary`}>
              Student & Parent Overview
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-surface-border bg-surface-muted p-4">
                <p className="text-xs uppercase text-text-muted">Student</p>
                <p className="mt-2 text-sm text-text-primary">
                  {application.studentFirstName} {application.studentLastName}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  Contact: {application.emergencyContact}
                </p>
              </div>
              <div className="rounded-md border border-surface-border bg-surface-muted p-4">
                <p className="text-xs uppercase text-text-muted">Parents</p>
                <p className="mt-2 text-sm text-text-primary">
                  Father: {application.fatherName}
                </p>
                <p className="mt-1 text-sm text-text-primary">
                  Mother: {application.motherName}
                </p>
              </div>
              <div className="rounded-md border border-surface-border bg-surface-muted p-4 md:col-span-2">
                <p className="text-xs uppercase text-text-muted">Address</p>
                <p className="mt-2 text-sm text-text-primary">
                  {application.address}
                </p>
              </div>
              {application.correctionDetails ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 md:col-span-2">
                  <p className="text-xs uppercase text-amber-700">
                    Correction Notes
                  </p>
                  <p className="mt-2 text-sm text-amber-800">
                    {application.correctionDetails}
                  </p>
                </div>
              ) : null}
              <div className="rounded-md border border-surface-border bg-white p-4 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-text-muted">
                      Printable Review Summary
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      Use this as a quick principal summary for approvals and
                      records.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => window.print()}>
                    Print Summary
                  </Button>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-text-primary">
                  <p>
                    <span className="font-semibold">Application:</span>{" "}
                    {application.applicationId}
                  </p>
                  <p>
                    <span className="font-semibold">Student:</span>{" "}
                    {application.studentFirstName} {application.studentLastName}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span>{" "}
                    {application.status}
                  </p>
                  <p>
                    <span className="font-semibold">Payment:</span>{" "}
                    {application.payment?.status ?? "none"}
                  </p>
                  <p>
                    <span className="font-semibold">Documents:</span>{" "}
                    {application.documents.length}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {tab === "documents" ? (
          <Card className={`border border-surface-border ${UI.cardPad}`}>
            <h2 className={`${UI.sectionTitle} text-text-primary`}>
              Documents
            </h2>
            {application.documents.length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">
                No documents uploaded yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {application.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-border bg-surface-muted p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {doc.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Uploaded: {formatDate(doc.uploadedAt)} | Type:{" "}
                        {doc.fileType || "unknown"}
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
            <h2 className={`${UI.sectionTitle} text-text-primary`}>
              Payment Workspace
            </h2>
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
                  <p className="text-xs uppercase text-text-muted">
                    Installments
                  </p>
                  <div className="mt-2 grid gap-2">
                    {feeAccount.installments.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-text-primary">{item.name}</span>
                        <span className="text-text-secondary">
                          {formatMoney(item.amount)} -{" "}
                          {item.isPaid ? "Paid" : "Pending"}
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
          <div className="grid gap-4 lg:grid-cols-2">
            <StatusTimeline
              entries={(application.statusHistory ?? []).map((item) => ({
                id: item.id,
                status: item.status,
                changedAt:
                  typeof item.changedAt === "string"
                    ? item.changedAt
                    : new Date(item.changedAt).toISOString(),
                changedByName: item.changedByName ?? "system",
                comments: item.comments ?? null,
              }))}
            />
            <Card className={`border border-surface-border ${UI.cardPad}`}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-royal">
                Reviews & Transactions
              </h3>
              <div className="mt-3 space-y-2">
                {application.reviews.length === 0 &&
                allTransactions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No reviews or payments yet.
                  </p>
                ) : null}
                {application.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-md border border-surface-border p-3"
                  >
                    <p className="text-sm font-semibold text-text-primary">
                      {review.reviewerRole} - {review.status}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatDate(review.reviewedAt)}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {review.comments}
                    </p>
                  </div>
                ))}
                {allTransactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="rounded-md border border-surface-border bg-surface-muted p-3"
                  >
                    <p className="text-sm font-semibold text-text-primary">
                      {tx.installmentName || "Installment payment"} -{" "}
                      {formatMoney(tx.amount)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatDate(tx.paidAt)} | {tx.method}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : null}

        {tab === "charges" || tab === "ledger" || tab === "fee_approvals" ? (
          <Card className={`border border-surface-border ${UI.cardPad}`}>
            {feeLoading && (
              <p className="flex items-center gap-2 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading fee data...
              </p>
            )}
            {feeError && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {feeError}
              </p>
            )}
            {feeData && !feeLoading && (
              <>
                <FeeAccountSummary feeAccount={feeData} />
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    className={UI.actionBtn}
                    onClick={() => setFeeDataLoaded(false)}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    className={UI.actionBtn}
                    onClick={() => setShowPaymentModal(true)}
                  >
                    Record Payment
                  </Button>
                </div>
              </>
            )}
            {tab === "charges" && feeData && !feeLoading && (
              <FeeChargesTab
                charges={feeData.charges}
                accountId={feeData.id}
                token={getPrincipalToken() ?? ""}
                onCharged={() => setFeeDataLoaded(false)}
              />
            )}
            {tab === "ledger" && feeData && !feeLoading && (
              <FeeLedgerTab entries={feeData.ledgerEntries} />
            )}
            {tab === "fee_approvals" && !feeLoading && (
              <FeeApprovalsTab approvals={[]} />
            )}
          </Card>
        ) : null}

        {showPaymentModal && (
          <RecordPaymentModal
            applicationId={params.id}
            token={getPrincipalToken() ?? ""}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={() => {
              setShowPaymentModal(false);
              setFeeDataLoaded(false);
            }}
          />
        )}
      </section>
    </main>
  );
}
