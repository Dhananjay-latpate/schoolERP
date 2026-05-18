"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ConciergeBell, Zap, ShieldCheck, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  ParentApiError,
  getServiceCatalog,
  getServiceRequests,
  createServiceRequest,
  type ServiceItem,
  type ServiceRequest,
} from "@/lib/parentFeesApi";
import { ParentHeader } from "../../_components/ParentHeader";
import { useParentSession } from "../../_components/useParentSession";

const formatINR = (value: number) =>
  `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const STATUS_BADGE: Record<
  ServiceRequest["status"],
  { variant: "warning" | "success" | "error" | "default"; label: string }
> = {
  pending: { variant: "warning", label: "Pending" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "error", label: "Rejected" },
  cancelled: { variant: "default", label: "Cancelled" },
};

export default function ParentServicesPage() {
  const { token, isChecking, signOut } = useParentSession();
  const [catalog, setCatalog] = useState<ServiceItem[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [items, reqs] = await Promise.all([
        getServiceCatalog(token),
        getServiceRequests(token),
      ]);
      setCatalog(items.filter((i) => i.isActive));
      setRequests(reqs);
    } catch (err) {
      setError(err instanceof ParentApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  const handleRequest = useCallback(
    async (item: ServiceItem) => {
      if (!token) return;
      setRequestingId(item.id);
      try {
        await createServiceRequest(token, {
          serviceItemId: item.id,
          note: notes[item.id]?.trim() || undefined,
        });
        setToast({
          kind: "success",
          message: item.requiresApproval
            ? "Submitted — awaiting school approval."
            : "Charge raised — pay it from your Dues page.",
        });
        setNotes((prev) => ({ ...prev, [item.id]: "" }));
        await refresh();
      } catch (err) {
        setToast({
          kind: "error",
          message: err instanceof ParentApiError ? err.message : "Request failed",
        });
      } finally {
        setRequestingId(null);
      }
    },
    [token, notes, refresh],
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
          <h1 className="text-xl font-semibold text-text-primary">Request a Service</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Request school services such as a bonafide or transfer certificate. Some are
            instant; others need school approval before a charge is raised.
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
        ) : (
          <>
            {/* ── Service Catalogue ───────────────────────────────────── */}
            {catalog.length === 0 ? (
              <Card className="p-8 text-center text-sm text-text-muted">
                <ConciergeBell className="mx-auto h-5 w-5 text-text-muted" />
                <p className="mt-2">No services are available right now.</p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.map((item) => (
                  <Card key={item.id} className="flex flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-text-primary">
                        {item.name}
                      </p>
                      {item.requiresApproval ? (
                        <Badge variant="warning">
                          <ShieldCheck className="mr-1 inline h-3 w-3" />
                          Needs approval
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          <Zap className="mr-1 inline h-3 w-3" />
                          Instant
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-xs text-text-secondary">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-2 text-lg font-bold text-brand-royal">
                      {formatINR(item.amount)}
                    </p>
                    <Textarea
                      rows={2}
                      value={notes[item.id] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Add a note (optional)"
                      className="mt-3 min-h-[44px] text-sm"
                    />
                    <Button
                      onClick={() => void handleRequest(item)}
                      disabled={requestingId === item.id}
                      className="btn-pay mt-3"
                    >
                      {requestingId === item.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Request
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {/* ── My Service Requests ─────────────────────────────────── */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-text-primary">
                My Service Requests
              </h3>
              {requests.length === 0 ? (
                <p className="mt-3 text-sm text-text-muted">
                  You haven&apos;t requested any services yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {requests.map((req) => {
                    const badge = STATUS_BADGE[req.status];
                    const unpaid = req.charge && req.charge.due > 0;
                    return (
                      <li
                        key={req.id}
                        className="rounded-md border border-surface-border px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {req.serviceName ?? "Service"}
                            </p>
                            <p className="text-xs text-text-muted">
                              {new Date(req.createdAt).toLocaleDateString("en-IN")}
                              {req.note ? ` · ${req.note}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-text-primary">
                              {formatINR(req.amount)}
                            </span>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </div>
                        </div>
                        {req.reviewComments && (
                          <p className="mt-1 text-xs text-text-secondary">
                            School note: {req.reviewComments}
                          </p>
                        )}
                        {unpaid && (
                          <div className="mt-2">
                            <Link
                              href="/parent/fees/dues"
                              className="inline-flex items-center text-xs font-semibold text-brand-royal hover:underline"
                            >
                              Pay this charge from Dues
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </>
        )}
      </main>
    </>
  );
}
