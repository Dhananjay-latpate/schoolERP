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
    const status = await getCustomPlanStatus(applicationId);
    setPlanStatus(status);

    if (status.hasPlan) {
      const plan = await getPaymentPlan(applicationId);
      setPaymentPlan(plan);
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
      const admissionYear =
        (data as AdmissionRecord & { admissionYear?: string }).admissionYear ??
        new Date().getFullYear().toString();
      const structure = await getFeeStructure(
        className as string,
        admissionYear,
      );
      setFeeStructure(structure);
      setSelectedOptionIndex(0);
    } else {
      setFeeStructure(null);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await getAdmissionById(params.id);
        setData(result);
        const status = await getCustomPlanStatus(result.applicationId);
        setPlanStatus(status);

        if (status.hasPlan) {
          const plan = await getPaymentPlan(result.applicationId);
          setPaymentPlan(plan);
        }

        if (
          status.hasPlan &&
          status.isCustomPlan === true &&
          status.status === "rejected" &&
          result.classAdmitted
        ) {
          const admissionYear =
            (result as AdmissionRecord & { admissionYear?: string })
              .admissionYear ?? new Date().getFullYear().toString();
          const structure = await getFeeStructure(
            result.classAdmitted,
            admissionYear,
          );
          setFeeStructure(structure);
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
      <Card className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-text-secondary">
          Loading application status...
        </p>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-rose-600">
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

  const showSuccessBanner = ["submitted", "payment_completed"].includes(
    data.status,
  );

  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-8">
      {showSuccessBanner && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              aria-hidden="true"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-emerald-900">
              {data.status === "payment_completed"
                ? "Payment received — application submitted"
                : "Application submitted successfully"}
            </p>
            <p className="mt-0.5 text-xs text-emerald-800">
              Save your application ID{" "}
              <span className="rounded bg-white/80 px-1.5 py-0.5 font-mono font-bold">
                {data.applicationId}
              </span>{" "}
              to track status. The principal will review your application and
              you'll receive an admission decision soon.
            </p>
            <p className="mt-2 text-xs text-emerald-700">
              You'll be able to upload required documents once the school
              admission office contacts you.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
            Application Tracker
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">
            {data.firstName} {data.lastName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Application ID: {data.applicationId}
          </p>
        </div>
        <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-surface-border bg-surface-muted p-3">
          <p className="text-xs uppercase text-text-muted">Class Applied</p>
          <p className="text-sm font-semibold text-text-primary">
            {data.classAdmitted}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-muted p-3">
          <p className="text-xs uppercase text-text-muted">Emergency Contact</p>
          <p className="text-sm font-semibold text-text-primary">
            {data.emergencyContact}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-muted p-3 sm:col-span-2">
          <p className="text-xs uppercase text-text-muted">Address</p>
          <p className="text-sm font-semibold text-text-primary">
            {data.address}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-brand-sky/20 bg-brand-sky/10 p-4 text-sm text-text-secondary">
        Keep this page bookmarked to track updates from school administration.
      </div>

      {data.status === "approved" && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Admission Confirmed
          </p>
          <h2 className="mt-1 text-lg font-bold text-emerald-900">
            Your admission letter is ready
          </h2>
          <p className="mt-1 text-sm text-emerald-800">
            Welcome to the school. Preview your confirmation letter or
            download the PDF for your records.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"}/api/admissions/${encodeURIComponent(data.applicationId)}/letter`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-emerald-700 bg-surface-card px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              Preview Letter
            </a>
            <a
              href={`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"}/api/admissions/${encodeURIComponent(data.applicationId)}/letter/pdf`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Download PDF
            </a>
          </div>
        </div>
      )}

      {planStatus?.hasPlan && planStatus.status === "pending_approval" && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            Custom fee request is pending principal review.
          </p>
          <p className="mt-1 text-xs text-amber-700">
            You will be able to pay once the request is approved.
          </p>
        </div>
      )}

      {planStatus?.hasPlan &&
        planStatus.isCustomPlan === true &&
        planStatus.status === "rejected" && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-800">
              Custom fee request was rejected.
            </p>
            <p className="mt-1 text-xs text-rose-700">
              Please choose a standard payment option below to continue.
            </p>

            {feeStructure && feeStructure.installmentOptions.length > 0 ? (
              <div className="mt-4 space-y-2">
                {feeStructure.installmentOptions.map((option, index) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-rose-200 bg-surface-card px-3 py-2"
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
                  className="mt-2 rounded-lg bg-brand-royal px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading
                    ? "Creating Plan..."
                    : "Use Selected Standard Plan"}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-rose-700">
                Standard fee options are not available yet. Please contact
                school administration.
              </p>
            )}
          </div>
        )}

      {paymentPlan &&
        (paymentPlan.status === "approved" ||
          paymentPlan.status === "completed") && (
          <div className="mt-6 rounded-xl border border-surface-border bg-surface-muted p-4">
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
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2"
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
                      className="rounded-lg bg-brand-royal px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
