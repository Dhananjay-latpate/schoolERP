"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, ArrowLeft, Plus, Receipt, Undo2, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  PrincipalApiError,
  getFeeAccountDetail,
  type FeeAccountDetail,
} from "@/lib/principalApi";
import { AddChargeModal } from "@/components/fees/AddChargeModal";
import { FeesSidebar } from "../../_components/Sidebar";
import { useFeesSession } from "../../_components/useFeesSession";
import { ToastContainer, type ToastItem } from "../../_components/ToastContainer";
import { RecordPaymentModal } from "../../_components/RecordPaymentModal";
import { ConcessionRequestModal } from "../../_components/ConcessionRequestModal";
import { RefundRequestModal } from "../../_components/RefundRequestModal";
import { RestructurePlanModal } from "../../_components/RestructurePlanModal";

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  paid: "success",
  pending: "warning",
  partial: "info",
  waived: "default",
  cancelled: "error",
};

type TabId = "overview" | "charges" | "ledger" | "approvals" | "concessions" | "installments";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "charges", label: "Charges" },
  { id: "installments", label: "Installments" },
  { id: "ledger", label: "Ledger" },
  { id: "concessions", label: "Concessions" },
  { id: "approvals", label: "Approvals" },
];

export default function AccountDetailPage() {
  const params = useParams<{ accountId: string }>();
  const accountId = params?.accountId;
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [account, setAccount] = useState<FeeAccountDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showConcession, setShowConcession] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showRestructure, setShowRestructure] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const fetchDetail = useCallback(async () => {
    if (!token || !accountId) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await getFeeAccountDetail(token, accountId);
      setAccount(data);
    } catch (err) {
      const msg = err instanceof PrincipalApiError ? err.message : "Failed to load account";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token, accountId]);

  useEffect(() => {
    if (token && accountId) void fetchDetail();
  }, [token, accountId, fetchDetail]);

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
          <Link
            href="/principal/fees/students"
            className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All accounts
          </Link>

          {isLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-text-muted" />
            </Card>
          ) : error ? (
            <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</Card>
          ) : !account ? (
            <Card className="p-6 text-sm text-text-muted">Account not found.</Card>
          ) : (
            <>
              <Card className="overflow-hidden p-0">
                <div className="brand-gradient p-6 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                        Fee Account
                      </p>
                      <h1 className="mt-1 text-2xl font-bold">{account.studentName}</h1>
                      <p className="mt-1 text-sm text-white/80">
                        {account.applicationId ?? "—"}
                        {account.grNumber ? ` · GR ${account.grNumber}` : ""}
                        {account.className ? ` · ${account.className}` : ""}
                        {account.section ? ` ${account.section}` : ""}
                      </p>
                    </div>
                    <Badge className="bg-surface-card/20 text-white">{account.academicYear}</Badge>
                  </div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-4">
                  <SummaryTile label="Total Charged" value={formatINR(account.totalCharged)} tone="text-text-primary" />
                  <SummaryTile label="Concessions" value={formatINR(account.totalConcession)} tone="text-emerald-700" />
                  <SummaryTile label="Paid" value={formatINR(account.totalPaid)} tone="text-brand-royal" />
                  <SummaryTile
                    label="Balance Due"
                    value={formatINR(account.totalDue)}
                    tone={account.totalDue > 0 ? "text-rose-700" : "text-emerald-700"}
                  />
                </div>
              </Card>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowAddCharge(true)}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add charge
                </Button>
                {account.applicationId && (
                  <Button
                    onClick={() => setShowRecordPayment(true)}
                    className="btn-pay"
                    disabled={account.installments.filter((i) => !i.isPaid).length === 0}
                  >
                    <Receipt className="mr-1 h-4 w-4" /> Record payment
                  </Button>
                )}
                {account.totalPaid > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => setShowRefund(true)}
                  >
                    <Undo2 className="mr-1 h-4 w-4" /> Refund
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-b border-surface-border">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "border-brand-royal text-brand-royal"
                          : "border-transparent text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === "overview" && <OverviewTab account={account} />}
              {activeTab === "charges" && (
                <ChargesTab account={account} onAddCharge={() => setShowAddCharge(true)} />
              )}
              {activeTab === "installments" && (
                <InstallmentsTab
                  account={account}
                  onRestructure={() => setShowRestructure(true)}
                />
              )}
              {activeTab === "ledger" && <LedgerTab account={account} />}
              {activeTab === "concessions" && (
                <ConcessionsTab
                  account={account}
                  onRequest={() => setShowConcession(true)}
                />
              )}
              {activeTab === "approvals" && <ApprovalsTab account={account} />}
            </>
          )}
        </div>

        {account && showAddCharge && (
          <AddChargeModal
            accountId={account.id}
            token={token}
            onClose={() => setShowAddCharge(false)}
            onSuccess={() => {
              setShowAddCharge(false);
              addToast("success", "Charge added");
              void fetchDetail();
            }}
          />
        )}
        {account && showRestructure && account.applicationId && (
          <RestructurePlanModal
            applicationId={account.applicationId}
            installments={account.installments.map((i) => ({
              id: i.id,
              name: i.name,
              dueDate: i.dueDate,
              amount: i.amount,
              isPaid: i.isPaid,
            }))}
            token={token}
            onClose={() => setShowRestructure(false)}
            onSuccess={() => {
              setShowRestructure(false);
              addToast("success", "Plan restructured");
              void fetchDetail();
            }}
          />
        )}
        {account && showRefund && (
          <RefundRequestModal
            accountId={account.id}
            totalPaid={account.totalPaid}
            transactions={account.installments.flatMap((i) =>
              i.transactions.map((t) => ({
                id: t.id,
                amount: t.amount,
                method: t.method,
                paidAt: t.paidAt,
                receiptNumber: t.receiptNumber,
              })),
            )}
            token={token}
            onClose={() => setShowRefund(false)}
            onSuccess={() => {
              setShowRefund(false);
              addToast("success", "Refund request submitted");
              void fetchDetail();
            }}
          />
        )}
        {account && showConcession && (
          <ConcessionRequestModal
            accountId={account.id}
            token={token}
            onClose={() => setShowConcession(false)}
            onSuccess={() => {
              setShowConcession(false);
              addToast("success", "Concession request submitted");
              void fetchDetail();
            }}
          />
        )}
        {account && showRecordPayment && account.applicationId && (
          <RecordPaymentModal
            applicationId={account.applicationId}
            installments={account.installments.map((inst) => ({
              id: inst.id,
              name: inst.name,
              dueDate: inst.dueDate,
              amount: inst.amount,
              isPaid: inst.isPaid,
            }))}
            token={token}
            onClose={() => setShowRecordPayment(false)}
            onSuccess={() => {
              setShowRecordPayment(false);
              addToast("success", "Payment recorded");
              void fetchDetail();
            }}
          />
        )}
      </main>
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

