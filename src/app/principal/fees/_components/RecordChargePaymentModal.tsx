"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { recordChargePayment, PrincipalApiError } from "@/lib/principalApi";

interface Props {
  charge: { id: string; name: string; due: number };
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

const METHODS = ["cash", "cheque", "neft", "upi", "dd", "other"];

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

// Settles a standalone service / ad-hoc charge in full at the counter.
export function RecordChargePaymentModal({
  charge,
  token,
  onClose,
  onSuccess,
}: Props) {
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await recordChargePayment(token, charge.id, {
        method,
        transactionId: reference || undefined,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(
        err instanceof PrincipalApiError ? err.message : "Payment recording failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-text-primary">Record Charge Payment</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
          <div className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2 text-sm">
            <span className="text-text-secondary">{charge.name}</span>
            <span className="float-right font-semibold text-text-primary">
              {formatINR(charge.due)}
            </span>
          </div>
          <p className="text-xs text-text-muted">
            The charge is settled in full for its outstanding amount.
          </p>

          <div>
            <Label htmlFor="charge-pay-method">Method *</Label>
            <Select
              id="charge-pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={loading}
              className="mt-1"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="charge-pay-ref">Reference / Receipt #</Label>
            <Input
              id="charge-pay-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={loading}
              placeholder="Optional cheque/UPI ref"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="charge-pay-notes">Notes</Label>
            <Textarea
              id="charge-pay-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="btn-pay">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
