// Single source of truth for the parent <-> principal admission workflow.
// Mirrors the canonical state machine on the server (admissionController.ts)
// so the principal UI never offers an action the backend would reject.

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "payment_pending"
  | "payment_completed"
  | "under_review"
  | "approved"
  | "rejected"
  | "on_hold"
  | "needs_correction"
  | "cancelled";

export type PrincipalAction =
  | "under_review"
  | "approved"
  | "rejected"
  | "on_hold"
  | "needs_correction"
  | "cancelled";

export type ActionContext = {
  status: ApplicationStatus;
  paymentCompleted: boolean;
  hasRequiredDocuments: boolean;
};

export type ActionDescriptor = {
  action: PrincipalAction;
  label: string;
  helper: string;
  variant: "primary" | "secondary" | "ghost" | "danger";
  requiresReason: boolean;
  requiresCorrectionDetails: boolean;
  destructive: boolean;
  // When non-empty the action is allowed but not yet *recommended* — show as
  // disabled with the listed reason as a tooltip / inline hint.
  blockedReasons: string[];
};

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, PrincipalAction[]> = {
  draft: ["on_hold", "cancelled"],
  submitted: ["under_review", "on_hold", "cancelled"],
  payment_pending: ["on_hold", "cancelled"],
  payment_completed: [
    "under_review",
    "on_hold",
    "needs_correction",
    "cancelled",
  ],
  under_review: [
    "approved",
    "rejected",
    "on_hold",
    "needs_correction",
    "cancelled",
  ],
  // Approved is recoverable. Principal can put it on hold to revisit, send
  // the form back to the parent for edits, or cancel.
  approved: ["on_hold", "needs_correction", "cancelled"],
  // Rejected can be reopened directly back into review.
  rejected: ["under_review", "on_hold", "cancelled"],
  // From on_hold the principal resumes review first; needs_correction is
  // reachable from under_review, not directly from on_hold (the server state
  // machine rejects on_hold -> needs_correction).
  on_hold: ["under_review", "approved", "rejected", "cancelled"],
  needs_correction: ["under_review", "on_hold", "cancelled"],
  // Cancelled is recoverable — "Revive" pushes the application back to on_hold.
  cancelled: ["on_hold"],
};

const ACTION_BASE: Record<PrincipalAction, Omit<ActionDescriptor, "blockedReasons">> = {
  under_review: {
    action: "under_review",
    label: "Move Under Review",
    helper: "Open this application for review. Notifies the parent.",
    variant: "primary",
    requiresReason: false,
    requiresCorrectionDetails: false,
    destructive: false,
  },
  approved: {
    action: "approved",
    label: "Approve",
    helper: "Confirm admission. Generates the confirmation letter.",
    variant: "primary",
    requiresReason: true,
    requiresCorrectionDetails: false,
    destructive: false,
  },
  rejected: {
    action: "rejected",
    label: "Reject",
    helper: "Reject this admission with a reason.",
    variant: "danger",
    requiresReason: true,
    requiresCorrectionDetails: false,
    destructive: true,
  },
  on_hold: {
    action: "on_hold",
    label: "Put On Hold",
    helper: "Pause review until further information arrives.",
    variant: "secondary",
    requiresReason: true,
    requiresCorrectionDetails: false,
    destructive: false,
  },
  needs_correction: {
    action: "needs_correction",
    label: "Needs Correction",
    helper: "Unlock the form so the parent can fix specific fields.",
    variant: "secondary",
    requiresReason: true,
    requiresCorrectionDetails: true,
    destructive: false,
  },
  cancelled: {
    action: "cancelled",
    label: "Cancel Application",
    helper: "Close this application permanently.",
    variant: "danger",
    requiresReason: true,
    requiresCorrectionDetails: false,
    destructive: true,
  },
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  payment_pending: "Payment Pending",
  payment_completed: "Payment Completed",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  on_hold: "On Hold",
  needs_correction: "Needs Correction",
  cancelled: "Cancelled",
};

const PAYMENT_GATED: PrincipalAction[] = ["under_review", "approved"];
const DOCUMENTS_GATED: PrincipalAction[] = ["under_review", "approved"];

// Per-state overrides for action label + helper. Same canonical action can
// mean different things depending on where you came from — e.g. moving from
// `rejected` to `under_review` is "Reopen for Review" not "Move Under Review".
const STATE_OVERRIDES: Partial<
  Record<
    ApplicationStatus,
    Partial<Record<PrincipalAction, Partial<ActionDescriptor>>>
  >
