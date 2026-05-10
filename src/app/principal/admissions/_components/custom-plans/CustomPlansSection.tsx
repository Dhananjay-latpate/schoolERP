"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  listPendingCustomPaymentPlans,
  reviewCustomPaymentPlan,
  updatePendingCustomPaymentPlan,
  PrincipalApiError,
  type PendingCustomPaymentPlan,
  type EditableCustomInstallment,
} from "@/lib/principalApi";
import { clearPrincipalSession } from "@/lib/principalSession";
import { useRouter } from "next/navigation";
import { type CustomPlanDraftMap, UI } from "../types";
import { formatCurrency } from "../utils";

interface CustomPlansSectionProps {
  token: string;
  refreshSignal: number;
  addToast: (type: "success" | "error", message: string) => void;
  onCountChange: (count: number) => void;
}

export function CustomPlansSection({
  token,
  refreshSignal,
  addToast,
  onCountChange,
}: CustomPlansSectionProps) {
  const router = useRouter();
  const [pendingCustomPlans, setPendingCustomPlans] = useState<PendingCustomPaymentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPlanComments, setCustomPlanComments] = useState<Record<string, string>>({});
  const [customPlanDrafts, setCustomPlanDrafts] = useState<CustomPlanDraftMap>({});
  const [editingCustomPlanId, setEditingCustomPlanId] = useState<string | null>(null);
  const [actionLoadingFor, setActionLoadingFor] = useState<string | null>(null);
  const [saveLoadingFor, setSaveLoadingFor] = useState<string | null>(null);

  const loadCustomPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const plans = await listPendingCustomPaymentPlans(token);
      setPendingCustomPlans(plans);
      onCountChange(plans.length);
      setCustomPlanDrafts((prev) => {
        const allowed = new Set(plans.map((p) => p.id));
        const next: CustomPlanDraftMap = {};
        Object.entries(prev).forEach(([planId, draft]) => {
          if (allowed.has(planId)) next[planId] = draft;
        });
        return next;
      });
      setEditingCustomPlanId((current) =>
        current && plans.some((p) => p.id === current) ? current : null,
      );
    } catch (err) {
      if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) {
        clearPrincipalSession();
        router.replace("/principal/login?next=%2Fprincipal%2Fadmissions");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load custom payment requests.");
    } finally {
      setIsLoading(false);
    }
  }, [token, router, onCountChange]);

  useEffect(() => {
    if (token) void loadCustomPlans();
  }, [token, refreshSignal, loadCustomPlans]);

  const handleReviewCustomPlan = async (planId: string, approved: boolean) => {
    if (editingCustomPlanId === planId) {
      addToast("error", "Save terms before approving or rejecting this custom plan.");
      return;
    }
    const comments = customPlanComments[planId]?.trim();
    if (!comments) {
      addToast("error", "Comments are required before approving or rejecting a custom plan.");
      return;
    }
    setActionLoadingFor(planId);
    try {
      await reviewCustomPaymentPlan(token, { planId, approved, comments });
      setPendingCustomPlans((prev) => prev.filter((p) => p.id !== planId));
      onCountChange(pendingCustomPlans.length - 1);
      setCustomPlanComments((prev) => { const next = { ...prev }; delete next[planId]; return next; });
      setCustomPlanDrafts((prev) => { const next = { ...prev }; delete next[planId]; return next; });
      setEditingCustomPlanId((current) => (current === planId ? null : current));
      addToast("success", `Custom installment request ${approved ? "approved" : "rejected"} successfully.`);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to review custom installment request.");
    } finally {
      setActionLoadingFor(null);
    }
  };

  const beginEditCustomPlan = (plan: PendingCustomPaymentPlan) => {
    setEditingCustomPlanId(plan.id);
    setCustomPlanDrafts((prev) => {
      if (prev[plan.id]) return prev;
      return {
        ...prev,
        [plan.id]: plan.installments.map((i) => ({ id: i.id, name: i.name, dueDate: i.dueDate, amount: i.amount })),
      };
    });
  };

  const cancelEditCustomPlan = (planId: string) => {
    setEditingCustomPlanId((current) => (current === planId ? null : current));
    setCustomPlanDrafts((prev) => { const next = { ...prev }; delete next[planId]; return next; });
  };

  const updateCustomDraftInstallment = (
    planId: string,
    installmentId: string,
    patch: Partial<EditableCustomInstallment>,
  ) => {
    setCustomPlanDrafts((prev) => ({
      ...prev,
      [planId]: (prev[planId] ?? []).map((item) =>
        item.id === installmentId ? { ...item, ...patch } : item,
      ),
    }));
  };

  const handleSaveCustomPlanDraft = async (planId: string) => {
    const draft = customPlanDrafts[planId];
    if (!draft || draft.length === 0) {
      addToast("error", "No editable installments found.");
      return;
    }
    for (const [index, installment] of draft.entries()) {
      if (!installment.name.trim()) { addToast("error", `Installment ${index + 1} name is required.`); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(installment.dueDate)) { addToast("error", `Installment ${index + 1} due date must be in YYYY-MM-DD format.`); return; }
      if (!Number.isFinite(installment.amount) || installment.amount <= 0) { addToast("error", `Installment ${index + 1} amount must be greater than 0.`); return; }
    }
    setSaveLoadingFor(planId);
    try {
      const updated = await updatePendingCustomPaymentPlan(token, {
        planId,
        installments: draft,
        comments: customPlanComments[planId]?.trim() || undefined,
      });
      setPendingCustomPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
      setEditingCustomPlanId((current) => (current === planId ? null : current));
      setCustomPlanDrafts((prev) => { const next = { ...prev }; delete next[planId]; return next; });
      addToast("success", "Custom plan updated. You can now approve/reject final terms.");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to update custom payment plan.");
    } finally {
      setSaveLoadingFor(null);
    }
  };

  return (
    <Card className="border border-surface-border p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Custom Installment Requests</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Review and approve or reject requested custom payment plans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{pendingCustomPlans.length} pending</Badge>
          <Button variant="secondary" className={UI.queueActionBtn} disabled={isLoading} onClick={() => void loadCustomPlans()}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading custom requests…</p>
        ) : pendingCustomPlans.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            No pending custom payment plan requests.
          </div>
        ) : (
          pendingCustomPlans.map((plan) => {
            const isEditing = editingCustomPlanId === plan.id;
            const editableInstallments = customPlanDrafts[plan.id] ?? plan.installments;
            return (
              <div key={plan.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{plan.studentName}</p>
                <p className="text-xs text-slate-500">Application: {plan.applicationId}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Requested: {formatCurrency(plan.totalAmount)} · {plan.installments.length} installments
                </p>
                {plan.customPlanReason && (
                  <p className="mt-1 text-xs text-slate-500">Reason: {plan.customPlanReason}</p>
                )}

                <div className="mt-3">
                  <Label htmlFor={`plan-comments-${plan.id}`}>Review comments (required)</Label>
                  <Textarea
                    id={`plan-comments-${plan.id}`}
                    value={customPlanComments[plan.id] ?? ""}
                    onChange={(e) =>
                      setCustomPlanComments((prev) => ({ ...prev, [plan.id]: e.target.value }))
                    }
                    placeholder="Comments for approve/reject decision"
                    className="min-h-[60px]"
                  />
                </div>

                <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Installments</p>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button
                          variant="secondary"
                          className={UI.queueActionBtn}
                          disabled={saveLoadingFor === plan.id}
                          onClick={() => cancelEditCustomPlan(plan.id)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className={UI.queueActionBtn}
                          disabled={saveLoadingFor === plan.id}
                          onClick={() => void handleSaveCustomPlanDraft(plan.id)}
                        >
                          {saveLoadingFor === plan.id ? "Saving…" : "Save Terms"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        className={UI.queueActionBtn}
                        disabled={actionLoadingFor === plan.id}
                        onClick={() => beginEditCustomPlan(plan)}
                      >
                        Edit Terms
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 space-y-2">
                    {editableInstallments.map((installment) => (
                      <div key={installment.id} className="grid grid-cols-12 gap-2 text-xs">
                        <div className="col-span-5">
                          {isEditing ? (
                            <Input
                              value={installment.name}
                              onChange={(e) => updateCustomDraftInstallment(plan.id, installment.id, { name: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            <p className="truncate text-slate-800">{installment.name}</p>
                          )}
                        </div>
                        <div className="col-span-4">
                          {isEditing ? (
                            <Input
                              type="date"
                              value={installment.dueDate}
                              onChange={(e) => updateCustomDraftInstallment(plan.id, installment.id, { dueDate: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            <p className="text-slate-500">{installment.dueDate}</p>
                          )}
                        </div>
                        <div className="col-span-3">
                          {isEditing ? (
                            <Input
                              type="number"
                              min={1}
                              value={installment.amount}
                              onChange={(e) => updateCustomDraftInstallment(plan.id, installment.id, { amount: Number(e.target.value || 0) })}
                              className="h-8 text-right"
                            />
                          ) : (
                            <p className="text-right font-semibold text-slate-600">
                              {formatCurrency(installment.amount)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    className={UI.queueActionBtn}
                    disabled={actionLoadingFor === plan.id || saveLoadingFor === plan.id}
                    onClick={() => void handleReviewCustomPlan(plan.id, true)}
                  >
                    {actionLoadingFor === plan.id ? "Processing…" : "Approve"}
                  </Button>
                  <Button
                    variant="secondary"
                    className={UI.queueActionBtn}
                    disabled={actionLoadingFor === plan.id || saveLoadingFor === plan.id}
                    onClick={() => void handleReviewCustomPlan(plan.id, false)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
