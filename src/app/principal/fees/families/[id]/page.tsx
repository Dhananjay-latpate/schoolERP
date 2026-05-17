"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, ArrowLeft, Sparkles, Link2, Unlink } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  PrincipalApiError,
  getFamily,
  updateFamily,
  applySiblingConcession,
  linkFamilyMember,
  unlinkFamilyMember,
  type FamilyDetail,
} from "@/lib/principalApi";
import { FeesSidebar } from "../../_components/Sidebar";
import { useFeesSession } from "../../_components/useFeesSession";
import { ToastContainer, nextToastId, type ToastItem } from "../../_components/ToastContainer";

const formatINR = (value: number) =>
  `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function FamilyDetailPage() {
  const params = useParams<{ id: string }>();
  const familyId = params?.id;
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Concession editor state
  const [concessionInput, setConcessionInput] = useState("");
  const [savingConcession, setSavingConcession] = useState(false);
  const [applying, setApplying] = useState(false);

  // Add-member state
  const [newApplicationId, setNewApplicationId] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = nextToastId();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const fetchDetail = useCallback(async () => {
    if (!token || !familyId) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await getFamily(token, familyId);
      setFamily(data);
      setConcessionInput(String(data.siblingConcessionPercent));
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load family");
    } finally {
      setIsLoading(false);
    }
  }, [token, familyId]);

  useEffect(() => {
    if (token && familyId) void fetchDetail();
  }, [token, familyId, fetchDetail]);

  const handleSaveConcession = useCallback(async () => {
    if (!token || !familyId) return;
    const parsed = parseFloat(concessionInput);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      addToast("error", "Sibling concession must be between 0 and 100");
      return;
    }
    setSavingConcession(true);
    try {
      const updated = await updateFamily(token, familyId, {
        siblingConcessionPercent: parsed,
      });
      setFamily(updated);
      setConcessionInput(String(updated.siblingConcessionPercent));
      addToast("success", "Sibling concession updated");
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to update");
    } finally {
      setSavingConcession(false);
    }
  }, [token, familyId, concessionInput, addToast]);

  const handleApply = useCallback(async () => {
    if (!token || !familyId) return;
    setApplying(true);
    try {
      const result = await applySiblingConcession(token, familyId);
      addToast("success", result.message);
      await fetchDetail();
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to apply");
    } finally {
      setApplying(false);
    }
  }, [token, familyId, addToast, fetchDetail]);

  const handleLink = useCallback(async () => {
    if (!token || !familyId) return;
    const appId = newApplicationId.trim();
    if (!appId) {
      addToast("error", "Enter an application ID");
      return;
    }
    setLinking(true);
    try {
      const updated = await linkFamilyMember(token, familyId, appId);
      setFamily(updated);
      setNewApplicationId("");
      addToast("success", "Student linked to family");
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to link");
    } finally {
      setLinking(false);
    }
  }, [token, familyId, newApplicationId, addToast]);

  const handleUnlink = useCallback(
    async (applicationId: string) => {
      if (!token || !familyId) return;
      setUnlinkingId(applicationId);
      try {
        const updated = await unlinkFamilyMember(token, familyId, applicationId);
        setFamily(updated);
        addToast("success", "Student unlinked");
      } catch (err) {
        addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to unlink");
      } finally {
        setUnlinkingId(null);
      }
    },
    [token, familyId, addToast],
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
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href="/principal/fees/families"
            className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All families
          </Link>

          {isLoading ? (
            <div className="space-y-4">
              <Card className="space-y-3 p-6">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-56" />
                <div className="grid gap-3 pt-2 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </Card>
            </div>
          ) : error ? (
            <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</Card>
          ) : !family ? (
            <EmptyState
              icon={ArrowLeft}
              title="Family not found"
              description="This family may have been removed, or the link is out of date."
            />
          ) : (
            <>
              <Card className="overflow-hidden p-0">
                <div className="brand-gradient p-6 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                        Family
                      </p>
                      <h1 className="mt-1 text-2xl font-bold">{family.name}</h1>
                      <p className="mt-1 text-sm text-white/80">
                        {family.primaryContact}
                        {family.primaryEmail ? ` · ${family.primaryEmail}` : ""}
                        {family.address ? ` · ${family.address}` : ""}
                      </p>
                    </div>
                    <Badge className="bg-surface-card/20 text-white">
                      {family.members.length} member
                      {family.members.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-4">
                  <SummaryTile
                    label="Charged"
                    value={formatINR(family.combined.charged)}
                    tone="text-text-primary"
                  />
                  <SummaryTile
                    label="Concession"
                    value={formatINR(family.combined.concession)}
                    tone="text-emerald-700"
                  />
                  <SummaryTile
                    label="Paid"
                    value={formatINR(family.combined.paid)}
                    tone="text-brand-royal"
                  />
                  <SummaryTile
                    label="Outstanding"
                    value={formatINR(family.combined.due)}
                    tone={family.combined.due > 0 ? "text-rose-700" : "text-emerald-700"}
                  />
                </div>
              </Card>

              {/* ── Sibling concession ──────────────────────────────────── */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-text-primary">
                  Sibling concession
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Set the discount applied to every sibling except the first-enrolled
                  child, then apply it to their fee accounts.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="w-40">
                    <Label htmlFor="fam-concession">Concession (%)</Label>
                    <Input
                      id="fam-concession"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={concessionInput}
                      onChange={(e) => setConcessionInput(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => void handleSaveConcession()}
                    disabled={savingConcession}
                  >
                    {savingConcession && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save %
                  </Button>
                  <Button
                    onClick={() => void handleApply()}
                    disabled={applying}
                    className="btn-pay"
                  >
                    {applying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-4 w-4" />
                    )}
                    Apply sibling concession
                  </Button>
                </div>
              </Card>

              {/* ── Add student ─────────────────────────────────────────── */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-text-primary">Add student</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Link a student to this family by their application ID.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <Label htmlFor="fam-add-app">Application ID</Label>
                    <Input
                      id="fam-add-app"
                      value={newApplicationId}
                      onChange={(e) => setNewApplicationId(e.target.value)}
                      placeholder="e.g., APP-2026-00123"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={() => void handleLink()} disabled={linking}>
                    {linking ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-1 h-4 w-4" />
                    )}
                    Link
                  </Button>
                </div>
              </Card>

              {/* ── Members ─────────────────────────────────────────────── */}
              <Card className="overflow-x-auto p-0">
                <h3 className="px-4 py-3 text-sm font-semibold text-text-primary">
                  Members
                </h3>
                {family.members.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-text-muted">
                    No students linked yet. Add one above.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3 text-right">Charged</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Due</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {family.members.map((member) => (
                        <tr
                          key={member.internalId}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-text-primary">
                                {member.studentName}
                              </p>
                              {member.isPrimary && (
                                <Badge variant="info">Primary</Badge>
                              )}
                              {member.account?.hasSiblingConcession && (
                                <Badge variant="success">Concession applied</Badge>
                              )}
                            </div>
                            <p className="text-xs text-text-muted">
                              {member.applicationId}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {member.className ?? "—"}
                          </td>
                          {member.account ? (
                            <>
                              <td className="px-4 py-3 text-right text-text-secondary">
                                {formatINR(member.account.totalCharged)}
                              </td>
                              <td className="px-4 py-3 text-right text-emerald-700">
                                {formatINR(member.account.totalPaid)}
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-semibold ${
                                  member.account.totalDue > 0
                                    ? "text-rose-700"
                                    : "text-emerald-700"
                                }`}
                              >
                                {formatINR(member.account.totalDue)}
                              </td>
                            </>
                          ) : (
                            <td
                              className="px-4 py-3 text-center text-xs text-text-muted"
                              colSpan={3}
                            >
                              No fee account yet
                            </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => void handleUnlink(member.applicationId)}
                              disabled={unlinkingId === member.applicationId}
                              className="inline-flex items-center text-xs font-medium text-rose-700 hover:underline disabled:opacity-50"
                            >
                              {unlinkingId === member.applicationId ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Unlink className="mr-1 h-3.5 w-3.5" />
                              )}
                              Unlink
                            </button>
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

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-3 text-center">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
