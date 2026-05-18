import type { PrincipalApplication, EditableCustomInstallment, PrincipalDashboardStats } from "@/lib/principalApi";

export const PAGE_SIZE = 10;
export const TOAST_TTL_MS = 3500;

export const UI = {
  heroPad: "p-5 sm:p-6",
  heading: "text-2xl sm:text-3xl font-bold",
  sectionTitle: "text-lg sm:text-xl font-semibold",
  cardPad: "p-4 sm:p-5",
  primaryActionBtn: "h-9 px-4 text-sm",
  queueActionBtn: "h-8 px-3 text-xs",
} as const;

export const DEFAULT_STATS: PrincipalDashboardStats = {
  totalApplications: 0,
  pendingReview: 0,
  underReview: 0,
  onHold: 0,
  approved: 0,
  rejected: 0,
  pendingCustomPaymentPlans: 0,
  totalFeeCollected: 0,
  totalFeePending: 0,
};

export type PipelineStage =
  | "payment_completed"
  | "under_review"
  | "on_hold"
  | "needs_correction"
  | "approved"
  | "rejected";

export const STAGE_MATCHES: Record<PipelineStage, string[]> = {
  payment_completed: ["payment_completed", "submitted"],
  under_review: ["under_review"],
  on_hold: ["on_hold"],
  needs_correction: ["needs_correction"],
  approved: ["approved"],
  rejected: ["rejected"],
};

export const PIPELINE_STAGES: Array<{
  id: PipelineStage;
  label: string;
  color: string;
  ringColor: string;
  textColor: string;
  bgColor: string;
}> = [
  { id: "payment_completed", label: "Awaiting Review", color: "bg-blue-500", ringColor: "ring-blue-200", textColor: "text-blue-700", bgColor: "bg-blue-50" },
  { id: "under_review", label: "Under Review", color: "bg-violet-500", ringColor: "ring-violet-200", textColor: "text-violet-700", bgColor: "bg-violet-50" },
  { id: "on_hold", label: "On Hold", color: "bg-amber-500", ringColor: "ring-amber-200", textColor: "text-amber-700", bgColor: "bg-amber-50" },
  { id: "needs_correction", label: "Needs Correction", color: "bg-orange-500", ringColor: "ring-orange-200", textColor: "text-orange-700", bgColor: "bg-orange-50" },
  { id: "approved", label: "Approved", color: "bg-emerald-500", ringColor: "ring-emerald-200", textColor: "text-emerald-700", bgColor: "bg-emerald-50" },
  { id: "rejected", label: "Rejected", color: "bg-rose-500", ringColor: "ring-rose-200", textColor: "text-rose-700", bgColor: "bg-rose-50" },
];

export const STAGE_TRANSITIONS: Record<
  PipelineStage,
  Array<{ status: string; label: string; direction: "forward" | "back" | "terminal" }>
> = {
  payment_completed: [{ status: "under_review", label: "Start Review", direction: "forward" }],
  under_review: [
    { status: "approved", label: "Approve", direction: "forward" },
    { status: "on_hold", label: "Put on Hold", direction: "back" },
    { status: "needs_correction", label: "Request Correction", direction: "back" },
    { status: "rejected", label: "Reject", direction: "terminal" },
  ],
  on_hold: [
    { status: "under_review", label: "Resume Review", direction: "forward" },
    { status: "needs_correction", label: "Request Correction", direction: "back" },
    { status: "rejected", label: "Reject", direction: "terminal" },
  ],
  needs_correction: [
    { status: "under_review", label: "Resume Review", direction: "forward" },
    { status: "on_hold", label: "Put on Hold", direction: "back" },
    { status: "rejected", label: "Reject", direction: "terminal" },
  ],
  approved: [],
  rejected: [{ status: "under_review", label: "Re-open", direction: "back" }],
};

export type ToastItem = { id: number; type: "success" | "error"; message: string };
export type SectionId = "pipeline" | "custom_plans" | "setup" | "audit";
export type BulkActionType = "under_review" | "on_hold" | "needs_correction";
export type BulkActionResult = { ok: number; failed: number };

export type AuditLogEntry = {
  id: number;
  timestamp: string;
  action: BulkActionType;
  reason: string;
  affectedApplicationIds: string[];
  successCount: number;
  failureCount: number;
};

export type CustomPlanDraftMap = Record<string, EditableCustomInstallment[]>;

export type TransitionModalData = {
  app: PrincipalApplication;
  toStatus: string;
  label: string;
  needsCorrection: boolean;
};
