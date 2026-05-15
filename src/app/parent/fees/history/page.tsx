"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Receipt, Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ParentApiError,
  downloadParentReceiptPdf,
  getParentReceipt,
  getParentTransactions,
  type ParentTransaction,
} from "@/lib/parentFeesApi";
import { ParentHeader } from "../../_components/ParentHeader";
import { useParentSession } from "../../_components/useParentSession";

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function ParentHistoryPage() {
  const { token, isChecking, signOut } = useParentSession();
  const [transactions, setTransactions] = useState<ParentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<unknown>(null);
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setTransactions(await getParentTransactions(token));
    } catch (err) {
      setError(err instanceof ParentApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  const viewReceipt = useCallback(
    async (transactionId: string) => {
      if (!token) return;
      setReceiptLoading(transactionId);
      setReceipt(null);
      try {
        const data = await getParentReceipt(token, transactionId);
        setReceipt(data);
      } catch (err) {
        setError(err instanceof ParentApiError ? err.message : "Failed to load receipt");
      } finally {
        setReceiptLoading(null);
      }
    },
    [token],
  );

  const downloadPdf = useCallback(
    async (transactionId: string) => {
      if (!token) return;
      setPdfLoading(transactionId);
      try {
        await downloadParentReceiptPdf(token, transactionId);
      } catch (err) {
        setError(err instanceof ParentApiError ? err.message : "Failed to download receipt");
      } finally {
        setPdfLoading(null);
      }
    },
    [token],
  );

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
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Payment History</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Every fee payment recorded against your child's account.
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
        ) : transactions.length === 0 ? (
          <Card className="p-8 text-center text-sm text-text-muted">
            No payments yet.
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Installment</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(t.paidAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-text-primary">
                        {t.installmentName ?? "—"}
                      </p>
                      {t.installmentDueDate && (
                        <p className="text-xs text-text-muted">
                          Due {t.installmentDueDate}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{t.method}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {formatINR(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {t.receiptNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void viewReceipt(t.id)}
                          disabled={receiptLoading === t.id}
                          className="inline-flex items-center text-xs font-medium text-brand-royal hover:underline"
                        >
                          {receiptLoading === t.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Receipt className="mr-1 h-3 w-3" />
                          )}
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadPdf(t.id)}
                          disabled={pdfLoading === t.id}
                          className="inline-flex items-center text-xs font-medium text-brand-royal hover:underline"
                        >
                          {pdfLoading === t.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="mr-1 h-3 w-3" />
                          )}
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {receipt !== null && (
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Receipt</h3>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Close
              </button>
            </div>
            <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-text-primary">
              {JSON.stringify(receipt, null, 2)}
            </pre>
          </Card>
        )}
      </main>
    </>
  );
}
