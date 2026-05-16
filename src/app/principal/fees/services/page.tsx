"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, X, ConciergeBell, Inbox, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import {
  PrincipalApiError,
  listServiceItems,
  upsertServiceItem,
  setServiceItemActive,
  listServiceRequests,
  reviewServiceRequest,
  type ServiceItem,
  type ServiceRequest,
} from "@/lib/principalApi";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";
import { ToastContainer, nextToastId, type ToastItem } from "../_components/ToastContainer";

const formatINR = (value: number) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function ServicesPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ServiceItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = nextToastId();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const [catalog, pending] = await Promise.all([
        listServiceItems(token, false),
        listServiceRequests(token, "pending"),
      ]);
      setItems(catalog);
      setRequests(pending);
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load services");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  const handleToggle = useCallback(
    async (item: ServiceItem) => {
      if (!token) return;
      setTogglingId(item.id);
      try {
        await setServiceItemActive(token, item.id, !item.isActive);
        addToast("success", item.isActive ? "Service deactivated" : "Service activated");
        await refresh();
      } catch (err) {
        addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to update");
      } finally {
        setTogglingId(null);
      }
    },
    [token, addToast, refresh],
  );

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
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
                Fees & Accounts
              </p>
              <h1 className="mt-1 text-xl font-semibold text-text-primary">Services</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Manage the service catalogue (bonafide certificate, transfer certificate,
                etc.) and review service requests from students and parents.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditItem(null);
                setShowModal(true);
              }}
              className="btn-pay"
            >
              <Plus className="mr-1 h-4 w-4" /> New service
            </Button>
          </div>

          {error && (
            <Card className="border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</Card>
          )}

          {/* ── Service Catalogue ───────────────────────────────────────── */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-text-primary">Service Catalogue</h2>
            <Card className="overflow-x-auto p-0">
              {isLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
                </div>
              ) : items.length === 0 ? (
                <p className="py-12 text-center text-sm text-text-muted">
                  No services yet. Create one to get started.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-text-muted">{item.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                          {item.code || "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-text-primary">
                          {formatINR(item.amount)}
                        </td>
                        <td className="px-4 py-3">
                          {item.requiresApproval ? (
                            <Badge variant="warning">Needs approval</Badge>
                          ) : (
                            <Badge variant="success">Self-service</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.isActive ? (
                            <Badge variant="info">Active</Badge>
                          ) : (
                            <Badge variant="default">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setEditItem(item);
                                setShowModal(true);
                              }}
                              className="text-xs font-medium text-brand-royal hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleToggle(item)}
                              disabled={togglingId === item.id}
                              className={`text-xs font-medium hover:underline ${
                                item.isActive ? "text-rose-700" : "text-emerald-700"
                              }`}
                            >
                              {togglingId === item.id
                                ? "…"
                                : item.isActive
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </section>

          {/* ── Pending Service Requests ────────────────────────────────── */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Pending Service Requests
            </h2>
            {isLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
              </Card>
            ) : requests.length === 0 ? (
              <Card className="p-12 text-center">
                <Inbox className="mx-auto h-6 w-6 text-text-muted" />
                <p className="mt-2 text-sm text-text-secondary">
                  No service requests awaiting your decision.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <ServiceRequestCard
                    key={req.id}
                    token={token}
                    request={req}
                    onReviewed={(msg) => {
                      addToast("success", msg);
                      void refresh();
                    }}
                    onError={(msg) => addToast("error", msg)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {showModal && (
          <ServiceItemModal
            token={token}
            item={editItem}
            onClose={() => setShowModal(false)}
            onSaved={async () => {
              setShowModal(false);
              addToast("success", editItem ? "Service updated" : "Service created");
              await refresh();
            }}
            onError={(msg) => addToast("error", msg)}
          />
        )}
      </main>
    </div>
  );
}

function ServiceRequestCard({
  token,
  request,
  onReviewed,
  onError,
}: {
  token: string;
  request: ServiceRequest;
  onReviewed: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [comments, setComments] = useState("");
  const [amountOverride, setAmountOverride] = useState("");
  const [pending, setPending] = useState(false);

  const handleReview = useCallback(
    async (approved: boolean) => {
      setPending(true);
      try {
        const amount = parseFloat(amountOverride);
        await reviewServiceRequest(token, {
          requestId: request.id,
          approved,
          amount:
            approved && Number.isFinite(amount) && amount > 0 ? amount : undefined,
          comments: comments.trim() || undefined,
        });
        onReviewed(approved ? "Request approved" : "Request rejected");
      } catch (err) {
        onError(err instanceof PrincipalApiError ? err.message : "Review failed");
      } finally {
        setPending(false);
      }
    },
    [token, request.id, amountOverride, comments, onReviewed, onError],
  );

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Pending</Badge>
            <span className="text-sm font-semibold text-text-primary">
              {request.serviceName ?? "Service"}
            </span>
            {request.serviceCode && (
              <span className="font-mono text-xs text-text-muted">
                {request.serviceCode}
              </span>
            )}
            <span className="text-sm font-semibold text-text-primary">
              {formatINR(request.amount)}
            </span>
          </div>
          <p className="mt-2 text-sm text-text-primary">
            {request.studentName ?? request.requestedByName ?? "—"}
            {request.applicationId ? ` · ${request.applicationId}` : ""}
          </p>
          {request.note && (
            <p className="mt-1 text-sm text-text-secondary">Note: {request.note}</p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Requested {new Date(request.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-surface-border pt-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor={`amount-${request.id}`}>Amount override (₹)</Label>
            <Input
              id={`amount-${request.id}`}
              type="number"
              min="0"
              step="0.01"
              value={amountOverride}
              onChange={(e) => setAmountOverride(e.target.value)}
              placeholder={String(request.amount)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor={`comments-${request.id}`}>Comments</Label>
            <Textarea
              id={`comments-${request.id}`}
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Comments (optional)"
              className="mt-1 min-h-[44px]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => void handleReview(false)}
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-1 h-4 w-4" />
            )}
            Reject
          </Button>
          <Button disabled={pending} onClick={() => void handleReview(true)}>
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1 h-4 w-4" />
            )}
            Approve
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ServiceItemModal({
  token,
  item,
  onClose,
  onSaved,
  onError,
}: {
  token: string;
  item: ServiceItem | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [code, setCode] = useState(item?.code ?? "");
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [requiresApproval, setRequiresApproval] = useState(
    item?.requiresApproval ?? false,
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        onError("Service name is required");
        return;
      }
      const price = parseFloat(amount);
      if (!Number.isFinite(price) || price < 0) {
        onError("Provide a valid price");
        return;
      }
      setSaving(true);
      try {
        await upsertServiceItem(token, {
          id: item?.id,
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          amount: price,
          requiresApproval,
        });
        onSaved();
      } catch (err) {
        onError(err instanceof PrincipalApiError ? err.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [token, item, name, code, amount, description, requiresApproval, onSaved, onError],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <ConciergeBell className="h-4 w-4 text-brand-royal" />
            {item ? "Edit service" : "New service"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
          <div>
            <Label htmlFor="svc-name">Name *</Label>
            <Input
              id="svc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Bonafide Certificate"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="svc-code">Code</Label>
            <Input
              id="svc-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., BONAFIDE (optional)"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="svc-amount">Price (₹) *</Label>
            <Input
              id="svc-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="svc-desc">Description</Label>
            <Textarea
              id="svc-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description shown to parents (optional)"
              className="mt-1 min-h-[44px]"
            />
          </div>
          <label className="flex items-start gap-2.5 rounded-lg border border-surface-border p-3">
            <input
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-surface-border text-brand-royal"
            />
            <span className="text-sm text-text-primary">
              Requires principal approval
              <span className="mt-0.5 block text-xs text-text-muted">
                When unchecked, requesting the service instantly raises a payable
                charge. When checked, it waits for your review.
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
