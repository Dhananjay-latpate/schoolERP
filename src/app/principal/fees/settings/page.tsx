"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Landmark,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  PrincipalApiError,
  getPayoutAccount,
  listPayoutTransfers,
  onboardPayoutGateway,
  refreshPayoutGateway,
  savePayoutAccount,
  type PayoutAccount,
  type PayoutAccountStatus,
  type PayoutGateway,
  type PayoutGatewayLink,
  type PayoutTransfer,
} from "@/lib/principalApi";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";
import { ToastContainer, nextToastId, type ToastItem } from "../_components/ToastContainer";

const STATUS_VARIANT: Record<PayoutAccountStatus, "default" | "success" | "warning" | "error" | "info"> = {
  not_onboarded: "default",
  created: "info",
  verification_pending: "warning",
  active: "success",
  rejected: "error",
  suspended: "error",
};

const STATUS_LABEL: Record<PayoutAccountStatus, string> = {
  not_onboarded: "Not onboarded",
  created: "Created",
  verification_pending: "Verification pending",
  active: "Active",
  rejected: "Rejected",
  suspended: "Suspended",
};

const GATEWAY_LABEL: Record<PayoutGateway, string> = {
  razorpay: "Razorpay Route",
  cashfree: "Cashfree Easy Split",
};

type FormState = {
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  accountType: string;
  legalBusinessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  businessType: string;
  pan: string;
  gstin: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
};

