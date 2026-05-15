"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  PrincipalApiError,
  archiveFeeHead,
  listFeeHeads,
  upsertFeeHead,
} from "@/lib/principalApi";
import type { FeeHead, FeeHeadCategory } from "@/types/fees";
import { FeesSidebar } from "../../_components/Sidebar";
import { useFeesSession } from "../../_components/useFeesSession";
import { ToastContainer, type ToastItem } from "../../_components/ToastContainer";

const CATEGORIES: FeeHeadCategory[] = [
  "tuition",
  "admission",
  "exam",
  "transport",
  "hostel",
  "activity",
  "uniform",
  "books",
  "late_fee",
  "concession",
  "misc",
];

export default function FeeHeadsPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await listFeeHeads(token);
      setHeads(data);
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load fee heads");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  const handleArchive = useCallback(
    async (id: string) => {
      if (!token) return;
      if (!confirm("Archive this fee head? It will no longer appear in selectors.")) return;
      try {
        await archiveFeeHead(token, id);
        addToast("success", "Fee head archived");
        await refresh();
      } catch (err) {
        const msg = err instanceof PrincipalApiError ? err.message : "Failed to archive";
        addToast("error", msg);
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
        <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
                Masters
              </p>
              <h1 className="mt-1 text-xl font-semibold text-text-primary">Fee Heads</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Define the line items used to build fee structures and assign charges.
              </p>
            </div>
            <Button onClick={() => setShowModal(true)} className="btn-pay">
              <Plus className="mr-1 h-4 w-4" /> New fee head
            </Button>
          </div>

          {error && (
            <Card className="border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</Card>
          )}

          <Card className="overflow-x-auto p-0">
            {isLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
              </div>
            ) : heads.length === 0 ? (
              <p className="py-12 text-center text-sm text-text-muted">
                No fee heads yet. Create one to get started.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Mandatory</th>
                    <th className="px-4 py-3 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {heads.map((head) => (
                    <tr key={head.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{head.code}</td>
                      <td className="px-4 py-3 font-medium text-text-primary">{head.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="default">{head.category}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {head.isMandatory ? (
                          <Badge variant="info">Mandatory</Badge>
                        ) : (
                          <Badge variant="default">Optional</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleArchive(head.id)}
                          className="text-xs font-medium text-rose-700 hover:underline"
                        >
                          Archive
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {showModal && (
          <FeeHeadModal
            token={token}
            onClose={() => setShowModal(false)}
            onSaved={async () => {
              setShowModal(false);
              addToast("success", "Fee head saved");
              await refresh();
            }}
            onError={(msg) => addToast("error", msg)}
          />
        )}
      </main>
    </div>
  );
}

function FeeHeadModal({
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
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FeeHeadCategory>("tuition");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!code.trim() || !name.trim()) {
        onError("Code and name are required");
        return;
      }
      setIsSaving(true);
      try {
        await upsertFeeHead(token, {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          category,
        });
        onSaved();
      } catch (err) {
        const msg = err instanceof PrincipalApiError ? err.message : "Failed to save";
        onError(msg);
      } finally {
        setIsSaving(false);
      }
    },
    [token, code, name, category, onSaved, onError],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">New fee head</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., TUI-01"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tuition Fee"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FeeHeadCategory)}
              className="mt-1"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
