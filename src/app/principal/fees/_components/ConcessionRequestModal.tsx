"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PrincipalApiError, requestConcession } from "@/lib/principalApi";
import type { FeeConcessionType } from "@/types/fees";

interface Props {
  accountId: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPES: { value: FeeConcessionType; label: string }[] = [
  { value: "sibling", label: "Sibling Discount" },
  { value: "staff_child", label: "Staff Child" },
  { value: "rte", label: "RTE (Right to Education)" },
  { value: "ews", label: "EWS (Economically Weaker)" },
  { value: "scholarship", label: "Scholarship" },
  { value: "merit", label: "Merit Award" },
  { value: "principal_discretion", label: "Principal Discretion" },
  { value: "other", label: "Other" },
];

export function ConcessionRequestModal({ accountId, token, onClose, onSuccess }: Props) {
  const [type, setType] = useState<FeeConcessionType>("sibling");
  const [mode, setMode] = useState<"amount" | "percentage">("amount");
  const [amount, setAmount] = useState("");
  const [percentage, setPercentage] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }

    let amt: number | undefined;
    let pct: number | undefined;
    if (mode === "amount") {
      amt = parseFloat(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        setError("Enter a valid amount.");
        return;
      }
    } else {
      pct = parseFloat(percentage);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        setError("Percentage must be between 0 and 100.");
        return;
      }
    }

    setLoading(true);
    try {
      await requestConcession(token, {
        accountId,
        type,
        amount: amt,
        percentage: pct,
        reason: reason.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-text-primary">Request concession</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
          <div>
            <Label htmlFor="conc-type">Type *</Label>
            <Select
              id="conc-type"
              value={type}
              onChange={(e) => setType(e.target.value as FeeConcessionType)}
              disabled={loading}
              className="mt-1"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Calculation</Label>
            <div className="mt-1 flex gap-2 rounded-md border border-surface-border bg-white p-1">
              <button
                type="button"
                onClick={() => setMode("amount")}
                className={`flex-1 rounded px-3 py-1.5 text-sm transition ${
                  mode === "amount"
                    ? "bg-brand-royal/10 font-semibold text-brand-royal"
                    : "text-text-secondary"
                }`}
              >
                Fixed amount
              </button>
              <button
                type="button"
                onClick={() => setMode("percentage")}
                className={`flex-1 rounded px-3 py-1.5 text-sm transition ${
                  mode === "percentage"
                    ? "bg-brand-royal/10 font-semibold text-brand-royal"
                    : "text-text-secondary"
                }`}
              >
                Percentage
              </button>
            </div>
          </div>

          {mode === "amount" ? (
            <div>
              <Label htmlFor="conc-amount">Amount (₹) *</Label>
              <Input
                id="conc-amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                className="mt-1"
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="conc-pct">Percentage of total charged *</Label>
              <Input
                id="conc-pct"
                type="number"
                min="1"
                max="100"
                step="0.1"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                disabled={loading}
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="conc-reason">Reason / Justification *</Label>
            <Textarea
              id="conc-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              placeholder="e.g., Elder sibling enrolled in class 8, qualifies for sibling discount."
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <p className="text-xs text-text-muted">
            The request will be queued for principal approval. On approval, a concession
            ledger entry is posted and account totals are recalculated.
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
