"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  RotateCcw,
} from "lucide-react";
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
  computePrimaryAction,
} from "@/lib/admissionWorkflow";

export type DecisionSubmitPayload = {
  action: PrincipalAction;
  comments: string;
  correctionDetails?: string;
};

interface DecisionCardProps {
  context: ActionContext;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  onSubmit: (payload: DecisionSubmitPayload) => void | Promise<void>;
  // Slot for a "Letter" action card (rendered inside this card when the
  // application is approved, so the principal sees the letter alongside
  // the decision controls).
  approvedSlot?: React.ReactNode;
}

const variantClass: Record<ActionDescriptor["variant"], string> = {
  primary: "bg-brand-royal text-white hover:bg-brand-royal/90",
  secondary:
    "border border-surface-border bg-surface-card text-text-secondary hover:border-brand-royal hover:text-brand-royal",
  ghost: "text-text-secondary hover:bg-surface-muted",
  danger:
    "border border-rose-200 bg-surface-card text-rose-700 hover:bg-rose-50 hover:border-rose-300",
};

const primaryVariantClass = "btn-pay";

export function DecisionCard({
  context,
  isSubmitting = false,
  errorMessage,
  successMessage,
  onSubmit,
  approvedSlot,
}: DecisionCardProps) {
  const all = computeAvailableActions(context);
  const primary = computePrimaryAction(context);
  const secondary = all.filter((a) => a.action !== primary?.action);
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
        `Moved to ${pendingAction.label.toLowerCase()} from decision card`,
      correctionDetails: pendingAction.requiresCorrectionDetails
        ? correctionDetails
        : undefined,
    });
    setPendingAction(null);
  };

  const blockedReasonSet = Array.from(
    new Set(
      all.flatMap((a) => (a.blockedReasons.length > 0 ? a.blockedReasons : [])),
    ),
  );

  const renderActionButton = (
    descriptor: ActionDescriptor,
    primaryFlag: boolean,
  ) => {
    const isBlocked = descriptor.blockedReasons.length > 0;
    const className = primaryFlag
      ? primaryVariantClass
      : variantClass[descriptor.variant];
    return (
      <button
        key={descriptor.action + (primaryFlag ? "-pri" : "")}
        type="button"
        disabled={isBlocked || isSubmitting}
        onClick={() => startAction(descriptor)}
        className={[
          primaryFlag
            ? "inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
          className,
        ].join(" ")}
        title={isBlocked ? descriptor.blockedReasons.join(" ") : descriptor.helper}
      >
        {primaryFlag && descriptor.action === "on_hold" ? (
          <RotateCcw className="h-4 w-4" />
        ) : null}
        {descriptor.label}
      </button>
    );
  };

  return (
    <Card className="border border-surface-border p-5 sm:p-6">
      {/* Hint banner */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-royal/10 text-brand-royal">
          <Info className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-text-primary">
            {hint.headline}
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
            {hint.detail}
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}
      {successMessage ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      ) : null}

      {/* Approved slot — letter download / confirmation, rendered inline */}
      {approvedSlot ? <div className="mt-5">{approvedSlot}</div> : null}

      {all.length === 0 ? (
        <p className="mt-5 rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm text-text-secondary">
          No further actions are available from this state.
        </p>
      ) : (
        <>
          {/* Primary CTA */}
          {primary ? (
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Recommended next step
              </p>
              <div>{renderActionButton(primary, true)}</div>
              <p className="mt-1.5 text-xs text-text-muted">{primary.helper}</p>
            </div>
          ) : null}

          {/* Secondary actions */}
          {secondary.length > 0 ? (
            <div className="mt-5 border-t border-surface-divider pt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Other actions
              </p>
              <div className="flex flex-wrap gap-2">
                {secondary.map((d) => renderActionButton(d, false))}
              </div>
            </div>
          ) : null}

          {/* Consolidated blocked reasons */}
          {blockedReasonSet.length > 0 ? (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Some actions are gated:</span>{" "}
                {blockedReasonSet.join(" ")}
              </p>
            </div>
          ) : null}
        </>
      )}

      {/* Confirm modal */}
      {pendingAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-5 shadow-2xl">
            <h3
              className={`text-base font-bold ${pendingAction.destructive ? "text-rose-700" : "text-text-primary"}`}
            >
              {pendingAction.label}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">
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

            <div className="mt-5 flex justify-end gap-2">
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
