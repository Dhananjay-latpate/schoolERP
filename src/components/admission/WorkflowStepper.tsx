"use client";

import { Check } from "lucide-react";
import {
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/admissionWorkflow";

// Visual position of an application in the canonical lifecycle. Cross-cutting
// states (on_hold / needs_correction) are surfaced as a banner above the
// stepper rather than as their own step, so the linear story stays readable.

type LinearStage =
  | "draft"
  | "payment_pending"
  | "payment_completed"
  | "submitted"
  | "under_review"
  | "decision";

const STAGES: { id: LinearStage; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "payment_pending", label: "Payment" },
  { id: "submitted", label: "Submitted" },
  { id: "under_review", label: "Review" },
  { id: "decision", label: "Decision" },
];

const STAGE_ORDER: ApplicationStatus[] = [
  "draft",
  "payment_pending",
  "payment_completed",
  "submitted",
  "under_review",
  "approved",
];

const linearizeStatus = (status: ApplicationStatus): {
  reachedIndex: number;
  decisionTone: "approved" | "rejected" | "neutral";
} => {
  // Map cross-cutting states back onto the linear backbone for stepper purposes.
  switch (status) {
    case "draft":
      return { reachedIndex: 0, decisionTone: "neutral" };
    case "payment_pending":
      return { reachedIndex: 1, decisionTone: "neutral" };
    case "payment_completed":
      return { reachedIndex: 2, decisionTone: "neutral" };
    case "submitted":
      return { reachedIndex: 2, decisionTone: "neutral" };
    case "under_review":
      return { reachedIndex: 3, decisionTone: "neutral" };
    case "needs_correction":
      return { reachedIndex: 3, decisionTone: "neutral" };
    case "on_hold":
      // We don't know which step it was paused at; show as Review for clarity.
      return { reachedIndex: 3, decisionTone: "neutral" };
    case "approved":
      return { reachedIndex: 4, decisionTone: "approved" };
    case "rejected":
      return { reachedIndex: 4, decisionTone: "rejected" };
    case "cancelled":
      return { reachedIndex: 4, decisionTone: "rejected" };
  }
};

// Map LinearStage label position (0..STAGES.length-1) onto the linear
// backbone index (STAGE_ORDER 0..5). Both arrays are kept in sync above.
const stageBoundary = (stageIndex: number): number => {
  // submitted lives at backbone index 2; payment at 1; etc.
  return [0, 1, 2, 3, 4][stageIndex] ?? 0;
};

interface WorkflowStepperProps {
  status: ApplicationStatus;
}

export function WorkflowStepper({ status }: WorkflowStepperProps) {
  const { reachedIndex, decisionTone } = linearizeStatus(status);

  const decisionFinalLabel =
    decisionTone === "approved"
      ? "Approved"
      : decisionTone === "rejected"
        ? status === "cancelled"
          ? "Cancelled"
          : "Rejected"
        : "Decision";

  return (
    <div>
      <ol className="flex items-start">
        {STAGES.map((stage, index) => {
          const boundary = stageBoundary(index);
          const isComplete = boundary < reachedIndex;
          const isCurrent = boundary === reachedIndex;
          const isLast = index === STAGES.length - 1;
          const labelText = isLast ? decisionFinalLabel : stage.label;

          let dotClass = "border-2 border-surface-border bg-surface-card text-text-muted";
          if (isComplete) {
            dotClass = "bg-brand-royal text-white";
          } else if (isCurrent) {
            if (isLast && decisionTone === "approved") {
              dotClass = "bg-emerald-500 text-white shadow-md shadow-emerald-200";
            } else if (isLast && decisionTone === "rejected") {
              dotClass = "bg-rose-500 text-white shadow-md shadow-rose-200";
            } else {
              dotClass = "bg-brand-royal text-white shadow-md shadow-blue-200";
            }
          }

          let labelClass = "text-text-muted";
          if (isComplete) labelClass = "text-text-secondary";
          if (isCurrent) {
            if (isLast && decisionTone === "approved")
              labelClass = "font-semibold text-emerald-700";
            else if (isLast && decisionTone === "rejected")
              labelClass = "font-semibold text-rose-700";
            else labelClass = "font-semibold text-brand-royal";
          }

          return (
            <li
              key={stage.id}
              className={[
                "flex items-start",
                isLast ? "" : "flex-1",
              ].join(" ")}
            >
              <div className="flex flex-col items-center">
                <div
                  aria-current={isCurrent ? "step" : undefined}
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200",
                    dotClass,
                  ].join(" ")}
                >
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={[
                    "mt-1.5 max-w-[80px] text-center text-[10.5px] font-medium leading-tight",
                    labelClass,
                  ].join(" ")}
                >
                  {labelText}
                </span>
              </div>
              {!isLast ? (
                <div className="mt-3.5 flex-1 px-1">
                  <div
                    className={[
                      "h-0.5 w-full",
                      isComplete ? "bg-brand-royal" : "bg-surface-divider",
                    ].join(" ")}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Cross-cutting state callouts — surfaced above the stepper as banners */}
      {status === "on_hold" ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Currently on hold
        </p>
      ) : null}
      {status === "needs_correction" ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          Awaiting parent correction
        </p>
      ) : null}
      {status === "cancelled" ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Cancelled — can be revived
        </p>
      ) : null}
    </div>
  );
}

export const linearizeForDisplay = (status: ApplicationStatus): string =>
  STATUS_LABELS[status] ?? status;
