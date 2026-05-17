"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  ParentApiError,
  getParentDues,
  getParentOverview,
  type ParentDuesResponse,
  type ParentOverview,
} from "@/lib/parentFeesApi";
import { ParentHeader } from "../../_components/ParentHeader";
import { PayInstallmentButton } from "../../_components/PayInstallmentButton";
import { PayChargeButton } from "../../_components/PayChargeButton";
import { useParentSession } from "../../_components/useParentSession";

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function ParentDuesPage() {
  const { token, isChecking, signOut } = useParentSession();
  const [dues, setDues] = useState<ParentDuesResponse | null>(null);
  const [overview, setOverview] = useState<ParentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [d, o] = await Promise.all([getParentDues(token), getParentOverview(token)]);
      setDues(d);
      setOverview(o);
    } catch (err) {
      setError(err instanceof ParentApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
      </main>
    );
  }
  if (!token) return null;

  return (
    <>
      <ParentHeader onSignOut={signOut} />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        {toast && (
          <Card
            className={`p-3 text-sm ${
              toast.kind === "success"
                ? "border-brand-emerald/25 bg-brand-emerald-light text-status-success"
                : "border-brand-rose/25 bg-brand-rose-light text-status-error"
            }`}
          >
            {toast.message}
          </Card>
        )}
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Outstanding Dues</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Pending installments and any ad-hoc charges (transport, exam, activities).
          </p>
        </div>

        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
          </Card>
        ) : error ? (
          <Card className="border-brand-rose/25 bg-brand-rose-light p-4 text-sm text-status-error">
            {error}
          </Card>
        ) : !dues ? null : dues.totalDue === 0 ? (
          <Card className="border-brand-emerald/25 bg-brand-emerald-light p-6 text-center text-sm text-status-success">
            🎉 No outstanding dues. Thank you for staying current on payments.
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-text-muted">
                  Total outstanding
                </p>
                <p className="text-2xl font-bold text-status-error">{formatINR(dues.totalDue)}</p>
              </div>
            </Card>

            {dues.installments.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text-primary">Installments</h3>
                <p className="mt-1 text-xs text-text-muted">
                  Pay the full amount, or change the amount to pay a part of it now —
                  the rest stays due.
                </p>
                <ul className="mt-3 space-y-2">
                  {dues.installments.map((inst) => (
                    <InstallmentDueRow
                      key={inst.id}
                      inst={inst}
                      token={token}
                      studentName={overview?.studentName ?? ""}
                      onPaid={(receipt) => {
                        setToast({
                          kind: "success",
                          message: `Payment successful. Receipt: ${receipt}`,
                        });
                        void refresh();
                      }}
                      onError={(message) => setToast({ kind: "error", message })}
                    />
                  ))}
                </ul>
              </Card>
            )}

            {dues.adHocCharges.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text-primary">Other Charges</h3>
                <ul className="mt-3 space-y-2">
                  {dues.adHocCharges.map((charge) => (
                    <li
                      key={charge.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-border px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">{charge.name}</p>
                        <p className="text-xs text-text-muted">
                          {charge.source}
                          {charge.dueDate ? ` · due ${charge.dueDate}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-status-error">
                          {formatINR(charge.due)}
                        </span>
                        {charge.due > 0 && (
                          <PayChargeButton
                            token={token}
                            chargeId={charge.id}
                            onPaid={() => {
                              setToast({
                                kind: "success",
                                message: "Payment successful. Charge cleared.",
                              });
                              void refresh();
                            }}
                            onError={(message) => setToast({ kind: "error", message })}
                            label={`Pay ${formatINR(charge.due)}`}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="border-brand-emerald/25 bg-brand-emerald-light p-4 text-sm text-status-success">
              <div className="flex items-start gap-2">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Pay any installment or other charge online using the Pay button next to it.
                  You will receive a receipt on success and it will appear in your payment
                  history. You can also settle any payment at the school counter.
                </p>
              </div>
            </Card>
          </>
        )}
      </main>
    </>
  );
}

// One outstanding installment, with an editable amount so the parent can pay
// the whole thing or just a part of it. The amount is capped at what is still
// owed; the server is the final authority and rejects anything larger.
function InstallmentDueRow({
  inst,
  token,
  studentName,
  onPaid,
  onError,
}: {
  inst: ParentDuesResponse["installments"][number];
  token: string;
  studentName: string;
  onPaid: (receipt: string) => void;
  onError: (message: string) => void;
}) {
  const paid = inst.paidAmount ?? 0;
  const outstanding = Math.max(0, Math.round((inst.amount - paid) * 100) / 100);
  const partial = paid > 0;
  const [amount, setAmount] = useState(outstanding.toString());
  const parsed = parseFloat(amount);
  const valid = !isNaN(parsed) && parsed > 0 && parsed <= outstanding + 0.01;

  return (
    <li className="rounded-md border border-surface-border px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-primary">{inst.name}</p>
          <p className="text-xs text-text-muted">Due {inst.dueDate}</p>
          {partial && (
            <p className="text-xs text-status-success">
              {formatINR(paid)} paid · {formatINR(outstanding)} left
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={partial ? "info" : "warning"}>
            {partial ? "Partial" : "Pending"}
          </Badge>
          <Input
            type="number"
            min="1"
            max={outstanding}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28"
            aria-label={`Amount to pay for ${inst.name}`}
          />
          <PayInstallmentButton
            token={token}
            installmentId={inst.id}
            studentName={studentName}
            amount={valid ? parsed : undefined}
            disabled={!valid}
            onPaid={onPaid}
            onError={onError}
            label={`Pay ${formatINR(valid ? parsed : outstanding)}`}
          />
        </div>
      </div>
      {amount !== "" && !valid && (
        <p className="mt-1 text-xs text-status-error">
          Enter an amount between ₹1 and {formatINR(outstanding)}.
        </p>
      )}
    </li>
  );
}
