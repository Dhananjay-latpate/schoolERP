"use client";

import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  type ActionContext,
  type ActionDescriptor,
  type PrincipalAction,
  computeAvailableActions,
  computeNextStepHint,
} from "@/lib/admissionWorkflow";

export type ActionBarSubmitPayload = {
  action: PrincipalAction;
  comments: string;
  correctionDetails?: string;
};

interface ActionBarProps {
  context: ActionContext;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  onSubmit: (payload: ActionBarSubmitPayload) => void | Promise<void>;
}

const variantClass: Record<ActionDescriptor["variant"], string> = {
  primary: "bg-brand-royal text-white hover:bg-brand-royal/90",
  secondary:
    "border border-surface-border bg-surface-card text-text-primary hover:border-brand-royal hover:text-brand-royal",
  ghost: "text-text-secondary hover:bg-surface-muted",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

export function ActionBar({
  context,
  isSubmitting = false,
  errorMessage,
  successMessage,
  onSubmit,
}: ActionBarProps) {
  const actions = computeAvailableActions(context);
  const hint = computeNextStepHint(context);
  const [pendingAction, setPendingAction] = useState<ActionDescriptor | null>(
    null,
  );
  const [confirmInput, setConfirmInput] = useState({
    comments: "",
    correctionDetails: "",
  });

  const startAction = (descriptor: ActionDescriptor) => {
    if (descriptor.blockedReasons.length > 0) return;
    setPendingAction(descriptor);
    setConfirmInput({ comments: "", correctionDetails: "" });
  };

  const closeModal = () => setPendingAction(null);

  const submit = async () => {
    if (!pendingAction) return;
    const comments = confirmInput.comments.trim();
    const correctionDetails = confirmInput.correctionDetails.trim();

    if (pendingAction.requiresReason && !comments) return;
    if (pendingAction.requiresCorrectionDetails && !correctionDetails) return;

    await onSubmit({
      action: pendingAction.action,
      comments:
        comments ||
        `Moved to ${pendingAction.label.toLowerCase()} from action bar`,
      correctionDetails: pendingAction.requiresCorrectionDetails
        ? correctionDetails
        : undefined,
    });
    setPendingAction(null);
  };

  return (
    <Card className="border border-surface-border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-text-primary">
            Principal Actions
          </h2>
          {hint.headline ? (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-text-secondary">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-royal" />
              <span>
                <span className="font-semibold text-text-primary">
                  {hint.headline}.
                </span>{" "}
                <span className="text-text-secondary">{hint.detail}</span>
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}
      {successMessage ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.length === 0 ? (
          <p className="rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm text-text-secondary">
            No further actions are available from this state.
          </p>
        ) : (
          actions.map((descriptor) => {
            const isBlocked = descriptor.blockedReasons.length > 0;
            return (
              <button
                key={descriptor.action}
                type="button"
                disabled={isBlocked || isSubmitting}
                onClick={() => startAction(descriptor)}
                className={[
                  "inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                  variantClass[descriptor.variant],
                ].join(" ")}
                title={
                  isBlocked
                    ? descriptor.blockedReasons.join(" ")
                    : descriptor.helper
                }
              >
                {descriptor.label}
              </button>
            );
          })
        )}
      </div>
      {/* Aggregate the unique blocked-reason set into a single helper line so
          repeated guards (e.g. "All required documents must be uploaded.")
          don't appear once per disabled button. Hovering the disabled button
          still reveals the same reason via title attribute. */}
      {actions.some((a) => a.blockedReasons.length > 0) ? (
        <div className="mt-3 flex flex-wrap items-start gap-2 rounded-md border border-surface-border bg-surface-muted px-3 py-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
          <p className="text-xs text-text-secondary">
            Some actions are unavailable:{" "}
            {Array.from(
              new Set(
                actions.flatMap((a) =>
                  a.blockedReasons.length > 0 ? a.blockedReasons : [],
                ),
              ),
            ).join(" ")}
          </p>
        </div>
      ) : null}

      {/* Confirm modal */}
      {pendingAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md p-5">
            <h3
              className={`text-base font-bold ${pendingAction.destructive ? "text-rose-700" : "text-text-primary"}`}
            >
              {pendingAction.label}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {pendingAction.helper}
            </p>

            {pendingAction.requiresReason ? (
              <div className="mt-3">
                <Label>
                  Reason / comments{" "}
                  <span className="text-rose-600">(required)</span>
                </Label>
                <Textarea
                  value={confirmInput.comments}
                  onChange={(e) =>
                    setConfirmInput((prev) => ({
                      ...prev,
                      comments: e.target.value,
                    }))
                  }
                  placeholder="Briefly explain this decision so the parent has context."
                  className="min-h-[88px]"
                  autoFocus
                />
              </div>
            ) : null}

            {pendingAction.requiresCorrectionDetails ? (
              <div className="mt-3">
                <Label>
                  Correction details{" "}
                  <span className="text-rose-600">(required)</span>
                </Label>
                <Textarea
                  value={confirmInput.correctionDetails}
                  onChange={(e) =>
                    setConfirmInput((prev) => ({
                      ...prev,
                      correctionDetails: e.target.value,
                    }))
                  }
                  placeholder="What exactly should the parent fix? Be specific."
                  className="min-h-[88px]"
                />
              </div>
            ) : null}

            {pendingAction.destructive ? (
              <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                This action is destructive. Make sure you have the correct
                application open before confirming.
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void submit()}
                disabled={
                  isSubmitting ||
                  (pendingAction.requiresReason &&
                    !confirmInput.comments.trim()) ||
                  (pendingAction.requiresCorrectionDetails &&
                    !confirmInput.correctionDetails.trim())
                }
              >
                {isSubmitting ? "Confirming…" : "Confirm"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}
