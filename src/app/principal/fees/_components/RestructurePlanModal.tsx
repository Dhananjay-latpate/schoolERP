"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  PrincipalApiError,
  restructureRemainingInstallments,
} from "@/lib/principalApi";

interface ExistingInstallment {
  id: string;
  name: string;
  dueDate: string;
  amount: number;
  isPaid: boolean;
}

interface Props {
  applicationId: string;
  installments: ExistingInstallment[];
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Draft {
  name: string;
  dueDate: string;
  amount: string;
}

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export function RestructurePlanModal({
  applicationId,
  installments,
  token,
  onClose,
  onSuccess,
}: Props) {
  const unpaid = useMemo(() => installments.filter((i) => !i.isPaid), [installments]);
  const remainingRupees = useMemo(
    () => unpaid.reduce((s, i) => s + i.amount, 0),
    [unpaid],
  );
  const remainingCents = Math.round(remainingRupees * 100);

  const [drafts, setDrafts] = useState<Draft[]>(() =>
    unpaid.length === 0
      ? [{ name: "Installment 1", dueDate: "", amount: "" }]
      : unpaid.map((i, idx) => ({
          name: i.name || `Installment ${idx + 1}`,
          dueDate: i.dueDate,
          amount: String(i.amount),
        })),
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draftTotalCents = drafts.reduce(
    (s, d) => s + Math.round(Number(d.amount || 0) * 100),
    0,
  );
  const totalsMatch = draftTotalCents === remainingCents;

  const updateDraft = (index: number, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };
  const addRow = () => {
    const nextIndex = drafts.length + 1;
    setDrafts((prev) => [
      ...prev,
      { name: `Installment ${nextIndex}`, dueDate: "", amount: "" },
    ]);
  };
  const removeRow = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (drafts.length === 0) {
      setError("At least one installment is required.");
      return;
    }
    if (!totalsMatch) {
      setError(
        `New installments must sum to the unpaid balance (${formatINR(remainingRupees)}).`,
      );
      return;
    }
    for (const [i, d] of drafts.entries()) {
      if (!d.name.trim()) {
        setError(`Row ${i + 1}: name is required.`);
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dueDate)) {
        setError(`Row ${i + 1}: pick a valid due date.`);
        return;
      }
      if (!(Number(d.amount) > 0)) {
        setError(`Row ${i + 1}: amount must be greater than zero.`);
        return;
      }
    }
    setLoading(true);
    try {
      await restructureRemainingInstallments(token, {
        applicationId,
        reason: reason.trim() || undefined,
        installments: drafts.map((d) => ({
          name: d.name.trim(),
          dueDate: d.dueDate,
          amount: Number(d.amount),
        })),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Restructure failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-text-primary">Restructure remaining installments</h2>
          <button type="button" onClick={onClose} className="text-text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Paid installments and their transactions are preserved. Only unpaid installments
            ({unpaid.length}) totalling <strong>{formatINR(remainingRupees)}</strong> will be
            replaced by the new schedule below. New rows must sum to the same total.
          </div>

          <div className="overflow-x-auto rounded-md border border-surface-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Due date</th>
                  <th className="px-2 py-2 text-right">Amount (₹)</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {drafts.map((d, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-2 py-2 text-xs text-text-muted">{i + 1}</td>
                    <td className="px-2 py-2">
                      <Input
                        value={d.name}
                        onChange={(e) => updateDraft(i, { name: e.target.value })}
                        className="h-8 text-xs"
                        disabled={loading}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="date"
                        value={d.dueDate}
                        onChange={(e) => updateDraft(i, { dueDate: e.target.value })}
                        className="h-8 text-xs"
                        disabled={loading}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={d.amount}
                        onChange={(e) => updateDraft(i, { amount: e.target.value })}
                        className="h-8 text-right text-xs"
                        disabled={loading}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        disabled={loading || drafts.length === 1}
                        className="text-text-muted hover:text-rose-700 disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-surface-border bg-slate-50 text-xs">
                  <td className="px-2 py-2" colSpan={3}>
                    <button
                      type="button"
                      onClick={addRow}
                      disabled={loading}
                      className="inline-flex items-center text-brand-royal hover:underline"
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add installment
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right font-semibold">
                    <span
                      className={
                        totalsMatch ? "text-emerald-700" : "text-rose-700"
                      }
                    >
                      {formatINR(draftTotalCents / 100)}
                    </span>
                    <span className="ml-1 text-text-muted">
                      / {formatINR(remainingRupees)}
                    </span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div>
            <Label htmlFor="rs-reason">Reason (optional)</Label>
            <Textarea
              id="rs-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              placeholder="e.g., Parent requested 4-month hardship plan due to medical expenses."
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !totalsMatch}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restructure
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
