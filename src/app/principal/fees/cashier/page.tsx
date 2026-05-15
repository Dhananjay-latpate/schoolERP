"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet, Clock, History } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Banknote } from "lucide-react";
import {
  PrincipalApiError,
  closeCashierSession,
  getCashbook,
  getCurrentCashierSession,
  openCashierSession,
  type CashbookDto,
  type CashierSessionDto,
} from "@/lib/principalApi";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";
import { ToastContainer, type ToastItem } from "../_components/ToastContainer";
import { QuickCollectModal } from "../_components/QuickCollectModal";

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function CashierPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [session, setSession] = useState<CashierSessionDto | null>(null);
  const [cashbook, setCashbook] = useState<CashbookDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openingFloat, setOpeningFloat] = useState("");
  const [openNotes, setOpenNotes] = useState("");
  const [declaredClose, setDeclaredClose] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showQuickCollect, setShowQuickCollect] = useState(false);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const fetchState = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const current = await getCurrentCashierSession(token);
      setSession(current);
      if (current) {
        const book = await getCashbook(token, current.id);
        setCashbook(book);
      } else {
        setCashbook(null);
      }
    } catch (err) {
      const msg = err instanceof PrincipalApiError ? err.message : "Failed to load session";
      addToast("error", msg);
    } finally {
      setIsLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    if (token) void fetchState();
  }, [token, fetchState]);

  const handleOpen = useCallback(async () => {
    if (!token) return;
    const amount = Number(openingFloat);
    if (!Number.isFinite(amount) || amount < 0) {
      addToast("error", "Opening float must be a non-negative number");
      return;
    }
    setIsMutating(true);
    try {
      await openCashierSession(token, { openingFloat: amount, notes: openNotes || undefined });
      addToast("success", "Cashier session opened");
      setOpeningFloat("");
      setOpenNotes("");
      await fetchState();
    } catch (err) {
      const msg = err instanceof PrincipalApiError ? err.message : "Failed to open session";
      addToast("error", msg);
    } finally {
      setIsMutating(false);
    }
  }, [token, openingFloat, openNotes, addToast, fetchState]);

  const handleClose = useCallback(async () => {
    if (!token || !session) return;
    const amount = Number(declaredClose);
    if (!Number.isFinite(amount) || amount < 0) {
      addToast("error", "Declared cash must be a non-negative number");
      return;
    }
    setIsMutating(true);
    try {
      await closeCashierSession(token, session.id, {
        declaredClose: amount,
        notes: closeNotes || undefined,
      });
      addToast("success", "Cashier session closed");
      setDeclaredClose("");
      setCloseNotes("");
      await fetchState();
    } catch (err) {
      const msg = err instanceof PrincipalApiError ? err.message : "Failed to close session";
      addToast("error", msg);
    } finally {
      setIsMutating(false);
    }
  }, [token, session, declaredClose, closeNotes, addToast, fetchState]);

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
        <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
              Fees & Accounts
            </p>
            <h1 className="mt-1 text-xl font-semibold text-text-primary">Cashier Counter</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Open the day with an opening float, collect payments, and close with a reconciled
              count.
            </p>
          </div>

          {isLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-text-muted" />
            </Card>
          ) : session ? (
            <ActiveSessionView
              session={session}
              cashbook={cashbook}
              declaredClose={declaredClose}
              setDeclaredClose={setDeclaredClose}
              closeNotes={closeNotes}
              setCloseNotes={setCloseNotes}
              isMutating={isMutating}
              onClose={handleClose}
              onQuickCollect={() => setShowQuickCollect(true)}
            />
          ) : (
            <OpenSessionForm
              openingFloat={openingFloat}
              setOpeningFloat={setOpeningFloat}
              notes={openNotes}
              setNotes={setOpenNotes}
              isMutating={isMutating}
              onOpen={handleOpen}
            />
          )}
        </div>

        {showQuickCollect && (
          <QuickCollectModal
            token={token}
            onClose={() => setShowQuickCollect(false)}
            onSuccess={() => {
              setShowQuickCollect(false);
              addToast("success", "Payment collected");
              void fetchState();
            }}
          />
        )}
      </main>
    </div>
  );
}

