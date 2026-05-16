"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Receipt,
  Download,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
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

const formatDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// Shape returned by the verifiable-receipt builder on the server.
type ParentReceipt = {
  verification?: {
    receiptNo: string;
    token: string;
    url: string;
    issuedAt: string;
  };
  receipt: {
    receiptNumber: string;
    transactionId: string;
    paymentTransactionId?: string | null;
    razorpayPaymentId?: string | null;
    amount: number;
    method: string;
    notes?: string | null;
    recordedByName?: string | null;
    paidAt: string;
  };
  lineItem?: { kind: string; label: string; dueDate?: string | null };
  student?: {
    name: string;
    applicationId: string;
    academicYear: string;
    className?: string | null;
    grNumber?: string | null;
  };
  school?: { schoolName?: string | null; schoolAddress?: string | null } | null;
};

function ReceiptDetail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-text-primary">{children}</dd>
    </div>
  );
}

export default function ParentHistoryPage() {
  const { token, isChecking, signOut } = useParentSession();
  const [transactions, setTransactions] = useState<ParentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ParentReceipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  // Receipt/PDF errors use their own slot so a failed receipt fetch never
  // wipes the transactions table (which the page-level `error` would do).
  const [receiptError, setReceiptError] = useState<string | null>(null);

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
      setReceiptError(null);
      try {
        const data = await getParentReceipt(token, transactionId);
        setReceipt(data as ParentReceipt);
      } catch (err) {
        setReceiptError(
          err instanceof ParentApiError ? err.message : "Failed to load receipt",
        );
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
      setReceiptError(null);
      try {
        await downloadParentReceiptPdf(token, transactionId);
      } catch (err) {
        setReceiptError(
          err instanceof ParentApiError ? err.message : "Failed to download receipt",
        );
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
                  <th className="px-4 py-3">Paid for</th>
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

        {receiptError && (
          <Card className="flex items-center justify-between gap-3 border-rose-200 bg-rose-50 p-3">
            <p className="text-sm text-rose-700">{receiptError}</p>
            <button
              type="button"
              onClick={() => setReceiptError(null)}
              className="text-xs text-rose-600 hover:underline"
            >
              Dismiss
            </button>
          </Card>
        )}

        {receipt !== null && (
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-3 border-b border-surface-border bg-emerald-50 px-5 py-4">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <ShieldCheck size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-emerald-900">
                  {receipt.school?.schoolName ?? "Fee Receipt"}
                </h3>
                <p className="text-xs text-emerald-700">
                  Verifiable receipt ·{" "}
                  <span className="font-mono font-semibold">
                    {receipt.verification?.receiptNo ??
                      receipt.receipt.receiptNumber}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="ml-auto text-xs text-text-muted hover:text-text-primary"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-xl bg-surface-muted/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                  Amount paid
                </p>
                <p className="mt-0.5 text-2xl font-bold text-emerald-700">
                  {formatINR(receipt.receipt.amount)}
                </p>
                {receipt.lineItem && (
                  <p className="mt-0.5 text-xs text-text-secondary">
                    for {receipt.lineItem.label}
                  </p>
                )}
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <ReceiptDetail label="Paid by">
                  {receipt.student?.name ?? "—"}
                </ReceiptDetail>
                <ReceiptDetail label="Application ID">
                  <span className="font-mono">
                    {receipt.student?.applicationId ?? "—"}
                  </span>
                </ReceiptDetail>
                <ReceiptDetail label="Method">
                  {receipt.receipt.method.toUpperCase()}
                </ReceiptDetail>
                <ReceiptDetail label="Paid on">
                  {formatDateTime(receipt.receipt.paidAt)}
                </ReceiptDetail>
                {receipt.receipt.paymentTransactionId && (
                  <ReceiptDetail label="Reference">
                    <span className="font-mono text-xs">
                      {receipt.receipt.paymentTransactionId}
                    </span>
                  </ReceiptDetail>
                )}
                {receipt.receipt.recordedByName && (
                  <ReceiptDetail label="Recorded by">
                    {receipt.receipt.recordedByName}
                  </ReceiptDetail>
                )}
              </dl>

              {receipt.verification?.url && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-border pt-3">
                  <p className="text-xs text-text-muted">
                    Scan the QR on the PDF or open the link to verify this
                    receipt independently.
                  </p>
                  <a
                    href={receipt.verification.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-royal hover:underline"
                  >
                    <ExternalLink size={13} aria-hidden="true" />
                    Verify receipt
                  </a>
                </div>
              )}
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
