"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  PrincipalApiError,
  getFeeAccountDetail,
  listStudentFeeAccounts,
  recordManualPayment,
  type FeeAccountDetail,
  type FeeAccountListItem,
} from "@/lib/principalApi";

interface Props {
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

const METHODS = ["cash", "cheque", "neft", "upi", "dd", "other"];

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

// What is still owed on an installment — face amount minus what is paid.
const outstandingOf = (i: { amount: number; paidAmount: number | null }) =>
  Math.max(0, Math.round((i.amount - (i.paidAmount ?? 0)) * 100) / 100);

export function QuickCollectModal({ token, onClose, onSuccess }: Props) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<FeeAccountListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<FeeAccountDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [installmentId, setInstallmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    (async () => {
      try {
        const res = await listStudentFeeAccounts(token, {
          search: debounced,
          dueFilter: "due",
          limit: 10,
        });
        if (!cancelled) setResults(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof PrincipalApiError ? err.message : "Search failed");
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, debounced]);

  const pickAccount = async (accountId: string) => {
    setError(null);
    setIsLoadingDetail(true);
    try {
      const detail = await getFeeAccountDetail(token, accountId);
      setSelected(detail);
      const firstUnpaid = detail.installments.find((i) => !i.isPaid);
      if (firstUnpaid) {
        setInstallmentId(firstUnpaid.id);
        setAmount(outstandingOf(firstUnpaid).toString());
      } else {
        setInstallmentId("");
        setAmount("");
      }
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load account");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleInstallmentChange = (id: string) => {
    setInstallmentId(id);
    const inst = selected?.installments.find((i) => i.id === id);
    if (inst) setAmount(outstandingOf(inst).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?.applicationId || !installmentId) {
      setError("Pick a student and installment first.");
      return;
    }
    const rupees = parseFloat(amount);
    if (isNaN(rupees) || rupees <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (rupees > outstanding + 0.01) {
      setError(
        `Amount can't exceed the ${formatINR(outstanding)} outstanding on this installment.`,
      );
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await recordManualPayment(token, {
        applicationId: selected.applicationId,
        installmentId,
        amount: rupees,
        method,
        transactionId: reference || undefined,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const unpaid = selected?.installments.filter((i) => !i.isPaid) ?? [];
  const selectedInstallment = selected?.installments.find(
    (i) => i.id === installmentId,
  );
  const outstanding = selectedInstallment
    ? outstandingOf(selectedInstallment)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-surface-divider px-5 py-4">
          <h2 className="font-semibold text-text-primary">Quick Collect</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {!selected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border border-surface-border bg-white px-3">
                <Search className="h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search student name, GR no., or application ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 border-0 bg-transparent py-2 text-sm outline-none placeholder:text-text-muted"
                  autoFocus
                />
                {isSearching && <Loader2 className="h-4 w-4 animate-spin text-text-muted" />}
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {results.length === 0 && debounced && !isSearching && (
                  <p className="py-6 text-center text-sm text-text-muted">
                    No students with outstanding dues match this search.
                  </p>
                )}
                {results.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => void pickAccount(row.id)}
                    className="flex w-full items-center justify-between rounded-md border border-surface-border bg-white px-3 py-2.5 text-left hover:bg-surface-muted"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{row.studentName}</p>
                      <p className="text-xs text-text-muted">
                        {row.applicationId ?? "—"}
                        {row.className ? ` · ${row.className}${row.section ? " " + row.section : ""}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-status-error">
                      {formatINR(row.totalDue)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : isLoadingDetail ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-surface-border bg-surface-muted px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">{selected.studentName}</p>
                  <p className="text-xs text-text-muted">
                    {selected.applicationId ?? "—"}
                    {selected.className ? ` · ${selected.className}` : ""}
                    {" · "}Due {formatINR(selected.totalDue)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setInstallmentId("");
                    setAmount("");
                  }}
                  className="text-xs font-medium text-brand-royal hover:underline"
                >
                  Change
                </button>
              </div>

              {unpaid.length === 0 ? (
                <p className="text-sm text-status-warning">
                  No unpaid installments. The account may have only ad-hoc charges; use the
                  account detail page to handle those.
                </p>
              ) : (
                <>
                  <div>
                    <Label htmlFor="qc-installment">Installment *</Label>
                    <Select
                      id="qc-installment"
                      value={installmentId}
                      onChange={(e) => handleInstallmentChange(e.target.value)}
                      className="mt-1"
                      disabled={isSubmitting}
                    >
                      {unpaid.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} · due {i.dueDate} · {formatINR(outstandingOf(i))} outstanding
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="qc-amount">Amount (₹) *</Label>
                      <Input
                        id="qc-amount"
                        type="number"
                        min="1"
                        max={outstanding}
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isSubmitting}
                        className="mt-1"
                      />
                      <p className="mt-1 text-xs text-text-muted">
                        {formatINR(outstanding)} outstanding — a partial payment is fine.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="qc-method">Method *</Label>
                      <Select
                        id="qc-method"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        disabled={isSubmitting}
                        className="mt-1"
                      >
                        {METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m.toUpperCase()}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="qc-ref">Reference / Cheque no.</Label>
                    <Input
                      id="qc-ref"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Optional"
                      disabled={isSubmitting}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="qc-notes">Notes</Label>
                    <Textarea
                      id="qc-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={isSubmitting}
                      className="mt-1"
                    />
                  </div>

                  {error && <p className="text-sm text-status-error">{error}</p>}

                  <div className="flex justify-end gap-3 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onClose}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="btn-pay" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Collect payment
                    </Button>
                  </div>
                </>
              )}
            </form>
          )}
          {error && !selected && <p className="mt-2 text-sm text-status-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
