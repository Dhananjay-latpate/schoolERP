"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Upload, X, FileCheck2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import {
  PrincipalApiError,
  createReconciliationBatch,
  listReconciliationBatches,
  type ReconciliationBatch,
  type ReconciliationItemInput,
} from "@/lib/principalApi";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";
import { ToastContainer, type ToastItem } from "../_components/ToastContainer";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  pending: "warning",
  matched: "success",
  mismatch: "warning",
  unmatched: "error",
};

const formatINRPaise = (paise: string | number) =>
  `₹${(Number(paise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function ReconciliationListPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [batches, setBatches] = useState<ReconciliationBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      setBatches(await listReconciliationBatches(token));
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

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
              <h1 className="mt-1 text-xl font-semibold text-text-primary">
                Bank Reconciliation
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Upload a gateway or bank settlement statement, auto-match against fee
                transactions, and resolve mismatches manually.
              </p>
            </div>
            <Button onClick={() => setShowUpload(true)} className="btn-pay">
              <Upload className="mr-1 h-4 w-4" /> Upload statement
            </Button>
          </div>

          {isLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
            </Card>
          ) : batches.length === 0 ? (
            <Card className="p-8 text-center text-sm text-text-muted">
              <FileCheck2 className="mx-auto h-6 w-6 text-text-muted" />
              <p className="mt-2">No reconciliation batches yet.</p>
            </Card>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Statement date</th>
                    <th className="px-4 py-3 text-right">Items</th>
                    <th className="px-4 py-3 text-right">Matched</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Uploaded</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-text-primary">{b.source}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        {b.statementDate
                          ? new Date(b.statementDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary">
                        {b.itemCount}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700">
                        {b.matchedCount}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary">
                        {formatINRPaise(b.totalAmountInPaise)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[b.status] ?? "default"}>{b.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-text-muted">
                        {new Date(b.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/principal/fees/reconciliation/${b.id}`}
                          className="text-sm font-medium text-brand-royal hover:underline"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        {showUpload && (
          <UploadStatementModal
            token={token}
            onClose={() => setShowUpload(false)}
            onSaved={async () => {
              setShowUpload(false);
              addToast("success", "Statement uploaded and auto-matched");
              await refresh();
            }}
            onError={(msg) => addToast("error", msg)}
          />
        )}
      </main>
    </div>
  );
}

function UploadStatementModal({
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
  const [source, setSource] = useState("razorpay");
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [csv, setCsv] = useState("");
  const [parseCount, setParseCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const parseCsv = (text: string): ReconciliationItemInput[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (key: string) => header.indexOf(key);
    const items: ReconciliationItemInput[] = [];
    for (const line of lines.slice(1)) {
      const cols = line.split(",").map((c) => c.trim());
      const amountRaw = cols[idx("amount")] ?? "";
      const amount = parseFloat(amountRaw);
      if (!Number.isFinite(amount)) continue;
      items.push({
        amount,
        externalPaymentId: cols[idx("externalpaymentid")] || cols[idx("paymentid")] || undefined,
        utrNumber: cols[idx("utr")] || cols[idx("utrnumber")] || undefined,
        payerName: cols[idx("payer")] || cols[idx("payername")] || undefined,
        paidAt: cols[idx("paidat")] || cols[idx("date")] || undefined,
        raw: Object.fromEntries(header.map((h, i) => [h, cols[i] ?? ""])),
      });
    }
    return items;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-text-primary">Upload statement</h2>
          <button type="button" onClick={onClose} className="text-text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const items = parseCsv(csv);
            if (items.length === 0) {
              onError("No valid rows in the pasted CSV");
              return;
            }
            setSaving(true);
            try {
              await createReconciliationBatch(token, {
                source: source.trim() || "manual",
                statementDate: statementDate || undefined,
                items,
              });
              onSaved();
            } catch (err) {
              onError(err instanceof PrincipalApiError ? err.message : "Upload failed");
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-4 p-5"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="rec-source">Source</Label>
              <Input
                id="rec-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="razorpay / cashfree / bank-name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rec-date">Statement date</Label>
              <Input
                id="rec-date"
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="rec-csv">CSV data *</Label>
            <Textarea
              id="rec-csv"
              rows={10}
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                setParseCount(parseCsv(e.target.value).length);
              }}
              placeholder={
                "amount,externalPaymentId,utrNumber,payerName,paidAt\n5000,pay_ABCDEF123,,Ramesh Kumar,2026-05-12\n12000,,UTR123456,Suresh Singh,2026-05-13"
              }
              className="mt-1 font-mono text-xs"
              required
            />
            <p className="mt-1 text-xs text-text-muted">
              First line is the header. Recognised columns:{" "}
              <code className="rounded bg-slate-100 px-1">amount</code>,{" "}
              <code className="rounded bg-slate-100 px-1">externalPaymentId</code>,{" "}
              <code className="rounded bg-slate-100 px-1">utrNumber</code>,{" "}
              <code className="rounded bg-slate-100 px-1">payerName</code>,{" "}
              <code className="rounded bg-slate-100 px-1">paidAt</code>.
              {parseCount !== null && (
                <span className="ml-2 text-text-secondary">
                  Detected {parseCount} valid row{parseCount === 1 ? "" : "s"}.
                </span>
              )}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload & auto-match
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
