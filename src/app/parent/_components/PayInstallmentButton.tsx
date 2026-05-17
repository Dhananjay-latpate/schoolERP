"use client";

import { useEffect, useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  ParentApiError,
  createParentCashfreeOrder,
  createParentPaymentOrder,
  getParentPaymentConfig,
  verifyParentCashfreePayment,
  verifyParentPayment,
  type ParentPaymentConfig,
} from "@/lib/parentFeesApi";

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const CASHFREE_SCRIPT_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

// Gateway config is identical for every button on the page. Cache the
// in-flight promise at module scope so N pending-installment buttons share
// a single network request instead of each firing their own.
let configCache: Promise<ParentPaymentConfig> | null = null;
function loadPaymentConfig(token: string): Promise<ParentPaymentConfig> {
  if (!configCache) {
    configCache = getParentPaymentConfig(token).catch((err) => {
      configCache = null; // allow a retry on next mount
      throw err;
    });
  }
  return configCache;
}

// Thrown internally to mark a user-cancelled checkout (no toast needed).
class PaymentCancelled extends Error {}

interface Props {
  token: string;
  installmentId: string;
  studentName: string;
  contact?: string | null;
  // Amount to pay for this installment. Omit to pay the full installment;
  // pass a smaller value for a partial payment.
  amount?: number;
  disabled?: boolean;
  onPaid: (receiptNumber: string) => void;
  onError?: (message: string) => void;
  label?: string;
}

type Busy = "idle" | "ordering" | "checkout" | "verifying";

export function PayInstallmentButton({
  token,
  installmentId,
  studentName,
  contact,
  amount,
  disabled: disabledProp = false,
  onPaid,
  onError,
  label = "Pay now",
}: Props) {
  const [busy, setBusy] = useState<Busy>("idle");
  const [config, setConfig] = useState<ParentPaymentConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPaymentConfig(token)
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        if (!cfg.configured) {
          setConfigError("Online payments are not configured yet. Please pay at the counter.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setConfigError(
          err instanceof ParentApiError ? err.message : "Could not load payment config",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleRazorpay = async () => {
    setBusy("ordering");
    await loadScript(RAZORPAY_SCRIPT_URL);
    const order = await createParentPaymentOrder(token, installmentId, amount);
    if (!order.key_id || !order.order?.id) {
      throw new Error("Razorpay is not configured on the server");
    }
    const RazorpayCtor = (window as any).Razorpay;
    if (!RazorpayCtor) throw new Error("Razorpay SDK not available");

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };
      try {
        const rzp = new RazorpayCtor({
          key: order.key_id,
          order_id: order.order.id,
          amount: order.order.amount,
          currency: order.order.currency,
          name: "School Fees",
          description: order.installmentDetails.name,
          prefill: contact ? { contact } : undefined,
          notes: { student: studentName, installment: order.installmentDetails.name },
          theme: { color: "#0b6e5f" },
          handler: async (response: any) => {
            setBusy("verifying");
            try {
              const result = await verifyParentPayment(token, {
                installmentId,
                amount,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              finish(() => {
                onPaid(result.receiptNumber);
                resolve();
              });
            } catch (err) {
              finish(() => reject(err));
            }
          },
          modal: {
            ondismiss: () => finish(() => reject(new PaymentCancelled("cancelled"))),
          },
        });
        rzp.on("payment.failed", (response: any) =>
          finish(() => reject(new Error(response?.error?.description ?? "Payment failed"))),
        );
        setBusy("checkout");
        rzp.open();
      } catch (err) {
        // rzp.open() / constructor can throw synchronously — never hang.
        finish(() => reject(err instanceof Error ? err : new Error("Checkout failed")));
      }
    });
  };

  const handleCashfree = async (cashfreeEnv: string) => {
    setBusy("ordering");
    await loadScript(CASHFREE_SCRIPT_URL);
    const order = await createParentCashfreeOrder(
      token,
      installmentId,
      { customerPhone: contact ?? undefined },
      amount,
    );
    const Ctor = (window as any).Cashfree;
    if (!Ctor) throw new Error("Cashfree SDK not available");
    const cashfree = Ctor({
      mode: cashfreeEnv === "production" ? "production" : "sandbox",
    });
    setBusy("checkout");

    const result: any = await cashfree.checkout({
      paymentSessionId: order.paymentSessionId,
      redirectTarget: "_modal",
    });

    if (result?.error) {
      throw new Error(result.error.message ?? "Payment failed");
    }
    // The modal closed. If no payment was actually made (user closed it),
    // there is no paymentDetails — treat that as a silent cancellation
    // rather than verifying and surfacing a scary failure.
    if (!result?.paymentDetails) {
      throw new PaymentCancelled("cancelled");
    }
    setBusy("verifying");
    const verified = await verifyParentCashfreePayment(token, {
      installmentId,
      orderId: order.orderId,
      amount,
    });
    onPaid(verified.receiptNumber);
  };

  const handleClick = async () => {
    if (!config) {
      onError?.(configError ?? "Payment gateway not ready");
      return;
    }
    if (!config.configured) {
      onError?.("Online payments are not configured yet. Please pay at the counter.");
      return;
    }
    try {
      if (config.gateway === "cashfree") {
        await handleCashfree(config.cashfreeEnv);
      } else {
        await handleRazorpay();
      }
    } catch (err) {
      if (err instanceof PaymentCancelled) {
        // user closed the checkout — no error toast
      } else {
        const msg = err instanceof ParentApiError ? err.message : (err as Error).message;
        onError?.(msg || "Could not complete payment");
      }
    } finally {
      setBusy("idle");
    }
  };

  const isWorking = busy !== "idle";
  const disabled =
    isWorking || !!configError || !config?.configured || disabledProp;

  return (
    <Button
      onClick={() => void handleClick()}
      disabled={disabled}
      className="btn-pay"
      title={configError ?? undefined}
    >
      {isWorking ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      {busy === "ordering"
        ? "Preparing…"
        : busy === "verifying"
          ? "Verifying…"
          : busy === "checkout"
            ? "Opening checkout…"
            : label}
    </Button>
  );
}
