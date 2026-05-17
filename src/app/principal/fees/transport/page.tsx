"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  X,
  Bus,
  MapPin,
  CalendarClock,
  Inbox,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  PrincipalApiError,
  listTransportRoutes,
  createTransportRoute,
  createTransportStop,
  listTransportAssignments,
  assignTransport,
  endTransportAssignment,
  generateTransportBilling,
  type TransportRoute,
  type TransportAssignment,
  type TransportBillingResult,
} from "@/lib/principalApi";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";
import { ToastContainer, nextToastId, type ToastItem } from "../_components/ToastContainer";

const formatINR = (value: number) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatMonth = (value: string) => {
  // value is "YYYY-MM"
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

const currentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function TransportPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [assignments, setAssignments] = useState<TransportAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [stopModalRoute, setStopModalRoute] = useState<TransportRoute | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Assignment form state
  const [assignAppId, setAssignAppId] = useState("");
  const [assignStopId, setAssignStopId] = useState("");
  const [assignStartMonth, setAssignStartMonth] = useState(currentMonthValue());
  const [assigning, setAssigning] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);

  // Billing state
  const [billingMonth, setBillingMonth] = useState(currentMonthValue());
  const [generating, setGenerating] = useState(false);
  const [billingResult, setBillingResult] = useState<TransportBillingResult | null>(null);

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
      const [routeList, activeAssignments] = await Promise.all([
        listTransportRoutes(token),
        listTransportAssignments(token, "active"),
      ]);
      setRoutes(routeList);
      setAssignments(activeAssignments);
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load transport");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  // All active stops across all (active) routes, for the assignment dropdown.
  const stopOptions = useMemo(
    () =>
      routes
        .filter((route) => route.isActive)
        .flatMap((route) =>
          route.stops
            .filter((stop) => stop.isActive)
            .map((stop) => ({
              id: stop.id,
              label: `${route.name} — ${stop.name} (${formatINR(stop.monthlyFee)})`,
            })),
        ),
    [routes],
  );

  const handleAssign = useCallback(async () => {
    if (!token) return;
    const appId = assignAppId.trim();
    if (!appId) {
      addToast("error", "Enter an application ID");
      return;
    }
    if (!assignStopId) {
      addToast("error", "Select a stop");
      return;
    }
    if (!assignStartMonth) {
      addToast("error", "Select a start month");
      return;
    }
    setAssigning(true);
    try {
      const result = await assignTransport(token, {
        applicationId: appId,
        stopId: assignStopId,
        startMonth: assignStartMonth,
      });
      addToast("success", result.message);
      setAssignAppId("");
      setAssignStopId("");
      setAssignStartMonth(currentMonthValue());
      await refresh();
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to assign");
    } finally {
      setAssigning(false);
    }
  }, [token, assignAppId, assignStopId, assignStartMonth, addToast, refresh]);

  const handleEnd = useCallback(
    async (assignment: TransportAssignment) => {
      if (!token) return;
      const endMonth = window.prompt(
        `End transport for ${assignment.studentName}?\nEnter the last billed month (YYYY-MM):`,
        currentMonthValue(),
      );
      if (!endMonth) return;
      if (!/^\d{4}-\d{2}$/.test(endMonth.trim())) {
        addToast("error", "End month must be in YYYY-MM format");
        return;
      }
      setEndingId(assignment.id);
      try {
        const result = await endTransportAssignment(token, assignment.id, endMonth.trim());
        addToast("success", result.message);
        await refresh();
      } catch (err) {
        addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to end");
      } finally {
        setEndingId(null);
      }
    },
    [token, addToast, refresh],
  );

  const handleGenerateBilling = useCallback(async () => {
    if (!token) return;
    if (!billingMonth) {
      addToast("error", "Select a billing month");
      return;
    }
    setGenerating(true);
    try {
      const result = await generateTransportBilling(token, billingMonth);
      setBillingResult(result.data);
      addToast(
        "success",
        `${result.message} — ${result.data.generated} charged, ${formatINR(result.data.totalBilled)} billed`,
      );
      await refresh();
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }, [token, billingMonth, addToast, refresh]);

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
              <h1 className="mt-1 text-xl font-semibold text-text-primary">Transport</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Set up bus routes and stops, assign students to a stop, and run the
                monthly billing job to raise transport charges on their fee accounts.
              </p>
            </div>
            <Button onClick={() => setShowRouteModal(true)} className="btn-pay">
              <Plus className="mr-1 h-4 w-4" /> New route
            </Button>
          </div>

          {error && (
            <Card className="border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</Card>
          )}

          {/* ── Routes & stops ──────────────────────────────────────────── */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-text-primary">Routes &amp; stops</h2>
            {isLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
              </Card>
            ) : routes.length === 0 ? (
              <Card className="p-12 text-center">
                <Bus className="mx-auto h-6 w-6 text-text-muted" />
                <p className="mt-2 text-sm text-text-secondary">
                  No routes yet. Create one to start adding stops.
                </p>
              </Card>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {routes.map((route) => (
                  <Card key={route.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-text-primary">
                            {route.name}
                          </span>
                          <span className="font-mono text-xs text-text-muted">
                            {route.code}
                          </span>
                          {route.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="default">Inactive</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-text-muted">
                          {route.vehicleNumber ? `Vehicle ${route.vehicleNumber}` : "No vehicle"}
                          {route.driverName ? ` · ${route.driverName}` : ""}
                          {route.driverContact ? ` · ${route.driverContact}` : ""}
                        </p>
                        {route.description && (
                          <p className="mt-1 text-xs text-text-secondary">
                            {route.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        className="h-8 text-xs"
                        onClick={() => setStopModalRoute(route)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add stop
                      </Button>
                    </div>

                    <div className="mt-3 overflow-x-auto rounded-lg border border-surface-border">
                      {route.stops.length === 0 ? (
                        <p className="py-6 text-center text-xs text-text-muted">
                          No stops on this route yet.
                        </p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                              <th className="px-3 py-2">Stop</th>
                              <th className="px-3 py-2 text-right">Distance</th>
                              <th className="px-3 py-2 text-right">Monthly fee</th>
                            </tr>
                          </thead>
                          <tbody>
                            {route.stops.map((stop) => (
                              <tr
                                key={stop.id}
                                className="border-b border-gray-100 last:border-0"
                              >
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center gap-1.5 text-text-primary">
                                    <MapPin className="h-3.5 w-3.5 text-text-muted" />
                                    {stop.name}
                                  </span>
                                  {!stop.isActive && (
                                    <Badge variant="default" className="ml-2">
                                      Inactive
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right text-text-secondary">
                                  {stop.distanceKm != null
                                    ? `${stop.distanceKm} km`
                                    : "—"}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-text-primary">
                                  {formatINR(stop.monthlyFee)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ── Student assignments ─────────────────────────────────────── */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Student assignments
            </h2>

            <Card className="p-4">
              <h3 className="text-sm font-semibold text-text-primary">Assign student</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Assign a student to a stop. A transport charge is raised each month
                from the start month.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="tr-app">Application ID</Label>
                  <Input
                    id="tr-app"
                    value={assignAppId}
                    onChange={(e) => setAssignAppId(e.target.value)}
                    placeholder="e.g., APP-2026-00123"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tr-stop">Stop</Label>
                  <Select
                    id="tr-stop"
                    value={assignStopId}
                    onChange={(e) => setAssignStopId(e.target.value)}
                    className="mt-1"
                  >
                    <option value="">Select a stop…</option>
                    {stopOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tr-start">Start month</Label>
                  <Input
                    id="tr-start"
                    type="month"
                    value={assignStartMonth}
                    onChange={(e) => setAssignStartMonth(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => void handleAssign()}
                    disabled={assigning || stopOptions.length === 0}
                    className="w-full"
                  >
                    {assigning ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-1 h-4 w-4" />
                    )}
                    Assign
                  </Button>
                </div>
              </div>
              {stopOptions.length === 0 && (
                <p className="mt-2 text-xs text-text-muted">
                  Add at least one active stop on an active route before assigning students.
                </p>
              )}
            </Card>

            <Card className="overflow-x-auto p-0">
              <h3 className="px-4 py-3 text-sm font-semibold text-text-primary">
                Active assignments
              </h3>
              {isLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
                </div>
              ) : assignments.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-text-muted">
                  No active transport assignments.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Route · Stop</th>
                      <th className="px-4 py-3 text-right">Monthly fee</th>
                      <th className="px-4 py-3">Start month</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr
                        key={assignment.id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary">
                            {assignment.studentName}
                          </p>
                          <p className="text-xs text-text-muted">
                            {assignment.applicationId}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {assignment.className ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {assignment.routeName} · {assignment.stopName}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-text-primary">
                          {formatINR(assignment.monthlyFee)}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {formatMonth(assignment.startMonth)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void handleEnd(assignment)}
                            disabled={endingId === assignment.id}
                            className="inline-flex items-center text-xs font-medium text-rose-700 hover:underline disabled:opacity-50"
                          >
                            {endingId === assignment.id ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <X className="mr-1 h-3.5 w-3.5" />
                            )}
                            End
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </section>

          {/* ── Monthly billing ─────────────────────────────────────────── */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-text-primary">Monthly billing</h2>
            <Card className="p-4">
              <p className="text-sm text-text-secondary">
                Raise a transport charge on every actively-assigned student for the
                selected month. Students already billed for that month are skipped.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="w-48">
                  <Label htmlFor="tr-billing-month">Billing month</Label>
                  <Input
                    id="tr-billing-month"
                    type="month"
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={() => void handleGenerateBilling()}
                  disabled={generating}
                  className="btn-pay"
                >
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarClock className="mr-1 h-4 w-4" />
                  )}
                  Generate transport charges
                </Button>
              </div>

              {billingResult ? (
                <div className="mt-4 rounded-lg border border-surface-border p-3">
                  <p className="text-sm font-semibold text-text-primary">
                    {billingResult.monthLabel}
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-4">
                    <BillingTile
                      label="Eligible"
                      value={String(billingResult.eligible)}
                      tone="text-text-primary"
                    />
                    <BillingTile
                      label="Charged"
                      value={String(billingResult.generated)}
                      tone="text-emerald-700"
                    />
                    <BillingTile
                      label="Already billed"
                      value={String(billingResult.skipped)}
                      tone="text-amber-700"
                    />
                    <BillingTile
                      label="Total billed"
                      value={formatINR(billingResult.totalBilled)}
                      tone="text-brand-royal"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-surface-border p-3 text-xs text-text-muted">
                  <Inbox className="h-4 w-4" />
                  Run the billing job to see a summary here.
                </div>
              )}
            </Card>
          </section>
        </div>

        {showRouteModal && (
          <RouteModal
            token={token}
            onClose={() => setShowRouteModal(false)}
            onSaved={async () => {
              setShowRouteModal(false);
              addToast("success", "Route created");
              await refresh();
            }}
            onError={(msg) => addToast("error", msg)}
          />
        )}

        {stopModalRoute && (
          <StopModal
            token={token}
            route={stopModalRoute}
            onClose={() => setStopModalRoute(null)}
            onSaved={async () => {
              setStopModalRoute(null);
              addToast("success", "Stop added");
              await refresh();
            }}
            onError={(msg) => addToast("error", msg)}
          />
        )}
      </main>
    </div>
  );
}

function BillingTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-3 text-center">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function RouteModal({
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
  const [name, setName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverContact, setDriverContact] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        onError("Route name is required");
        return;
      }
      setSaving(true);
      try {
        await createTransportRoute(token, {
          name: name.trim(),
          vehicleNumber: vehicleNumber.trim() || undefined,
          driverName: driverName.trim() || undefined,
          driverContact: driverContact.trim() || undefined,
        });
        onSaved();
      } catch (err) {
        onError(err instanceof PrincipalApiError ? err.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [token, name, vehicleNumber, driverName, driverContact, onSaved, onError],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <Bus className="h-4 w-4 text-brand-royal" />
            New route
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
            <Label htmlFor="route-name">Route name *</Label>
            <Input
              id="route-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., North Loop"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="route-vehicle">Vehicle number</Label>
            <Input
              id="route-vehicle"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g., MH12 AB 1234 (optional)"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="route-driver">Driver name</Label>
            <Input
              id="route-driver"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Optional"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="route-contact">Driver contact</Label>
            <Input
              id="route-contact"
              value={driverContact}
              onChange={(e) => setDriverContact(e.target.value)}
              placeholder="Optional"
              className="mt-1"
            />
          </div>
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

function StopModal({
  token,
  route,
  onClose,
  onSaved,
  onError,
}: {
  token: string;
  route: TransportRoute;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        onError("Stop name is required");
        return;
      }
      const fee = parseFloat(monthlyFee);
      if (!Number.isFinite(fee) || fee < 0) {
        onError("Provide a valid monthly fee");
        return;
      }
      let distance: number | undefined;
      if (distanceKm.trim()) {
        const parsed = parseFloat(distanceKm);
        if (!Number.isFinite(parsed) || parsed < 0) {
          onError("Provide a valid distance");
          return;
        }
        distance = parsed;
      }
      setSaving(true);
      try {
        await createTransportStop(token, {
          routeId: route.id,
          name: name.trim(),
          distanceKm: distance,
          monthlyFee: fee,
        });
        onSaved();
      } catch (err) {
        onError(err instanceof PrincipalApiError ? err.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [token, route.id, name, distanceKm, monthlyFee, onSaved, onError],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <MapPin className="h-4 w-4 text-brand-royal" />
            Add stop · {route.name}
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
            <Label htmlFor="stop-name">Stop name *</Label>
            <Input
              id="stop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Market Square"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="stop-distance">Distance (km)</Label>
            <Input
              id="stop-distance"
              type="number"
              min="0"
              step="0.1"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="Optional"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="stop-fee">Monthly fee (₹) *</Label>
            <Input
              id="stop-fee"
              type="number"
              min="0"
              step="0.01"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              placeholder="e.g., 800"
              className="mt-1"
              required
            />
          </div>
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
