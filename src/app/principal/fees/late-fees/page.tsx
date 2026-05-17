"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Play, X, AlarmClock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  PrincipalApiError,
  applyLateFees,
  createLateFeeRule,
  listLateFeeRules,
} from "@/lib/principalApi";
import type { LateFeeRule, LateFeeFrequency } from "@/types/fees";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";
import { ToastContainer, nextToastId, type ToastItem } from "../_components/ToastContainer";

const FREQUENCIES: { value: LateFeeFrequency; label: string }[] = [
  { value: "one_time", label: "One-time" },
  { value: "daily", label: "Per day" },
  { value: "monthly", label: "Per month" },
];

const formatINR = (value: number | null | undefined) => {
  if (value == null) return "—";
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

export default function LateFeesPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [rules, setRules] = useState<LateFeeRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [applyYear, setApplyYear] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = nextToastId();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await listLateFeeRules(token, academicYearFilter || undefined);
      setRules(data);
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to load rules");
    } finally {
      setIsLoading(false);
    }
  }, [token, academicYearFilter, addToast]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  const handleApply = useCallback(async () => {
    if (!token) return;
    if (!applyYear) {
      addToast("error", "Pick an academic year to apply late fees");
      return;
    }
    setIsApplying(true);
    try {
      const result = await applyLateFees(token, { academicYear: applyYear });
      addToast("success", `${result.applied} late-fee charges applied`);
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Apply failed");
    } finally {
      setIsApplying(false);
    }
  }, [token, applyYear, addToast]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-bg">
        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
      </main>
    );
  }
  if (!token) return null;

  return (
    <div className="flex">
      <FeesSidebar summary={summary} isLoading={isLoadingSummary} onSignOut={signOut} />
      <main className="flex-1 lg:ml-60">
        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        />
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
                Fees & Accounts
              </p>
              <h1 className="mt-1 text-xl font-semibold text-text-primary">Late Fees</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Rules govern how late fees are calculated on overdue charges. Run the engine
                manually here or schedule via the late-fee cron.
              </p>
            </div>
            <Button onClick={() => setShowModal(true)} className="btn-pay">
              <Plus className="mr-1 h-4 w-4" /> New rule
            </Button>
          </div>

          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="apply-year">Run engine for academic year</Label>
                <Input
                  id="apply-year"
                  placeholder="e.g., 2026-27"
                  value={applyYear}
                  onChange={(e) => setApplyYear(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleApply} disabled={isApplying}>
                {isApplying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-1 h-4 w-4" />
                )}
                Apply late fees now
              </Button>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Scans overdue charges, applies matching rules, and posts late-fee ledger
              entries. Safe to re-run — already-applied fees are skipped via idempotency.
            </p>
          </Card>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Label htmlFor="year-filter" className="text-xs">
                Filter rules by year
              </Label>
              <Input
                id="year-filter"
                placeholder="2026-27"
                value={academicYearFilter}
                onChange={(e) => setAcademicYearFilter(e.target.value)}
                className="h-8 max-w-[140px] text-xs"
              />
            </div>

            {isLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
              </Card>
            ) : rules.length === 0 ? (
              <Card className="p-8 text-center text-sm text-text-muted">
                <AlarmClock className="mx-auto h-5 w-5 text-text-muted" />
                <p className="mt-2">No late-fee rules defined.</p>
              </Card>
            ) : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Academic Year</th>
                      <th className="px-4 py-3 text-right">Grace</th>
                      <th className="px-4 py-3 text-right">Fixed</th>
                      <th className="px-4 py-3 text-right">Percentage</th>
                      <th className="px-4 py-3 text-right">Cap</th>
                      <th className="px-4 py-3">Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      <tr key={rule.id} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-3 font-medium text-text-primary">{rule.name}</td>
                        <td className="px-4 py-3 text-text-secondary">{rule.academicYear}</td>
                        <td className="px-4 py-3 text-right text-text-secondary">
                          {rule.graceDays} days
                        </td>
                        <td className="px-4 py-3 text-right">{formatINR(rule.fixedAmount)}</td>
                        <td className="px-4 py-3 text-right">
                          {rule.percentage != null ? `${rule.percentage}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">{formatINR(rule.maxAmount)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="default">{rule.frequency}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        </div>

        {showModal && (
          <LateFeeRuleModal
            token={token}
            onClose={() => setShowModal(false)}
            onSaved={async () => {
              setShowModal(false);
              addToast("success", "Rule saved");
              await refresh();
            }}
            onError={(msg) => addToast("error", msg)}
          />
        )}
      </main>
    </div>
  );
}

function LateFeeRuleModal({
  token,
  onClose,
  onSaved,
  onError,
}: {
  token: string;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [graceDays, setGraceDays] = useState("7");
  const [fixedAmount, setFixedAmount] = useState("");
  const [percentage, setPercentage] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [frequency, setFrequency] = useState<LateFeeFrequency>("one_time");
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !academicYear.trim()) {
        onError("Name and academic year are required");
        return;
      }
      const fixed = parseFloat(fixedAmount);
      const pct = parseFloat(percentage);
      if (
        (!Number.isFinite(fixed) || fixed <= 0) &&
        (!Number.isFinite(pct) || pct <= 0)
      ) {
        onError("Provide a fixed amount or percentage");
        return;
      }
      if (Number.isFinite(pct) && pct > 100) {
        onError("Percentage cannot exceed 100");
        return;
      }
      setSaving(true);
      try {
        await createLateFeeRule(token, {
          name: name.trim(),
          academicYear: academicYear.trim(),
          graceDays: Math.max(0, parseInt(graceDays, 10) || 0),
          frequency,
          fixedAmount: Number.isFinite(fixed) && fixed > 0 ? fixed : undefined,
          percentage: Number.isFinite(pct) && pct > 0 ? pct : undefined,
          maxAmount: parseFloat(maxAmount) > 0 ? parseFloat(maxAmount) : undefined,
        });
        onSaved();
      } catch (err) {
        onError(err instanceof PrincipalApiError ? err.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [
      token,
      name,
      academicYear,
      graceDays,
      fixedAmount,
      percentage,
      maxAmount,
      frequency,
      onSaved,
      onError,
    ],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-text-primary">New late-fee rule</h2>
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
            <Label htmlFor="lf-name">Name *</Label>
            <Input
              id="lf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard monthly late fee"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="lf-year">Academic year *</Label>
            <Input
              id="lf-year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2026-27"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="lf-grace">Grace days</Label>
            <Input
              id="lf-grace"
              type="number"
              min="0"
              value={graceDays}
              onChange={(e) => setGraceDays(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="lf-fixed">Fixed amount (₹)</Label>
              <Input
                id="lf-fixed"
                type="number"
                min="0"
                step="0.01"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
                className="mt-1"
                placeholder="100"
              />
            </div>
            <div>
              <Label htmlFor="lf-pct">Percentage (%)</Label>
              <Input
                id="lf-pct"
                type="number"
                min="0"
                step="0.1"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="mt-1"
                placeholder="5"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="lf-max">Cap (₹)</Label>
              <Input
                id="lf-max"
                type="number"
                min="0"
                step="0.01"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="mt-1"
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="lf-freq">Frequency</Label>
              <Select
                id="lf-freq"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as LateFeeFrequency)}
                className="mt-1"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <p className="text-xs text-text-muted">
            Provide a fixed amount, a percentage of the overdue charge, or both. The cap
            applies after computation.
          </p>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save rule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
