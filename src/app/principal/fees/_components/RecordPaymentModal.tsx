"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { recordManualPayment, PrincipalApiError } from "@/lib/principalApi";

interface InstallmentChoice {
  id: string;
  name: string;
  dueDate: string;
  amount: number;
  isPaid: boolean;
  paidAmount: number | null;
}

interface Props {
  applicationId: string;
  installments: InstallmentChoice[];
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

const METHODS = ["cash", "cheque", "neft", "upi", "dd", "other"];

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

// What is still owed on an installment = face amount minus whatever has
// already been paid against it. A partial payment leaves a positive balance.
const outstandingOf = (i: { amount: number; paidAmount: number | null }) =>
  Math.max(0, Math.round((i.amount - (i.paidAmount ?? 0)) * 100) / 100);

export function RecordPaymentModal({
  applicationId,
  installments,
  token,
  onClose,
  onSuccess,
}: Props) {
  const unpaid = installments.filter((i) => !i.isPaid);
  const [installmentId, setInstallmentId] = useState(unpaid[0]?.id ?? "");
  const [amount, setAmount] = useState(
    unpaid[0] ? outstandingOf(unpaid[0]).toString() : "",
  );
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedInstallment = installments.find((i) => i.id === installmentId);
  const outstanding = selectedInstallment ? outstandingOf(selectedInstallment) : 0;
  const isPartial =
    selectedInstallment != null &&
    (selectedInstallment.paidAmount ?? 0) > 0 &&
    !selectedInstallment.isPaid;

  const handleInstallmentChange = (id: string) => {
    setInstallmentId(id);
    const inst = installments.find((i) => i.id === id);
    if (inst) setAmount(outstandingOf(inst).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!installmentId) {
      setError("Select an installment to record payment against.");
      return;
    }
    const rupees = parseFloat(amount);
    if (isNaN(rupees) || rupees <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (rupees > outstanding + 0.01) {
      setError(
        `Amount can't exceed the ${formatINR(outstanding)} outstanding on this installment.`,
      );
      return;
    }

    setLoading(true);
    try {
      await recordManualPayment(token, {
        applicationId,
        installmentId,
        amount: rupees,
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
          <h2 className="font-semibold text-text-primary">Record Payment</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
          {unpaid.length === 0 ? (
            <p className="text-sm text-text-muted">
              All installments are already fully paid.
            </p>
          ) : (
            <>
              <div>
                <Label htmlFor="pay-installment">Installment *</Label>
                <Select
                  id="pay-installment"
                  value={installmentId}
                  onChange={(e) => handleInstallmentChange(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                >
                  {unpaid.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} · due {i.dueDate} · {formatINR(outstandingOf(i))} outstanding
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="pay-amount">Amount (₹) *</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="1"
                  max={outstanding}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-text-muted">
                  {formatINR(outstanding)} outstanding
                  {isPartial && selectedInstallment
                    ? ` (${formatINR(selectedInstallment.paidAmount ?? 0)} already paid)`
                    : ""}
                  . A partial payment is fine — the balance stays due.
                </p>
              </div>

              <div>
                <Label htmlFor="pay-method">Method *</Label>
                <Select
                  id="pay-method"
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
                <Label htmlFor="pay-ref">Reference / Receipt #</Label>
                <Input
                  id="pay-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  disabled={loading}
                  placeholder="Optional cheque/UPI ref"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="pay-notes">Notes</Label>
                <Textarea
                  id="pay-notes"
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
            </>
          )}
        </form>
      </div>
    </div>
  );
}
