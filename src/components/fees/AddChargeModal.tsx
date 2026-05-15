"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { assignFeeCharge, PrincipalApiError } from "@/lib/principalApi";
import { rupeesToPaise } from "@/lib/money";
import type { FeeAssignmentType } from "@/types/fees";

interface Props {
  accountId: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddChargeModal({
  accountId,
  token,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FeeAssignmentType>("misc");
  const [feeHeadId, setFeeHeadId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rupees = parseFloat(amount);
    if (!name.trim() || isNaN(rupees) || rupees <= 0) {
      setError("Please fill in all required fields with valid values.");
      return;
    }

    setLoading(true);
    try {
      await assignFeeCharge(token, {
        accountId,
        type,
        feeHeadId: feeHeadId || undefined,
        name: name.trim(),
        amountInPaise: rupeesToPaise(rupees), // convert rupees → paise for backend
        dueDate: dueDate || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(
        err instanceof PrincipalApiError ? err.message : "Failed to add charge",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Add Fee Charge</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          <div>
            <Label htmlFor="charge-type">Type *</Label>
            <select
              id="charge-type"
              value={type}
              onChange={(e) => setType(e.target.value as FeeAssignmentType)}
              disabled={loading}
              className="mt-1 w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-royal"
            >
              <option value="misc">Miscellaneous</option>
              <option value="transport">Transport</option>
              <option value="hostel">Hostel</option>
              <option value="exam">Exam</option>
              <option value="activity">Activity</option>
            </select>
          </div>
          <div>
            <Label htmlFor="charge-name">Charge Name *</Label>
            <Input
              id="charge-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tuition Fee Q1"
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="charge-amount">Amount (₹) *</Label>
            <Input
              id="charge-amount"
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
            <Label htmlFor="charge-due">Due Date</Label>
            <Input
              id="charge-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
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
              Add Charge
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