> = {
  rejected: {
    under_review: {
      label: "Reopen for Review",
      helper: "Bring this rejected application back into review.",
      variant: "primary",
    },
    on_hold: {
      label: "Hold for Reconsideration",
      helper: "Pause without closing — useful while gathering more info.",
    },
  },
  approved: {
    needs_correction: {
      label: "Send Back for Parent Edit",
      helper:
        "Unlock the form so the parent can correct details. The decision will be revisited after they resubmit.",
      requiresCorrectionDetails: true,
      requiresReason: true,
    },
    on_hold: {
      label: "Put On Hold to Revisit",
      helper: "Pause this approval to revisit the decision.",
    },
    cancelled: {
      label: "Cancel Admission",
      helper: "Close this admission permanently.",
    },
  },
  cancelled: {
    on_hold: {
      label: "Revive Application",
      helper:
        "Bring this cancelled application back. It will be set to On Hold for re-evaluation. The original cancellation stays on the audit trail.",
      variant: "primary",
      destructive: false,
      requiresReason: true,
    },
  },
  on_hold: {
    under_review: {
      label: "Resume Review",
      helper: "Continue principal review from where it was paused.",
      variant: "primary",
    },
  },
  needs_correction: {
    under_review: {
      label: "Skip Correction & Review",
      helper:
        "Resume review without waiting for the parent's correction. Useful if the issue is now resolved.",
    },
  },
};

const applyOverride = (
  status: ApplicationStatus,
  action: PrincipalAction,
): Omit<ActionDescriptor, "blockedReasons"> => {
  const base = ACTION_BASE[action];
  const override = STATE_OVERRIDES[status]?.[action];
  return override ? { ...base, ...override } : base;
};

export const computeAvailableActions = (
  context: ActionContext,
): ActionDescriptor[] => {
  const allowed = ALLOWED_TRANSITIONS[context.status] ?? [];
  return allowed.map((action) => {
    const blockedReasons: string[] = [];
    if (PAYMENT_GATED.includes(action) && !context.paymentCompleted) {
      blockedReasons.push("Payment must be completed before this action.");
    }
    if (DOCUMENTS_GATED.includes(action) && !context.hasRequiredDocuments) {
      blockedReasons.push("All required documents must be uploaded.");
    }
    return { ...applyOverride(context.status, action), blockedReasons };
  });
};

// The principal's most-likely next move from the current state. Used by the
// Decision Card to highlight the primary CTA. Returns null when no clear
// primary exists (e.g. terminal-ish states with only side actions).
export const computePrimaryAction = (
  context: ActionContext,
): ActionDescriptor | null => {
  const all = computeAvailableActions(context);
  if (all.length === 0) return null;

  // Preference order — first match wins.
  const preference: PrincipalAction[] =
    context.status === "approved"
      ? [] // approved has no obvious "next" — promote nothing
      : context.status === "cancelled"
        ? ["on_hold"]
        : context.status === "rejected"
          ? ["under_review"]
          : context.status === "needs_correction"
            ? [] // we wait for the parent
            : context.status === "on_hold"
              ? ["under_review"]
              : context.status === "payment_completed" ||
                  context.status === "submitted"
                ? ["under_review"]
                : context.status === "under_review"
                  ? ["approved"]
                  : [];

  for (const a of preference) {
    const candidate = all.find(
      (x) => x.action === a && x.blockedReasons.length === 0,
    );
    if (candidate) return candidate;
  }
  return null;
};

// Tells the principal what the next *expected* forward step is, given the
// current state. Used for inline guidance ("Waiting for parent payment",
// "Ready for review", etc.).
export const computeNextStepHint = (
  context: ActionContext,
): { headline: string; detail: string } => {
  switch (context.status) {
    case "draft":
      return {
        headline: "Awaiting parent submission",
        detail: "The parent hasn't finalized this application yet.",
      };
    case "submitted":
      return {
        headline: "Ready to start review",
        detail: "Move to under review to begin processing.",
      };
    case "payment_pending":
      return {
        headline: "Waiting for parent payment",
        detail:
          "Parent has chosen a payment plan. Application will advance automatically once payment clears.",
      };
    case "payment_completed":
      return {
        headline: "Payment received — review now",
        detail:
          "The parent has paid. Move under review to begin the formal admission decision.",
      };
    case "under_review":
      return {
        headline: "Under principal review",
        detail: "Make a decision: approve, reject, hold, or request correction.",
      };
    case "needs_correction":
      return {
        headline: "Awaiting parent correction",
        detail:
          "The parent has been notified to fix the flagged details. Review will resume automatically when they resubmit.",
      };
    case "on_hold":
      return {
        headline: "On hold",
        detail: "Resume review when ready, or cancel if it cannot continue.",
      };
    case "approved":
      return {
        headline: "Admission approved",
        detail:
          "Confirmation letter is ready. You can also send the form back to the parent for edits, or put on hold to revisit the decision.",
      };
    case "rejected":
      return {
        headline: "Rejected",
        detail:
          "Reopen for review if you want to reconsider, or hold for further information. Cancel to close permanently.",
      };
    case "cancelled":
      return {
        headline: "Cancelled",
        detail:
          "This application is closed. If cancelled in error, use Revive Application to bring it back to On Hold for re-evaluation.",
      };
    default:
      return {
        headline: "",
        detail: "",
      };
  }
};
