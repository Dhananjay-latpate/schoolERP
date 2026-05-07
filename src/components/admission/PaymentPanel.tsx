"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, CreditCard, Loader2, XCircle } from "lucide-react";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  type AdmissionRecord,
} from "@/lib/api";

type PaymentStatus =
  | "idle"
  | "creating_order"
  | "paying"
  | "verifying"
  | "success"
  | "failed";

interface PaymentPanelProps {
  application: AdmissionRecord;
  onSuccess: () => void;
  onBack?: () => void;
}

function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

const STATUS_MESSAGES: Record<PaymentStatus, string | null> = {
  idle: null,
  creating_order: "Preparing your payment order…",
  paying: null, // Razorpay modal is open
  verifying: "Verifying payment, please wait…",
  success: "Payment successful! Redirecting…",
  failed: "Payment could not be completed. Please try again.",
};

export function PaymentPanel({
  application,
  onSuccess,
  onBack,
}: PaymentPanelProps) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const scriptLoaded = useRef(false);

  // Load Razorpay checkout script once on mount
  useEffect(() => {
    if (scriptLoaded.current || typeof window === "undefined") return;
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      scriptLoaded.current = true;
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
    };
    document.body.appendChild(script);
  }, []);

  async function initiatePayment() {
    setError(null);
    setStatus("creating_order");

    try {
      // Amount comes in paise from backend; use 0 as placeholder — backend derives from applicationId
      const order = await createRazorpayOrder(application.applicationId, 0);

      setStatus("paying");

      const razorpay = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Resillix School",
        description: `Admission Fee — ${application.classAdmitted} (${application.applicationId})`,
        prefill: {
          name: `${application.firstName} ${application.lastName}`,
        },
        theme: { color: "#1A4DAD" },
        handler: async (response) => {
          setStatus("verifying");
          try {
            await verifyRazorpayPayment({
              applicationId: application.applicationId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setStatus("success");
            setTimeout(onSuccess, 1200);
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : "Payment verification failed";
            setError(message);
            setStatus("failed");
          }
        },
        modal: {
          ondismiss: () => {
            if (status === "paying") setStatus("idle");
          },
        },
      });

      razorpay.open();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create order";
      setError(message);
      setStatus("failed");
    }
  }

  const isBusy = status === "creating_order" || status === "verifying";
  const statusMessage = STATUS_MESSAGES[status];

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">
          Complete Payment
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Application{" "}
          <span className="font-mono text-brand-royal">
            {application.applicationId}
          </span>
        </p>
      </div>

      {/* Application summary card */}
      <div className="card-accent">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-royal">
          Application Summary
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Applicant</span>
            <span className="font-medium text-text-primary">
              {application.firstName}{" "}
              {application.middleName ? `${application.middleName} ` : ""}
              {application.lastName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Class</span>
            <span className="font-medium text-text-primary">
              {application.classAdmitted}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Academic Year</span>
            <span className="font-medium text-text-primary">2025–26</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Payment Type</span>
            <span className="font-medium text-text-primary capitalize">
              {application.paymentMethod === "installment"
                ? "Installments"
                : "Full Payment"}
            </span>
          </div>
        </div>
      </div>

      {/* Status messages */}
      {status === "success" && (
        <div className="flex items-center gap-3 rounded-xl border border-brand-emerald bg-brand-emerald-light px-4 py-3 text-sm font-medium text-emerald-800">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
          {statusMessage}
        </div>
      )}

      {status === "failed" && (
        <div className="flex items-center gap-3 rounded-xl border border-brand-rose bg-brand-rose-light px-4 py-3 text-sm font-medium text-rose-800">
          <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
          {error || statusMessage}
        </div>
      )}

      {isBusy && (
        <div className="flex items-center gap-3 rounded-xl border border-surface-divider bg-surface-muted px-4 py-3 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-brand-royal" />
          {statusMessage}
        </div>
      )}

      {/* Action buttons */}
      {status !== "success" && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={initiatePayment}
            disabled={isBusy}
            className="btn-pay flex w-full items-center justify-center gap-2"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {isBusy ? "Processing…" : "Pay Now via Razorpay"}
          </button>

          {onBack && status !== "creating_order" && status !== "verifying" && (
            <button type="button" onClick={onBack} className="btn-ghost w-full">
              ← Back to Application
            </button>
          )}
        </div>
      )}

      <p className="text-center text-xs text-text-muted">
        Secured by Razorpay. Your payment information is encrypted and never
        stored on our servers.
      </p>
    </div>
  );
}
