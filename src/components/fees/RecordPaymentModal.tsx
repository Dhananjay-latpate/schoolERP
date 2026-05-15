"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { recordManualPayment, PrincipalApiError } from "@/lib/principalApi";

interface Props {
  applicationId: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

const METHODS = ["cash", "cheque", "neft", "upi", "dd", "other"];

export function RecordPaymentModal({
  applicationId,
  token,
  onClose,
  onSuccess,
}: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rupees = parseFloat(amount);
    if (isNaN(rupees) || rupees <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      // recordManualPayment expects RUPEES (legacy Float backend)
      await recordManualPayment(token, {
        applicationId,
        amount: rupees,
        method,
        transactionId: reference || undefined,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(
        err instanceof PrincipalApiError
          ? err.message
          : "Payment recording failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Record Manual Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          <div>
            <Label htmlFor="pay-amount">Amount (₹) *</Label>
            <Input
              id="pay-amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="pay-method">Payment Method *</Label>
            <select
              id="pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={loading}
              className="mt-1 block w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm shadow-sm focus:border-brand-royal focus:outline-none focus:ring-1 focus:ring-brand-royal"
            >
              {METHODS.map((m) => (
                <option key={m} value={m} className="capitalize">
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="pay-ref">Reference / Receipt No.</Label>
            <Input
              id="pay-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="pay-notes">Notes</Label>
            <Textarea
              id="pay-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