function OpenSessionForm({
  openingFloat,
  setOpeningFloat,
  notes,
  setNotes,
  isMutating,
  onOpen,
}: {
  openingFloat: string;
  setOpeningFloat: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  isMutating: boolean;
  onOpen: () => void;
}) {
  return (
    <Card className="max-w-2xl p-6">
      <div className="inline-flex rounded-md bg-surface-muted p-2">
        <Wallet className="h-5 w-5 text-text-secondary" />
      </div>
      <h2 className="mt-3 text-lg font-semibold text-text-primary">Open Session</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Enter the opening cash float (notes & coins in the drawer at the start of the day).
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="openingFloat">Opening float (₹)</Label>
          <Input
            id="openingFloat"
            type="number"
            min="0"
            step="0.01"
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            placeholder="e.g., 1000"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="openNotes">Notes (optional)</Label>
          <Textarea
            id="openNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any handover or denomination notes..."
            className="mt-1"
          />
        </div>
        <Button onClick={onOpen} disabled={isMutating} className="btn-pay">
          {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Open session
        </Button>
      </div>
    </Card>
  );
}

function ActiveSessionView({
  session,
  cashbook,
  declaredClose,
  setDeclaredClose,
  closeNotes,
  setCloseNotes,
  isMutating,
  onClose,
  onQuickCollect,
}: {
  session: CashierSessionDto;
  cashbook: CashbookDto | null;
  declaredClose: string;
  setDeclaredClose: (v: string) => void;
  closeNotes: string;
  setCloseNotes: (v: string) => void;
  isMutating: boolean;
  onClose: () => void;
  onQuickCollect: () => void;
}) {
  const cashCollected =
    cashbook?.summary.find((s) => s.method === "cash")?.total ?? 0;
  const expectedClose = session.openingFloat + cashCollected;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-700" />
              <p className="text-sm font-semibold text-text-primary">Session open</p>
              <Badge variant="success">{session.status}</Badge>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Opened {new Date(session.openedAt).toLocaleString("en-IN")} by{" "}
              {session.cashierName ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-text-muted">Opening Float</p>
              <p className="text-lg font-semibold text-text-primary">
                {formatINR(session.openingFloat)}
              </p>
            </div>
            <Button className="btn-pay" onClick={onQuickCollect}>
              <Banknote className="mr-1 h-4 w-4" /> Quick Collect
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SummaryTile
            label="Cash Collected"
            value={formatINR(cashCollected)}
            tone="text-emerald-700"
          />
          <SummaryTile
            label="Expected in Drawer"
            value={formatINR(expectedClose)}
            tone="text-brand-royal"
          />
          <SummaryTile
            label="Transactions"
            value={String(cashbook?.transactions.length ?? 0)}
            tone="text-text-primary"
          />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-primary">Close Session</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Count the cash drawer and enter the declared amount. Variance is calculated against
          the expected close ({formatINR(expectedClose)}).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="declaredClose">Declared cash (₹)</Label>
            <Input
              id="declaredClose"
              type="number"
              min="0"
              step="0.01"
              value={declaredClose}
              onChange={(e) => setDeclaredClose(e.target.value)}
              placeholder="Count the drawer"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="closeNotes">Notes</Label>
            <Input
              id="closeNotes"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="e.g., handed over to admin"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={onClose} disabled={isMutating} variant="danger">
            {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Close session
          </Button>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">Session Transactions</h3>
          <History className="h-4 w-4 text-text-muted" />
        </div>
        {!cashbook || cashbook.transactions.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">
            No transactions recorded in this session yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Installment</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {cashbook.transactions.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(t.paidAt).toLocaleTimeString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-text-primary">{t.studentName ?? "—"}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.installmentName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{t.method}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-700">
                    {formatINR(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {t.receiptNumber ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-3 text-center">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
