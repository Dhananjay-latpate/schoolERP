"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  PrincipalApiError,
  requestRefund,
  type FeeRefundMethod,
} from "@/lib/principalApi";

interface TransactionChoice {
  id: string;
  amount: number;
  method: string;
  paidAt: string;
  receiptNumber: string | null;
}

interface Props {
  accountId: string;
  totalPaid: number;
  transactions?: TransactionChoice[];
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

const METHODS: { value: FeeRefundMethod; label: string }[] = [
  { value: "online_gateway", label: "Online (gateway)" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank transfer / NEFT" },
  { value: "other", label: "Other" },
];

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export function RefundRequestModal({
  accountId,
  totalPaid,
  transactions = [],
  token,
  onClose,
  onSuccess,
}: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<FeeRefundMethod>("bank_transfer");
  const [reason, setReason] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [originalTransactionId, setOriginalTransactionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const rupees = parseFloat(amount);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setError("Enter a valid refund amount.");
      return;
    }
    if (rupees > totalPaid) {
      setError(`Cannot refund more than the paid amount (${formatINR(totalPaid)}).`);
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }
    setLoading(true);
    try {
      await requestRefund(token, {
        accountId,
        amount: rupees,
        method,
        reason: reason.trim(),
        bankDetails: bankDetails.trim() || undefined,
        originalTransactionId: originalTransactionId || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-surface-divider px-5 py-4">
          <h2 className="font-semibold text-text-primary">Request refund</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
          <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-text-secondary">
            Paid on this account so far: <strong>{formatINR(totalPaid)}</strong>
          </p>

          <div>
            <Label htmlFor="rf-amount">Refund amount (₹) *</Label>
            <Input
              id="rf-amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="rf-method">Refund method *</Label>
            <Select
              id="rf-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as FeeRefundMethod)}
              disabled={loading}
              className="mt-1"
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>

          {transactions.length > 0 && (
            <div>
              <Label htmlFor="rf-txn">Original transaction (optional)</Label>
              <Select
                id="rf-txn"
                value={originalTransactionId}
                onChange={(e) => setOriginalTransactionId(e.target.value)}
                disabled={loading}
                className="mt-1"
              >
                <option value="">— Not linked —</option>
                {transactions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {new Date(t.paidAt).toLocaleDateString("en-IN")} · {t.method} ·{" "}
                    {formatINR(t.amount)}
                    {t.receiptNumber ? ` · ${t.receiptNumber}` : ""}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {method !== "cash" && method !== "online_gateway" && (
            <div>
              <Label htmlFor="rf-bank">Bank / UPI details</Label>
              <Textarea
                id="rf-bank"
                rows={2}
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                disabled={loading}
                placeholder="A/c number, IFSC, UPI ID, cheque #, etc."
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="rf-reason">Reason *</Label>
            <Textarea
              id="rf-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              placeholder="e.g., Withdrawal — refund 2nd installment per policy."
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-status-error">{error}</p>}

          <p className="text-xs text-text-muted">
            Refunds need principal approval, then execution to post the ledger reversal.
          </p>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
