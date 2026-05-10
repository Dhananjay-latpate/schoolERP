"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, CreditCard, Loader2, XCircle } from "lucide-react";
import {
  createCashfreeOrder,
  createRazorpayOrder,
  getPaymentConfig,
  verifyCashfreePayment,
  verifyRazorpayPayment,
  type AdmissionRecord,
  type PaymentConfigResponse,
  type PaymentGateway,
} from "@/lib/api";

type PaymentStatus =
  | "idle"
  | "loading_config"
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

const STATUS_MESSAGES: Record<PaymentStatus, string | null> = {
  idle: null,
  loading_config: "Loading secure payment…",
  creating_order: "Preparing your payment order…",
  paying: null,
  verifying: "Verifying payment, please wait…",
  success: "Payment successful! Redirecting…",
  failed: "Payment could not be completed. Please try again.",
};

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const CASHFREE_SCRIPT_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`Failed to load payment script: ${src}`));
    document.body.appendChild(script);
  });
}

export function PaymentPanel({
  application,
  onSuccess,
  onBack,
}: PaymentPanelProps) {
  const [status, setStatus] = useState<PaymentStatus>("loading_config");
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PaymentConfigResponse | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Discover which gateway is active, then preload its checkout script.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getPaymentConfig();
        if (cancelled) return;
        setConfig(cfg);
        const scriptUrl =
          cfg.gateway === "razorpay" ? RAZORPAY_SCRIPT_URL : CASHFREE_SCRIPT_URL;
        await loadScriptOnce(scriptUrl);
        if (cancelled) return;
        setStatus("idle");
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load payment gateway",
        );
        setStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function payWithRazorpay() {
    const order = await createRazorpayOrder(application.applicationId, 0);

    setStatus("paying");

    if (!window.Razorpay) {
      throw new Error("Razorpay checkout failed to load");
    }

    const razorpay = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "Resillix School",
      description: `Admission Fee — ${application.classAdmitted ?? ""} (${application.applicationId})`,
      prefill: {
        name: `${application.firstName} ${application.lastName}`,
      },
      theme: { color: "#1A4DAD" },
      handler: async (response) => {
        if (!mounted.current) return;
        setStatus("verifying");
        try {
          await verifyRazorpayPayment({
            applicationId: application.applicationId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (!mounted.current) return;
          setStatus("success");
          setTimeout(onSuccess, 1200);
        } catch (err) {
          if (!mounted.current) return;
          setError(
            err instanceof Error ? err.message : "Payment verification failed",
          );
          setStatus("failed");
        }
      },
      modal: {
        ondismiss: () => {
          if (mounted.current) setStatus("idle");
        },
      },
    });

    razorpay.open();
  }

  async function payWithCashfree(env: "sandbox" | "production") {
    if (!window.Cashfree) {
      throw new Error("Cashfree checkout failed to load");
    }

    const order = await createCashfreeOrder(application.applicationId, 0, {
      customerPhone: application.emergencyContact,
    });

    setStatus("paying");

    const cashfree = window.Cashfree({ mode: env });
    const result = await cashfree.checkout({
      paymentSessionId: order.paymentSessionId,
      redirectTarget: "_modal",
    });

    if (!mounted.current) return;

    if (result.error) {
      setError(result.error.message ?? "Payment was cancelled");
      setStatus("failed");
      return;
    }

    if (result.redirect) {
      // Hosted checkout took the user away; verification will resume on return.
      return;
    }

    setStatus("verifying");
    try {
      await verifyCashfreePayment({
        applicationId: application.applicationId,
        orderId: order.orderId,
      });
      if (!mounted.current) return;
      setStatus("success");
      setTimeout(onSuccess, 1200);
    } catch (err) {
      if (!mounted.current) return;
      setError(
        err instanceof Error ? err.message : "Payment verification failed",
      );
      setStatus("failed");
    }
  }

  async function initiatePayment() {
    if (!config) return;
    setError(null);
    setStatus("creating_order");

    try {
      if (config.gateway === "razorpay") {
        await payWithRazorpay();
      } else {
        await payWithCashfree(config.cashfreeEnv);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start payment");
      setStatus("failed");
    }
  }

  const isBusy =
    status === "loading_config" ||
    status === "creating_order" ||
    status === "verifying";
  const statusMessage = STATUS_MESSAGES[status];
  const gatewayLabel: Record<PaymentGateway, string> = {
    razorpay: "Razorpay",
    cashfree: "Cashfree",
  };
  const activeGateway = config?.gateway ?? "cashfree";

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
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
            <span className="text-text-muted">Payment Type</span>
            <span className="font-medium text-text-primary capitalize">
              {application.paymentMethod === "installment"
                ? "Installments"
                : "Full Payment"}
            </span>
          </div>
        </div>
      </div>

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

      {status !== "success" && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={initiatePayment}
            disabled={isBusy || !config}
            className="btn-pay flex w-full items-center justify-center gap-2"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {isBusy
              ? "Processing…"
              : `Pay Now via ${gatewayLabel[activeGateway]}`}
          </button>

          {onBack && status !== "creating_order" && status !== "verifying" && (
            <button type="button" onClick={onBack} className="btn-ghost w-full">
              ← Back to Application
            </button>
          )}
        </div>
      )}

      <p className="text-center text-xs text-text-muted">
        Secured by {gatewayLabel[activeGateway]}. Your payment information is
        encrypted and never stored on our servers.
      </p>
    </div>
  );
}
