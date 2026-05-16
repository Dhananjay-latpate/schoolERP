"use client";

import { useEffect, useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  ParentApiError,
  createChargePaymentOrder,
  getParentPaymentConfig,
  verifyChargePayment,
  type ParentPaymentConfig,
} from "@/lib/parentFeesApi";

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
// in-flight promise at module scope so N pay-charge buttons share a single
// network request instead of each firing their own.
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
  chargeId: string;
  contact?: string | null;
  onPaid: () => void;
  onError?: (message: string) => void;
  label?: string;
}

type Busy = "idle" | "ordering" | "checkout" | "verifying";

export function PayChargeButton({
  token,
  chargeId,
  contact,
  onPaid,
  onError,
  label = "Pay Now",
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
          setConfigError(
            "Online payments are not configured yet. Please pay at the counter.",
          );
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

  const handleCashfree = async (cashfreeEnv: string) => {
    setBusy("ordering");
    await loadScript(CASHFREE_SCRIPT_URL);
    const order = await createChargePaymentOrder(token, {
      chargeId,
      customerPhone: contact ?? undefined,
    });
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
    await verifyChargePayment(token, { chargeId, orderId: order.orderId });
    onPaid();
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
    if (config.gateway !== "cashfree") {
      onError?.("Online payment for this charge is only available via Cashfree.");
      return;
    }
    try {
      await handleCashfree(config.cashfreeEnv);
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
  const disabled = isWorking || !!configError || !config?.configured;

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