function OverviewTab({ account }: { account: FeeAccountDetail }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-text-primary">Family</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <DetailRow label="Father" value={account.fatherName ?? "—"} />
          <DetailRow label="Mother" value={account.motherName ?? "—"} />
          <DetailRow label="Contact" value={account.contactNumber ?? "—"} />
          <DetailRow label="Address" value={account.address ?? "—"} />
        </dl>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-text-primary">Plan</h3>
        {account.paymentPlan ? (
          <dl className="mt-3 space-y-2 text-sm">
            <DetailRow
              label="Type"
              value={account.paymentPlan.isCustomPlan ? "Custom (hardship)" : "Standard"}
            />
            <DetailRow label="Status" value={account.paymentPlan.status} />
            <DetailRow label="Total" value={formatINR(account.paymentPlan.totalAmount)} />
            <DetailRow label="Paid" value={formatINR(account.paymentPlan.paidAmount)} />
            <DetailRow label="Remaining" value={formatINR(account.paymentPlan.remainingAmount)} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-text-muted">No payment plan attached.</p>
        )}
      </Card>
    </div>
  );
}

function ChargesTab({
  account,
  onAddCharge,
}: {
  account: FeeAccountDetail;
  onAddCharge: () => void;
}) {
  return (
    <Card className="overflow-x-auto p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">Charges</h3>
        <Button variant="secondary" className="h-8 text-xs" onClick={onAddCharge}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Charge
        </Button>
      </div>
      {account.charges.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-text-muted">No charges assigned yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Due</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {account.charges.map((charge) => (
              <tr key={charge.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-text-primary">{charge.name}</td>
                <td className="px-4 py-3 text-text-secondary">{charge.source}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{formatINR(charge.amount)}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{formatINR(charge.paid)}</td>
                <td className="px-4 py-3 text-right font-semibold text-rose-700">
                  {formatINR(charge.due)}
                </td>
                <td className="px-4 py-3 text-text-secondary">{charge.dueDate ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[charge.status] ?? "default"}>{charge.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function InstallmentsTab({
  account,
  onRestructure,
}: {
  account: FeeAccountDetail;
  onRestructure: () => void;
}) {
  const hasUnpaid = account.installments.some((i) => !i.isPaid);
  return (
    <Card className="overflow-x-auto p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">Installments</h3>
        {account.applicationId && hasUnpaid && (
          <Button
            variant="secondary"
            className="h-8 text-xs"
            onClick={onRestructure}
          >
            <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Restructure remaining
          </Button>
        )}
      </div>
      {account.installments.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-text-muted">No installments scheduled.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {account.installments.map((inst) => (
              <tr key={inst.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-text-primary">
                  {inst.name}
                  {inst.isCustom && (
                    <span className="ml-2 text-xs text-amber-700">(custom)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">{inst.dueDate}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{formatINR(inst.amount)}</td>
                <td className="px-4 py-3 text-right text-emerald-700">
                  {formatINR(inst.paidAmount ?? 0)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={inst.isPaid ? "success" : "warning"}>
                    {inst.isPaid ? "Paid" : "Pending"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {inst.receiptNumber ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function LedgerTab({ account }: { account: FeeAccountDetail }) {
  return (
    <Card className="overflow-x-auto p-0">
      <h3 className="px-4 py-3 text-sm font-semibold text-text-primary">Ledger</h3>
      {account.ledgerEntries.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-text-muted">No ledger entries yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3">Posted</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {account.ledgerEntries.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(entry.postedAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="default">{entry.entryType}</Badge>
                </td>
                <td className="px-4 py-3 text-text-secondary">{entry.description ?? "—"}</td>
                <td className="px-4 py-3 text-right text-rose-700">
                  {entry.debit > 0 ? formatINR(entry.debit) : "—"}
                </td>
                <td className="px-4 py-3 text-right text-emerald-700">
                  {entry.credit > 0 ? formatINR(entry.credit) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function ConcessionsTab({
  account,
  onRequest,
}: {
  account: FeeAccountDetail;
  onRequest: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Concessions</h3>
        <Button variant="secondary" className="h-8 text-xs" onClick={onRequest}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Request concession
        </Button>
      </div>
      {account.concessions.length === 0 ? (
        <p className="mt-4 text-center text-sm text-text-muted">No concessions on this account.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {account.concessions.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-surface-border p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">{c.type}</p>
                  <p className="mt-1 text-xs text-text-muted">{c.reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-700">{formatINR(c.amount)}</p>
                  <Badge variant={c.status === "approved" ? "success" : "warning"}>
                    {c.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ApprovalsTab({ account }: { account: FeeAccountDetail }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-text-primary">Approvals</h3>
      {account.approvalRequests.length === 0 ? (
        <p className="mt-4 text-center text-sm text-text-muted">No approval requests.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {account.approvalRequests.map((req) => (
            <div key={req.id} className="rounded-lg border border-surface-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary">{req.type}</p>
                <Badge
                  variant={
                    req.status === "approved"
                      ? "success"
                      : req.status === "rejected"
                        ? "error"
                        : "warning"
                  }
                >
                  {req.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{req.reason}</p>
              {req.comments && (
                <p className="mt-1 text-xs text-text-muted">Reviewer: {req.comments}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  );
}