const EMPTY_FORM: FormState = {
  accountHolderName: "",
  accountNumber: "",
  ifsc: "",
  accountType: "current",
  legalBusinessName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  businessType: "trust",
  pan: "",
  gstin: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
};

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function PaymentAccountPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [transfers, setTransfers] = useState<PayoutTransfer[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyGateway, setBusyGateway] = useState<PayoutGateway | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = nextToastId();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [acc, tr] = await Promise.all([
        getPayoutAccount(token),
        listPayoutTransfers(token).catch(() => ({ data: [], total: 0 })),
      ]);
      setAccount(acc);
      setTransfers(tr.data);
      if (acc) {
        setForm({
          accountHolderName: acc.accountHolderName,
          accountNumber: "",
          ifsc: acc.ifsc,
          accountType: acc.accountType,
          legalBusinessName: acc.legalBusinessName,
          contactName: acc.contactName,
          contactEmail: acc.contactEmail,
          contactPhone: acc.contactPhone,
          businessType: acc.businessType ?? "trust",
          pan: acc.pan ?? "",
          gstin: acc.gstin ?? "",
          addressLine: acc.addressLine ?? "",
          city: acc.city ?? "",
          state: acc.state ?? "",
          pincode: acc.pincode ?? "",
        });
      }
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  const setField = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token) return;
      // When editing an existing account, an empty account-number field means
      // "keep the stored number" — only send it when the user typed a new one.
      if (!account && !form.accountNumber.trim()) {
        addToast("error", "Bank account number is required");
        return;
      }
      setIsSaving(true);
      try {
        await savePayoutAccount(token, {
          accountHolderName: form.accountHolderName,
          accountNumber: form.accountNumber.trim() || account?.accountNumberMasked || "",
          ifsc: form.ifsc,
          accountType: form.accountType,
          legalBusinessName: form.legalBusinessName,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          businessType: form.businessType || undefined,
          pan: form.pan || undefined,
          gstin: form.gstin || undefined,
          addressLine: form.addressLine || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          pincode: form.pincode || undefined,
        });
        addToast("success", "Payment account saved");
        await load();
      } catch (err) {
        addToast("error", err instanceof PrincipalApiError ? err.message : "Save failed");
      } finally {
        setIsSaving(false);
      }
    },
    [token, form, account, addToast, load],
  );

  const handleOnboard = useCallback(
    async (gateway: PayoutGateway) => {
      if (!token) return;
      setBusyGateway(gateway);
      try {
        await onboardPayoutGateway(token, gateway);
        addToast("success", `Submitted to ${GATEWAY_LABEL[gateway]}`);
        await load();
      } catch (err) {
        addToast("error", err instanceof PrincipalApiError ? err.message : "Onboarding failed");
      } finally {
        setBusyGateway(null);
      }
    },
    [token, addToast, load],
  );

  const handleRefresh = useCallback(
    async (gateway: PayoutGateway) => {
      if (!token) return;
      setBusyGateway(gateway);
      try {
        const link = await refreshPayoutGateway(token, gateway);
        addToast("success", `Status: ${STATUS_LABEL[link.status]}`);
        await load();
      } catch (err) {
        addToast("error", err instanceof PrincipalApiError ? err.message : "Refresh failed");
      } finally {
        setBusyGateway(null);
      }
    },
    [token, addToast, load],
  );

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-bg">
        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
      </main>
    );
  }
  if (!token) return null;

  const anyActive = (account?.gatewayLinks ?? []).some((l) => l.status === "active");

  return (
    <div className="flex">
      <FeesSidebar summary={summary} isLoading={isLoadingSummary} onSignOut={signOut} />
      <main className="flex-1 lg:ml-60">
        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        />
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
              Fees & Accounts
            </p>
            <h1 className="mt-1 text-xl font-semibold text-text-primary">Payment Account</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Onboard the school's bank account with the payment gateways so online fee
              collections settle directly to the school's account.
            </p>
          </div>

          {isLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
            </Card>
          ) : (
            <>
              {!anyActive && (
                <Card className="flex items-start gap-2 border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <p className="text-sm text-amber-800">
                    No gateway is active yet. Save the bank details below, then onboard a
                    gateway and wait for verification before online payments route to the
                    school's account.
                  </p>
                </Card>
              )}

              {/* Bank & business details */}
              <Card className="p-5">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-text-secondary" />
                  <h2 className="text-sm font-semibold text-text-primary">
                    Bank & Business Details
                  </h2>
                </div>
                <form onSubmit={(e) => void handleSave(e)} className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Account holder name *">
                      <Input
                        value={form.accountHolderName}
                        onChange={(e) => setField("accountHolderName", e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Account number *">
                      <Input
                        value={form.accountNumber}
                        onChange={(e) => setField("accountNumber", e.target.value)}
                        placeholder={
                          account
                            ? `Stored: ${account.accountNumberMasked} — leave blank to keep`
                            : "Bank account number"
                        }
                      />
                    </Field>
                    <Field label="IFSC *">
                      <Input
                        value={form.ifsc}
                        onChange={(e) => setField("ifsc", e.target.value.toUpperCase())}
                        placeholder="HDFC0001234"
                        required
                      />
                    </Field>
                    <Field label="Account type">
                      <Select
                        value={form.accountType}
                        onChange={(e) => setField("accountType", e.target.value)}
                      >
                        <option value="current">Current</option>
                        <option value="savings">Savings</option>
                        <option value="nodal">Nodal</option>
                      </Select>
                    </Field>
                    <Field label="Legal business name *">
                      <Input
                        value={form.legalBusinessName}
                        onChange={(e) => setField("legalBusinessName", e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Business type">
                      <Select
                        value={form.businessType}
                        onChange={(e) => setField("businessType", e.target.value)}
                      >
                        <option value="trust">Trust</option>
                        <option value="society">Society</option>
                        <option value="ngo">NGO</option>
                        <option value="proprietorship">Proprietorship</option>
                        <option value="partnership">Partnership</option>
                        <option value="private_limited">Private Limited</option>
                      </Select>
                    </Field>
                    <Field label="Contact name *">
                      <Input
                        value={form.contactName}
                        onChange={(e) => setField("contactName", e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Contact email *">
                      <Input
                        type="email"
                        value={form.contactEmail}
                        onChange={(e) => setField("contactEmail", e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Contact phone *">
                      <Input
                        value={form.contactPhone}
                        onChange={(e) => setField("contactPhone", e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="PAN">
                      <Input
                        value={form.pan}
                        onChange={(e) => setField("pan", e.target.value.toUpperCase())}
                      />
                    </Field>
                    <Field label="GSTIN">
                      <Input
                        value={form.gstin}
                        onChange={(e) => setField("gstin", e.target.value.toUpperCase())}
                      />
                    </Field>
                    <Field label="Address line">
                      <Input
                        value={form.addressLine}
                        onChange={(e) => setField("addressLine", e.target.value)}
                      />
                    </Field>
                    <Field label="City">
                      <Input value={form.city} onChange={(e) => setField("city", e.target.value)} />
                    </Field>
                    <Field label="State">
                      <Input
                        value={form.state}
                        onChange={(e) => setField("state", e.target.value)}
                      />
                    </Field>
                    <Field label="Pincode">
                      <Input
                        value={form.pincode}
                        onChange={(e) => setField("pincode", e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save details
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Gateway onboarding */}
              <div className="grid gap-3 md:grid-cols-2">
                {(["cashfree", "razorpay"] as PayoutGateway[]).map((gateway) => {
                  const link =
                    account?.gatewayLinks.find((l) => l.gateway === gateway) ??
                    ({
                      gateway,
                      status: "not_onboarded",
                      statusDetail: null,
                      gatewayAccountId: null,
                      verifiedAt: null,
                      lastSyncedAt: null,
                    } as PayoutGatewayLink);
                  const busy = busyGateway === gateway;
                  return (
                    <Card key={gateway} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-text-secondary" />
                          <h3 className="text-sm font-semibold text-text-primary">
                            {GATEWAY_LABEL[gateway]}
                          </h3>
                        </div>
                        <Badge variant={STATUS_VARIANT[link.status]}>
                          {STATUS_LABEL[link.status]}
                        </Badge>
                      </div>
                      {link.statusDetail && (
                        <p className="mt-2 text-xs text-text-muted">
                          Gateway state: {link.statusDetail}
                        </p>
                      )}
                      {link.verifiedAt && (
                        <p className="mt-1 inline-flex items-center text-xs text-emerald-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Verified {new Date(link.verifiedAt).toLocaleDateString("en-IN")}
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        {link.status === "not_onboarded" ? (
                          <Button
                            className="btn-pay h-8 text-xs"
                            disabled={busy || !account}
                            onClick={() => void handleOnboard(gateway)}
                          >
                            {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Onboard
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            className="h-8 text-xs"
                            disabled={busy}
                            onClick={() => void handleRefresh(gateway)}
                          >
                            {busy ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-1 h-3 w-3" />
                            )}
                            Refresh status
                          </Button>
                        )}
                      </div>
                      {!account && (
                        <p className="mt-2 text-xs text-text-muted">
                          Save bank details first.
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Settlements */}
              <Card className="overflow-x-auto p-0">
                <h2 className="px-4 py-3 text-sm font-semibold text-text-primary">
                  Routed Settlements
                </h2>
                {transfers.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-text-muted">
                    No routed settlements yet. They appear here once online payments are
                    collected with an active gateway.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Gateway</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map((t) => (
                        <tr key={t.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-3 text-text-secondary">
                            {new Date(t.createdAt).toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="default">{t.gateway}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-700">
                            {formatINR(t.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={t.status === "processed" ? "success" : "warning"}
                            >
                              {t.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-text-muted">
                            {t.sourceType}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Renders a real <label> wrapping its control, so the field is associated
// with its caption for assistive tech (and addressable by accessible name).
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[0.8125rem] font-medium text-text-secondary">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
