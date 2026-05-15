"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ParentApiError,
  getParentDues,
  type ParentDuesResponse,
} from "@/lib/parentFeesApi";
import { ParentHeader } from "../../_components/ParentHeader";
import { useParentSession } from "../../_components/useParentSession";

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function ParentDuesPage() {
  const { token, isChecking, signOut } = useParentSession();
  const [dues, setDues] = useState<ParentDuesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setDues(await getParentDues(token));
    } catch (err) {
      setError(err instanceof ParentApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

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
          <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </Card>
        ) : !dues ? null : dues.totalDue === 0 ? (
          <Card className="border-emerald-200 bg-emerald-50 p-6 text-center text-sm text-emerald-900">
            🎉 No outstanding dues. Thank you for staying current on payments.
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-text-muted">
                  Total outstanding
                </p>
                <p className="text-2xl font-bold text-rose-700">{formatINR(dues.totalDue)}</p>
              </div>
            </Card>

            {dues.installments.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text-primary">Installments</h3>
                <ul className="mt-3 space-y-2">
                  {dues.installments.map((inst) => (
                    <li
                      key={inst.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-surface-border px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">{inst.name}</p>
                        <p className="text-xs text-text-muted">Due {inst.dueDate}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-text-primary">
                          {formatINR(inst.amount)}
                        </span>
                        <Badge variant="warning">Pending</Badge>
                      </div>
                    </li>
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
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-surface-border px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">{charge.name}</p>
                        <p className="text-xs text-text-muted">
                          {charge.source}
                          {charge.dueDate ? ` · due ${charge.dueDate}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-rose-700">
                        {formatINR(charge.due)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Online payment via the parent portal is being rolled out. In the meantime,
                  please pay at the school fee counter and ask for a receipt — it will appear
                  in your payment history within minutes of being recorded.
                </p>
              </div>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
