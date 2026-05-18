"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  createInstallmentPaymentOrder,
  createStandardPlan,
  getAdmissionById,
  getCustomPlanStatus,
  getFeeStructure,
  getPaymentPlan,
  verifyInstallmentPayment,
  type AdmissionRecord,
  type CustomPlanStatusResponse,
  type FeeStructure,
  type PaymentPlanRecord,
} from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PaymentPanel } from "@/components/admission/PaymentPanel";
import { AlertCircle, CheckCircle, Clock, CreditCard } from "lucide-react";

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const READABLE_STATUS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  payment_pending: "Payment Pending",
  payment_completed: "Payment Completed",
  under_review: "Under Review",
  approved: "Approved",
  admission_confirmed: "Admission Confirmed",
  rejected: "Rejected",
};

function statusVariant(
  status: string,
): "default" | "success" | "warning" | "error" {
  if (["approved", "admission_confirmed", "payment_completed"].includes(status))
    return "success";
  if (["rejected"].includes(status)) return "error";
  if (["under_review", "payment_pending", "submitted"].includes(status))
    return "warning";
  return "default";
}

export default function AdmissionStatusPage() {
  const params = useParams<{ id: string }>();
  const razorpayScriptLoaded = useRef(false);
  const [data, setData] = useState<AdmissionRecord | null>(null);
  const [planStatus, setPlanStatus] = useState<CustomPlanStatusResponse | null>(
    null,
  );
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlanRecord | null>(
    null,
  );
  const [feeStructure, setFeeStructure] = useState<FeeStructure | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [installmentPayingIndex, setInstallmentPayingIndex] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || razorpayScriptLoaded.current) return;

    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      razorpayScriptLoaded.current = true;
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      razorpayScriptLoaded.current = true;
    };
    document.body.appendChild(script);
  }, []);

  const refreshPaymentContext = async (applicationId: string) => {
    let status: CustomPlanStatusResponse | null = null;
    try {
      status = await getCustomPlanStatus(applicationId);
      setPlanStatus(status);
    } catch {
      setPlanStatus(null);
      return;
    }

    if (status.hasPlan) {
      try {
        const plan = await getPaymentPlan(applicationId);
        setPaymentPlan(plan);
      } catch {
        setPaymentPlan(null);
      }
    } else {
      setPaymentPlan(null);
    }

    const className = data?.classAdmitted;
    const shouldOfferStandardFallback =
      status.hasPlan &&
      status.isCustomPlan === true &&
      status.status === "rejected" &&
      !!className;

    if (shouldOfferStandardFallback) {
      try {
        const admissionYear =
          data?.admissionYear ?? new Date().getFullYear().toString();
        const structure = await getFeeStructure(
          className as string,
          admissionYear,
        );
        setFeeStructure(structure);
        setSelectedOptionIndex(0);
      } catch {
        setFeeStructure(null);
      }
    } else {
      setFeeStructure(null);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // The application record itself is publicly readable so parents can
        // track status without logging in. Plan-status / payment-plan are
        // auth-protected (financial data), so we attempt them but soft-fail
        // when the parent is anonymous — the page still renders cleanly.
        const result = await getAdmissionById(params.id);
        setData(result);

        let status: CustomPlanStatusResponse | null = null;
        try {
          status = await getCustomPlanStatus(result.applicationId);
          setPlanStatus(status);
        } catch {
          setPlanStatus(null);
        }

        if (status?.hasPlan) {
          try {
            const plan = await getPaymentPlan(result.applicationId);
            setPaymentPlan(plan);
          } catch {
            setPaymentPlan(null);
          }
        }

        if (
          status?.hasPlan &&
          status.isCustomPlan === true &&
          status.status === "rejected" &&
          result.classAdmitted
        ) {
          try {
            const admissionYear =
              result.admissionYear ?? new Date().getFullYear().toString();
            const structure = await getFeeStructure(
              result.classAdmitted,
              admissionYear,
            );
            setFeeStructure(structure);
          } catch {
            setFeeStructure(null);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch application",
        );
      } finally {
        setLoading(false);
      }
    }

    if (params.id) load();
  }, [params.id]);

  if (loading) {
    return (
      <Card className="mx-auto max-w-3xl p-7 sm:p-9">
        <p className="text-sm text-text-secondary">
          Loading application status...
        </p>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="mx-auto max-w-3xl p-7 sm:p-9">
        <p className="text-sm text-status-error">
          {error || "Application not found"}
        </p>
        <Link
          href="/admissions/apply"
          className="mt-3 inline-block text-sm font-semibold text-brand-royal"
        >
          Start a new application
        </Link>
      </Card>
    );
  }

  const handleCreateStandardPlan = async () => {
    if (!data) return;
    setActionLoading(true);
    setError(null);
    try {
      await createStandardPlan(data.applicationId, selectedOptionIndex);
      await refreshPaymentContext(data.applicationId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create standard payment plan",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayInstallment = async (installmentIndex: number) => {
    if (!data || typeof window === "undefined") return;
    setInstallmentPayingIndex(installmentIndex);
    setError(null);

    try {
      const orderResponse = await createInstallmentPaymentOrder(
        data.applicationId,
        installmentIndex,
      );

      const razorpay = new window.Razorpay({
        key: orderResponse.key_id,
        amount: orderResponse.order.amount,
        currency: orderResponse.order.currency,
        order_id: orderResponse.order.id,
        name: "Resillix School",
        description: `Admission Fee Installment — ${data.applicationId}`,
        prefill: {
          name: `${data.firstName} ${data.lastName}`,
        },
        handler: async (response) => {
          try {
            await verifyInstallmentPayment({
              applicationId: data.applicationId,
              installmentIndex,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refreshPaymentContext(data.applicationId);
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Installment verification failed",
            );
          } finally {
            setInstallmentPayingIndex(null);
          }
        },
        modal: {
          ondismiss: () => setInstallmentPayingIndex(null),
        },
      });

      razorpay.open();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create installment payment order",
      );
      setInstallmentPayingIndex(null);
    }
  };

  // Status-aware banner — each state tells the parent exactly what's
  // happening and what (if anything) they need to do next.
  const isCustomAwaitingPrincipal =
    data.status === "submitted" &&
    planStatus?.hasPlan === true &&
    planStatus.isCustomPlan === true &&
    planStatus.status === "pending_approval";

  const renderStatusBanner = () => {
    const idChip = (
      <span className="rounded bg-white/80 px-1.5 py-0.5 font-mono font-bold">
        {data.applicationId}
      </span>
    );

    if (data.status === "payment_pending") {
      return (
        <div className="callout callout-warning mb-7 flex items-start gap-3">
          <CreditCard size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Action needed — complete your payment
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              Your application {idChip}
              {data.payment?.amount
                ? ` is ready for a ${formatINR(Number(data.payment.amount))} payment.`
                : " is awaiting payment."}
              {" "}Once payment is received, the principal will review your
              application.
            </p>
          </div>
        </div>
      );
    }

    if (isCustomAwaitingPrincipal) {
      return (
        <div className="callout callout-info mb-7 flex items-start gap-3">
          <Clock size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Custom payment request submitted
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              Your application {idChip} is with the principal for review of
              your proposed amount. Once approved, you'll be able to pay the
              agreed amount here — this page will update automatically when
              you refresh. The principal may adjust the amount before
              approving.
            </p>
          </div>
        </div>
      );
    }

    if (data.status === "submitted") {
      return (
        <div className="callout callout-info mb-7 flex items-start gap-3">
          <Clock size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Application submitted — awaiting principal review
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              Save your application ID {idChip} to track status. The principal
              will review and you'll receive an admission decision soon.
            </p>
          </div>
        </div>
      );
    }

    if (data.status === "payment_completed") {
      return (
        <div className="callout callout-success mb-7 flex items-start gap-3">
          <CheckCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Payment received — application submitted
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              Your application {idChip} is in the principal's queue. You'll
              receive a decision soon.
            </p>
          </div>
        </div>
      );
    }

    if (data.status === "under_review") {
      return (
        <div className="callout callout-info mb-7 flex items-start gap-3">
          <Clock size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Under review by the principal
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              Application {idChip} is being reviewed. We'll update this page
              when there's a decision.
            </p>
          </div>
        </div>
      );
    }

    if (data.status === "rejected") {
      return (
        <div className="callout callout-error mb-7 flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Application not accepted
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              The principal could not accept application {idChip} at this
              time. Please contact the admissions office for next steps.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  // Mini timeline showing where the parent is in the journey. Skipped on
  // rejected since the journey ended. The stage order differs by flow:
  //   - Custom (hardship): Submit → Principal approves amount → Payment → Decision
  //   - Full / Installment: Submit → Payment → Principal Review → Decision
  // The parent should always be able to read "what comes next" from left to
  // right without confusion.
  const renderTimeline = () => {
    if (data.status === "rejected") return null;
    const isCustomFlow =
      data.paymentMethod === "custom_payment" || isCustomAwaitingPrincipal;
    const stages: Array<{ key: string; label: string }> = isCustomFlow
      ? [
          { key: "submitted", label: "Submitted" },
          { key: "review", label: "Principal Review" },
          { key: "payment", label: "Payment" },
          { key: "decision", label: "Decision" },
        ]
      : [
          { key: "submitted", label: "Submitted" },
          { key: "payment", label: "Payment" },
          { key: "review", label: "Principal Review" },
          { key: "decision", label: "Decision" },
        ];

    const currentIndex = (() => {
      if (isCustomFlow) {
        switch (data.status) {
          case "draft":
            return -1;
          case "submitted":
            return 1; // Principal reviewing the proposed amount
          case "payment_pending":
            return 2; // Principal approved → pay now
          case "payment_completed":
          case "under_review":
            return 2; // Paid; back in principal queue (decision step is final)
          case "approved":
          case "admission_confirmed":
            return 3;
          default:
            return 0;
        }
      }
      switch (data.status) {
        case "draft":
          return -1;
        case "submitted":
          // For full / installment flow, reaching `submitted` happens AFTER
          // a successful payment (the controller auto-promotes
          // payment_completed → submitted). So in this flow, "submitted"
          // means "paid + with the principal", which is step 3 — not the
          // initial submit step.
          return data.payment?.status === "completed" ? 2 : 0;
        case "payment_pending":
          return 1;
        case "payment_completed":
        case "under_review":
          return 2;
        case "approved":
        case "admission_confirmed":
          return 3;
        default:
          return 0;
      }
    })();

    return (
      <ol className="mb-7 grid grid-cols-4 gap-2 text-[11px]">
        {stages.map((s, idx) => {
          const done = idx <= currentIndex;
          const active = idx === currentIndex;
          return (
            <li
              key={s.key}
              className={`flex flex-col items-center rounded-md border px-2 py-2.5 text-center ${
                active
                  ? "border-brand-royal/30 bg-brand-sky-light text-brand-royal"
                  : done
                    ? "border-brand-emerald/30 bg-brand-emerald-light text-brand-emerald"
                    : "border-surface-border bg-surface-muted text-text-muted"
              }`}
            >
              <span
                className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  done
                    ? active
                      ? "bg-brand-royal text-white"
                      : "bg-brand-emerald text-white"
                    : "bg-surface-card text-text-muted border border-surface-border"
                }`}
              >
                {idx + 1}
              </span>
              <span className="font-semibold leading-tight">{s.label}</span>
            </li>
          );
        })}
      </ol>
    );
  };

  return (
    <Card className="mx-auto max-w-3xl p-7 sm:p-9">
      {renderStatusBanner()}
      {renderTimeline()}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow eyebrow-accent">Application Tracker</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-text-primary">
            {data.firstName} {data.lastName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Application ID: {data.applicationId}
          </p>
        </div>
        <Badge variant={statusVariant(data.status)}>
          {READABLE_STATUS[data.status] ?? data.status}
        </Badge>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-surface-border bg-surface-muted px-3.5 py-3">
          <p className="text-[0.6875rem] uppercase tracking-wide text-text-muted">
            Class Applied
          </p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">
            {data.classAdmitted}
          </p>
        </div>
        <div className="rounded-md border border-surface-border bg-surface-muted px-3.5 py-3">
          <p className="text-[0.6875rem] uppercase tracking-wide text-text-muted">
            Emergency Contact
          </p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">
            {data.emergencyContact}
          </p>
        </div>
        <div className="rounded-md border border-surface-border bg-surface-muted px-3.5 py-3 sm:col-span-2">
          <p className="text-[0.6875rem] uppercase tracking-wide text-text-muted">
            Address
          </p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">
            {data.address}
          </p>
        </div>
      </div>

      <div className="callout mt-6 text-sm">
        Keep this page bookmarked to track updates from school administration.
      </div>

      {/* Inline payment flow — shown whenever the application is sitting in
          `payment_pending`. Covers both the original full / installment
          submission and the post-principal-approval custom-payment flow,
          so the parent always lands on the same "Pay Now" experience. */}
      {data.status === "payment_pending" && (
        <div className="mt-6 rounded-lg border border-surface-border bg-surface-card p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <CreditCard
              size={20}
              className="mt-0.5 shrink-0 text-status-warning"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Complete your payment to continue
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                Pay the agreed amount through our secure gateway. Your
                application will move into principal review automatically
                after a successful payment.
              </p>
            </div>
          </div>
          <PaymentPanel
            application={data}
            onSuccess={async () => {
              // Reload the application so the page flips to the "Payment
              // received" banner and the PaymentPanel block hides itself
              // without a hard navigation.
              try {
                const refreshed = await getAdmissionById(data.applicationId);
                setData(refreshed);
              } catch {
                // Soft-fail: a stale read is fine; the banner will update
                // on the next page load.
              }
            }}
          />
        </div>
      )}

      {data.status === "approved" && (
        <div className="callout callout-success mt-6 p-5">
          <p className="eyebrow">Admission Confirmed</p>
          <h2 className="mt-1.5 text-lg font-semibold">
            Your admission letter is ready
          </h2>
          <p className="mt-1 text-sm opacity-90">
            Welcome to the school. Preview your confirmation letter or
            download the PDF for your records.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"}/api/admissions/${encodeURIComponent(data.applicationId)}/letter`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary btn-sm no-underline"
            >
              Preview Letter
            </a>
            <a
              href={`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"}/api/admissions/${encodeURIComponent(data.applicationId)}/letter/pdf`}
              className="btn-primary btn-sm no-underline"
            >
              Download PDF
            </a>
          </div>
        </div>
      )}

      {planStatus?.hasPlan &&
        planStatus.isCustomPlan === true &&
        planStatus.status === "rejected" && (
          <div className="callout callout-error mt-6 p-4">
            <p className="text-sm font-semibold">
              Custom fee request was rejected.
            </p>
            <p className="mt-1 text-xs opacity-90">
              Please choose a standard payment option below to continue.
            </p>

            {feeStructure && feeStructure.installmentOptions.length > 0 ? (
              <div className="mt-4 space-y-2">
                {feeStructure.installmentOptions.map((option, index) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md border border-surface-border bg-surface-card px-3.5 py-2.5"
                  >
                    <input
                      type="radio"
                      name="standardPlan"
                      checked={selectedOptionIndex === index}
                      onChange={() => setSelectedOptionIndex(index)}
                    />
                    <span className="text-sm text-text-primary">
                      {option.name} ({option.numberOfInstallments} installment
                      {option.numberOfInstallments > 1 ? "s" : ""})
                    </span>
                  </label>
                ))}

                <button
                  type="button"
                  onClick={handleCreateStandardPlan}
                  disabled={actionLoading}
                  className="btn-primary btn-sm mt-2"
                >
                  {actionLoading
                    ? "Creating Plan..."
                    : "Use Selected Standard Plan"}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-xs opacity-90">
                Standard fee options are not available yet. Please contact
                school administration.
              </p>
            )}
          </div>
        )}

      {paymentPlan &&
        (paymentPlan.status === "approved" ||
          paymentPlan.status === "completed") && (
          <div className="mt-6 rounded-lg border border-surface-border bg-surface-muted p-4 sm:p-5">
            <p className="text-sm font-semibold text-text-primary">
              {paymentPlan.isCustomPlan
                ? "Approved Custom Fee Plan"
                : "Standard Fee Plan"}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Total: ₹{paymentPlan.totalAmount.toLocaleString("en-IN")} | Paid:
              ₹{paymentPlan.paidAmount.toLocaleString("en-IN")} | Remaining: ₹
              {paymentPlan.remainingAmount.toLocaleString("en-IN")}
            </p>

            <div className="mt-4 space-y-2">
              {paymentPlan.installments.map((installment, index) => (
                <div
                  key={installment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-surface-border bg-surface-card px-3.5 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {installment.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Due: {installment.dueDate} | ₹
                      {installment.amount.toLocaleString("en-IN")}
                    </p>
                  </div>

                  {installment.isPaid ? (
                    <Badge variant="success">Paid</Badge>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePayInstallment(index)}
                      disabled={installmentPayingIndex !== null}
                      className="btn-primary btn-sm"
                    >
                      {installmentPayingIndex === index
                        ? "Processing..."
                        : "Pay Now"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
    </Card>
  );
}
