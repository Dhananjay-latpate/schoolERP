"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, X, Home, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  PrincipalApiError,
  listFamilies,
  createFamily,
  getFamilySuggestions,
  type Family,
  type FamilySuggestionGroup,
} from "@/lib/principalApi";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";
import { ToastContainer, nextToastId, type ToastItem } from "../_components/ToastContainer";

const formatINR = (value: number) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function FamiliesPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [families, setFamilies] = useState<Family[]>([]);
  const [suggestions, setSuggestions] = useState<FamilySuggestionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
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
      const [familyList, groups] = await Promise.all([
        listFamilies(token),
        getFamilySuggestions(token),
      ]);
      setFamilies(familyList);
      setSuggestions(groups);
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load families");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

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
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
                Fees & Accounts
              </p>
              <h1 className="mt-1 text-xl font-semibold text-text-primary">Families</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Link sibling students under one household to see consolidated dues and
                auto-apply a sibling concession to every child after the first.
              </p>
            </div>
            <Button onClick={() => setShowModal(true)} className="btn-pay">
              <Plus className="mr-1 h-4 w-4" /> New family
            </Button>
          </div>

          {error && (
            <Card className="border-brand-rose/25 bg-brand-rose-light p-3 text-sm text-status-error">{error}</Card>
          )}

          {/* ── Families table ──────────────────────────────────────────── */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-text-primary">Households</h2>
            <Card className="overflow-x-auto p-0">
              {isLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
                </div>
              ) : families.length === 0 ? (
                <p className="py-12 text-center text-sm text-text-muted">
                  No families yet. Create one to link sibling students.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                      <th className="px-4 py-3">Family</th>
                      <th className="px-4 py-3">Primary contact</th>
                      <th className="px-4 py-3 text-right">Members</th>
                      <th className="px-4 py-3 text-right">Combined dues</th>
                      <th className="px-4 py-3 text-right">Sibling concession</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {families.map((family) => (
                      <tr key={family.id} className="border-b border-surface-divider last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary">{family.name}</p>
                          {family.primaryEmail && (
                            <p className="text-xs text-text-muted">{family.primaryEmail}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {family.primaryContact}
                        </td>
                        <td className="px-4 py-3 text-right text-text-secondary">
                          {family.memberCount}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            family.combinedDue > 0 ? "text-status-error" : "text-status-success"
                          }`}
                        >
                          {formatINR(family.combinedDue)}
                        </td>
                        <td className="px-4 py-3 text-right text-text-secondary">
                          {family.siblingConcessionPercent}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/principal/fees/families/${family.id}`}
                            className="text-sm font-medium text-brand-royal hover:underline"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </section>

          {/* ── Suggested sibling groups ────────────────────────────────── */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Suggested sibling groups
            </h2>
            {isLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
              </Card>
            ) : suggestions.length === 0 ? (
              <Card className="p-8 text-center">
                <Lightbulb className="mx-auto h-6 w-6 text-text-muted" />
                <p className="mt-2 text-sm text-text-secondary">
                  No sibling clusters detected. Students that share an emergency contact
                  will appear here.
                </p>
              </Card>
            ) : (
              <>
                <p className="text-xs text-text-muted">
                  These students share an emergency contact, so they may be siblings.
                  Create a family above and link them from the family detail page.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {suggestions.map((group) => (
                    <Card key={group.contact} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {group.suggestedName}
                          </p>
                          <p className="text-xs text-text-muted">
                            Shared contact: {group.contact}
                          </p>
                        </div>
                        <Badge variant="info">
                          {group.members.length} student
                          {group.members.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {group.members.map((member) => (
                          <li
                            key={member.applicationId}
                            className="flex items-center justify-between gap-2 rounded-md border border-surface-border px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-medium text-text-primary">
                                {member.studentName}
                              </p>
                              <p className="text-xs text-text-muted">
                                {member.className ?? "Class —"} ·{" "}
                                {member.applicationId}
                              </p>
                            </div>
                            {member.alreadyLinked ? (
                              <Badge variant="success">Linked</Badge>
                            ) : (
                              <Badge variant="default">Unlinked</Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {showModal && (
          <NewFamilyModal
            token={token}
            onClose={() => setShowModal(false)}
            onSaved={async () => {
              setShowModal(false);
              addToast("success", "Family created");
              await refresh();
            }}
            onError={(msg) => addToast("error", msg)}
          />
        )}
      </main>
    </div>
  );
}

function NewFamilyModal({
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
  const [primaryContact, setPrimaryContact] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [concession, setConcession] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        onError("Family name is required");
        return;
      }
      if (!primaryContact.trim()) {
        onError("Primary contact is required");
        return;
      }
      let percent: number | undefined;
      if (concession.trim()) {
        const parsed = parseFloat(concession);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
          onError("Sibling concession must be between 0 and 100");
          return;
        }
        percent = parsed;
      }
      setSaving(true);
      try {
        await createFamily(token, {
          name: name.trim(),
          primaryContact: primaryContact.trim(),
          primaryEmail: primaryEmail.trim() || undefined,
          siblingConcessionPercent: percent,
        });
        onSaved();
      } catch (err) {
        onError(err instanceof PrincipalApiError ? err.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [token, name, primaryContact, primaryEmail, concession, onSaved, onError],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-surface-divider px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <Home className="h-4 w-4 text-brand-royal" />
            New family
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
            <Label htmlFor="fam-name">Family name *</Label>
            <Input
              id="fam-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sharma Family"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="fam-contact">Primary contact *</Label>
            <Input
              id="fam-contact"
              value={primaryContact}
              onChange={(e) => setPrimaryContact(e.target.value)}
              placeholder="Phone number of the parent / guardian"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="fam-email">Primary email</Label>
            <Input
              id="fam-email"
              type="email"
              value={primaryEmail}
              onChange={(e) => setPrimaryEmail(e.target.value)}
              placeholder="Optional"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="fam-concession">Sibling concession (%)</Label>
            <Input
              id="fam-concession"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={concession}
              onChange={(e) => setConcession(e.target.value)}
              placeholder="e.g., 10"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-text-muted">
              Applied to every sibling except the first-enrolled child.
            </p>
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
