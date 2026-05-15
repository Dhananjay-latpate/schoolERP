"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  ParentApiError,
  createParentPaymentOrder,
  verifyParentPayment,
} from "@/lib/parentFeesApi";

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay script"));
    document.body.appendChild(script);
  });
}

interface Props {
  token: string;
  installmentId: string;
  studentName: string;
  contact?: string | null;
  onPaid: (receiptNumber: string) => void;
  onError?: (message: string) => void;
  label?: string;
}

export function PayInstallmentButton({
  token,
  installmentId,
  studentName,
  contact,
  onPaid,
  onError,
  label = "Pay now",
}: Props) {
  const [busy, setBusy] = useState<"idle" | "ordering" | "checkout" | "verifying">(
    "idle",
  );

  const handleClick = async () => {
    setBusy("ordering");
    try {
      await loadScript(RAZORPAY_SCRIPT_URL);
      const order = await createParentPaymentOrder(token, installmentId);
      if (!order.key_id || !order.order?.id) {
        throw new Error("Gateway is not configured");
      }
      setBusy("checkout");

      const RazorpayCtor = (window as any).Razorpay;
      if (!RazorpayCtor) throw new Error("Razorpay SDK not available");
      const rzp = new RazorpayCtor({
        key: order.key_id,
        order_id: order.order.id,
        amount: order.order.amount,
        currency: order.order.currency,
        name: "School Fees",
        description: order.installmentDetails.name,
        prefill: contact ? { contact } : undefined,
        notes: {
          student: studentName,
          installment: order.installmentDetails.name,
        },
        theme: { color: "#0b6e5f" },
        handler: async (response: any) => {
          setBusy("verifying");
          try {
            const result = await verifyParentPayment(token, {
              installmentId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            onPaid(result.receiptNumber);
          } catch (err) {
            const msg =
              err instanceof ParentApiError ? err.message : "Verification failed";
            onError?.(msg);
          } finally {
            setBusy("idle");
          }
        },
        modal: {
          ondismiss: () => setBusy("idle"),
        },
      });
      rzp.on("payment.failed", (response: any) => {
        onError?.(response?.error?.description ?? "Payment failed");
        setBusy("idle");
      });
      rzp.open();
    } catch (err) {
      const msg = err instanceof ParentApiError ? err.message : (err as Error).message;
      onError?.(msg || "Could not start payment");
      setBusy("idle");
    }
  };

  const isWorking = busy !== "idle";
  return (
    <Button
      onClick={() => void handleClick()}
      disabled={isWorking}
      className="btn-pay"
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
