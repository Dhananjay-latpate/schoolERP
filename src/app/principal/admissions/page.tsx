"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Files,
  Keyboard,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Settings2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  closeAdmissionSession,
  commenceAdmissionSession,
  createAdmissionSession,
  PrincipalApiError,
  createFeeStructure,
  createPrincipalClass,
  getAdmissionSessionReadiness,
  getPrincipalDashboardStats,
  initializeAdmissionSession,
  listAdmissionSessions,
  listFeeStructures,
  listClasses,
  listPendingCustomPaymentPlans,
  listPrincipalApplications,
  reviewCustomPaymentPlan,
  reviewPrincipalApplication,
  type FeeComponentInput,
  updatePendingCustomPaymentPlan,
  type EditableCustomInstallment,
  type PrincipalApplication,
  type PrincipalAdmissionSession,
  type PrincipalClass,
  type PrincipalDashboardStats,
  type PrincipalFeeStructure,
  type PendingCustomPaymentPlan,
  type AdmissionSessionReadiness,
} from "@/lib/principalApi";
import {
  clearPrincipalSession,
  getPrincipalToken,
} from "@/lib/principalSession";
import { MASTER_GRADES, SECTION_LETTERS } from "@/lib/grades";

const PAGE_SIZE = 10;
const TOAST_TTL_MS = 3500;
const UI = {
  heroPad: "p-5 sm:p-6",
  heading: "text-2xl sm:text-3xl font-bold",
  sectionTitle: "text-lg sm:text-xl font-semibold",
  cardPad: "p-4 sm:p-5",
  primaryActionBtn: "h-9 px-4 text-sm",
  queueActionBtn: "h-8 px-3 text-xs",
};

const DEFAULT_STATS: PrincipalDashboardStats = {
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

// Pipeline stage definitions — order reflects admission lifecycle
type PipelineStage =
  | "payment_completed"
  | "under_review"
  | "on_hold"
  | "needs_correction"
  | "approved"
  | "rejected";

// Each pipeline bucket can match more than one canonical status. The
// "Awaiting Review" bucket includes both `payment_completed` (briefly) and
// `submitted` (the steady-state) so the principal sees every application
// that is ready for them to act on, in one place.
const STAGE_MATCHES: Record<PipelineStage, string[]> = {
  payment_completed: ["payment_completed", "submitted"],
  under_review: ["under_review"],
  on_hold: ["on_hold"],
  needs_correction: ["needs_correction"],
  approved: ["approved"],
  rejected: ["rejected"],
};

const PIPELINE_STAGES: {
  id: PipelineStage;
  label: string;
  color: string;
  ringColor: string;
  textColor: string;
  bgColor: string;
}[] = [
  {
    id: "payment_completed",
    label: "Awaiting Review",
    color: "bg-blue-500",
    ringColor: "ring-blue-200",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  {
    id: "under_review",
    label: "Under Review",
    color: "bg-violet-500",
    ringColor: "ring-violet-200",
    textColor: "text-violet-700",
    bgColor: "bg-violet-50",
  },
  {
    id: "on_hold",
    label: "On Hold",
    color: "bg-amber-500",
    ringColor: "ring-amber-200",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
  },
  {
    id: "needs_correction",
    label: "Needs Correction",
    color: "bg-orange-500",
    ringColor: "ring-orange-200",
    textColor: "text-orange-700",
    bgColor: "bg-orange-50",
  },
  {
    id: "approved",
    label: "Approved",
    color: "bg-emerald-500",
    ringColor: "ring-emerald-200",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
  },
  {
    id: "rejected",
    label: "Rejected",
    color: "bg-rose-500",
    ringColor: "ring-rose-200",
    textColor: "text-rose-700",
    bgColor: "bg-rose-50",
  },
];

// Allowed transitions for each stage
const STAGE_TRANSITIONS: Record<
  PipelineStage,
  {
    status: string;
    label: string;
    direction: "forward" | "back" | "terminal";
  }[]
> = {
  payment_completed: [
    { status: "under_review", label: "Start Review", direction: "forward" },
  ],
  under_review: [
    { status: "approved", label: "Approve", direction: "forward" },
    { status: "on_hold", label: "Put on Hold", direction: "back" },
    {
      status: "needs_correction",
      label: "Request Correction",
      direction: "back",
    },
    { status: "rejected", label: "Reject", direction: "terminal" },
  ],
  on_hold: [
    { status: "under_review", label: "Resume Review", direction: "forward" },
    {
      status: "needs_correction",
      label: "Request Correction",
      direction: "back",
    },
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

function paymentBadgeVariant(
  paymentStatus: string | undefined,
): "default" | "success" | "warning" | "error" {
  if (paymentStatus === "completed") return "success";
  if (paymentStatus === "failed") return "error";
  if (paymentStatus === "pending") return "warning";
  return "default";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonthsToDate(baseDate: string, monthsToAdd: number): string {
  const date = new Date(baseDate);
  if (Number.isNaN(date.getTime())) return "";
  date.setMonth(date.getMonth() + monthsToAdd);
  return formatDateInput(date);
}

function normalizeDateForInput(value: string): string {
  if (!value) return "";
  const datePart = value.split("T")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : "";
}

function isReviewableStatus(status: string): boolean {
  return [
    "payment_completed",
    "under_review",
    "on_hold",
    "needs_correction",
  ].includes(status);
}

function csvEscape(value: string | number | null | undefined): string {
  const stringified =
    value === null || value === undefined ? "" : String(value);
  const escaped = stringified.replace(/"/g, '""');
  return `"${escaped}"`;
}

type ToastItem = {
  id: number;
  type: "success" | "error";
  message: string;
};

type BulkActionType = "under_review" | "on_hold" | "needs_correction";
type BulkActionResult = { ok: number; failed: number };
type AuditLogEntry = {
  id: number;
  timestamp: string;
  action: BulkActionType;
  reason: string;
  affectedApplicationIds: string[];
  successCount: number;
  failureCount: number;
};
type CustomPlanDraftMap = Record<string, EditableCustomInstallment[]>;
type SettingsInstallmentDraft = {
  name: string;
  // Days from enrollment when this installment is due. 0 = on enrollment day.
  // Calendar dates are not configured here — the system computes them per
  // student so the schedule is always relative to the actual enrollment date.
  dueOffsetDays: number;
  percentage: number;
};

// Modal for performing a single stage transition
type TransitionModal = {
  app: PrincipalApplication;
  toStatus: string;
  label: string;
  needsCorrection: boolean;
} | null;

export default function PrincipalAdmissionsDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  const [activeSection, setActiveSection] = useState<
    "pipeline" | "custom_plans" | "settings" | "audit"
  >("pipeline");
  const [activePipelineStage, setActivePipelineStage] =
    useState<PipelineStage>("payment_completed");

  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [stats, setStats] = useState<PrincipalDashboardStats>(DEFAULT_STATS);
  const [applications, setApplications] = useState<PrincipalApplication[]>([]);
  const [classes, setClasses] = useState<PrincipalClass[]>([]);
  const [allClasses, setAllClasses] = useState<PrincipalClass[]>([]);
  const [pendingCustomPlans, setPendingCustomPlans] = useState<
    PendingCustomPaymentPlan[]
  >([]);

  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingCustomPlans, setIsLoadingCustomPlans] = useState(false);
  const [actionLoadingFor, setActionLoadingFor] = useState<string | null>(null);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [customPlanActionLoadingFor, setCustomPlanActionLoadingFor] = useState<
    string | null
  >(null);
  const [customPlanSaveLoadingFor, setCustomPlanSaveLoadingFor] = useState<
    string | null
  >(null);
  const [customPlanComments, setCustomPlanComments] = useState<
    Record<string, string>
  >({});
  const [customPlanDrafts, setCustomPlanDrafts] = useState<CustomPlanDraftMap>(
    {},
  );
  const [editingCustomPlanId, setEditingCustomPlanId] = useState<string | null>(
    null,
  );
  const [customPlansError, setCustomPlansError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] =
    useState<BulkActionType>("under_review");
  const [bulkComments, setBulkComments] = useState("");
  const [bulkCorrectionDetails, setBulkCorrectionDetails] = useState("");
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [auditReason, setAuditReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [feeStructures, setFeeStructures] = useState<PrincipalFeeStructure[]>(
    [],
  );
  const [isLoadingFeeStructures, setIsLoadingFeeStructures] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isCreatingFeeStructure, setIsCreatingFeeStructure] = useState(false);
  const [classForm, setClassForm] = useState({
    name: "",
    section: "",
    academicYear: new Date().getFullYear().toString(),
    capacity: "",
  });
  const [feeClassId, setFeeClassId] = useState("");
  const [feeAcademicYear, setFeeAcademicYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [installmentIntervalDays, setInstallmentIntervalDays] = useState(30);
  const [feeComponentsDraft, setFeeComponentsDraft] = useState<
    FeeComponentInput[]
  >([
    { name: "Tuition Fee", amount: 0, description: "", isMandatory: true },
    { name: "Lab Fee", amount: 0, description: "", isMandatory: false },
  ]);
  const [installmentsDraft, setInstallmentsDraft] = useState<
    SettingsInstallmentDraft[]
  >([
    { name: "Installment 1", dueOffsetDays: 0, percentage: 40 },
    { name: "Installment 2", dueOffsetDays: 30, percentage: 30 },
    { name: "Installment 3", dueOffsetDays: 60, percentage: 30 },
  ]);

  // Transition modal state
  const [transitionModal, setTransitionModal] = useState<TransitionModal>(null);
  const [transitionComments, setTransitionComments] = useState("");
  const [transitionCorrectionDetails, setTransitionCorrectionDetails] =
    useState("");

  const installmentPercentageTotal = useMemo(
    () =>
      installmentsDraft.reduce(
        (sum, item) => sum + Number(item.percentage || 0),
        0,
      ),
    [installmentsDraft],
  );

  const addToast = useCallback((type: ToastItem["type"], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  const loadDashboard = useCallback(
    async (authToken: string) => {
      setError(null);
      setIsLoadingStats(true);
      setIsLoadingApps(true);
      setIsLoadingClasses(true);
      try {
        const [statsResult, appResult, classResult] = await Promise.all([
          getPrincipalDashboardStats(authToken),
          listPrincipalApplications(authToken, {
            status: "all",
            page: 1,
            limit: 200,
          }),
          listClasses(authToken),
        ]);
        setStats(statsResult);
        setApplications(appResult.data);
        setClasses(classResult);
      } catch (err) {
        if (
          err instanceof PrincipalApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          clearPrincipalSession();
          router.replace("/principal/login?next=%2Fprincipal%2Fadmissions");
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard",
        );
      } finally {
        setIsLoadingStats(false);
        setIsLoadingApps(false);
        setIsLoadingClasses(false);
      }
    },
    [router],
  );

  const loadCustomPlans = useCallback(
    async (authToken: string) => {
      setIsLoadingCustomPlans(true);
      setCustomPlansError(null);
      try {
        const customPlans = await listPendingCustomPaymentPlans(authToken);
        setPendingCustomPlans(customPlans);
        setCustomPlanDrafts((prev) => {
          const allowed = new Set(customPlans.map((plan) => plan.id));
          const next: CustomPlanDraftMap = {};
          Object.entries(prev).forEach(([planId, draft]) => {
            if (allowed.has(planId)) next[planId] = draft;
          });
          return next;
        });
        setEditingCustomPlanId((current) =>
          current && customPlans.some((plan) => plan.id === current)
            ? current
            : null,
        );
      } catch (err) {
        if (
          err instanceof PrincipalApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          clearPrincipalSession();
          router.replace("/principal/login?next=%2Fprincipal%2Fadmissions");
          return;
        }
        setCustomPlansError(
          err instanceof Error
            ? err.message
            : "Failed to load custom payment requests.",
        );
      } finally {
        setIsLoadingCustomPlans(false);
      }
    },
    [router],
  );

  const loadFeeStructures = useCallback(
    async (authToken: string) => {
      setIsLoadingFeeStructures(true);
      setSettingsError(null);
      try {
        const rows = await listFeeStructures(authToken);
        setFeeStructures(rows);
      } catch (err) {
        if (
          err instanceof PrincipalApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          clearPrincipalSession();
          router.replace("/principal/login?next=%2Fprincipal%2Fadmissions");
          return;
        }
        setSettingsError(
          err instanceof Error
            ? err.message
            : "Failed to load admission settings.",
        );
      } finally {
        setIsLoadingFeeStructures(false);
      }
    },
    [router],
  );

  const loadAllClasses = useCallback(
    async (authToken: string) => {
      try {
        const rows = await listClasses(authToken, undefined, true);
        setAllClasses(rows);
      } catch (err) {
        if (
          err instanceof PrincipalApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          clearPrincipalSession();
          router.replace("/principal/login?next=%2Fprincipal%2Fadmissions");
        }
      }
    },
    [router],
  );

  useEffect(() => {
    const existingToken = getPrincipalToken();
    if (!existingToken) {
      router.replace("/principal/login?next=%2Fprincipal%2Fadmissions");
      return;
    }
    setToken(existingToken);
    void loadDashboard(existingToken);
    void loadCustomPlans(existingToken);
    void loadFeeStructures(existingToken);
    void loadAllClasses(existingToken);
  }, [loadDashboard, loadCustomPlans, loadFeeStructures, loadAllClasses, router]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [activePipelineStage, yearFilter, classFilter, searchTerm]);

  useEffect(() => {
    if (!feeClassId && allClasses.length > 0) {
      setFeeClassId(allClasses[0].id);
      setFeeAcademicYear(allClasses[0].academicYear);
    }
  }, [allClasses, feeClassId]);


  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    for (const app of applications) years.add(app.admissionYear);
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [applications]);

  // Applications in the currently active pipeline stage
  const stageApplications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const acceptedStatuses = new Set(STAGE_MATCHES[activePipelineStage] ?? []);
    return applications.filter((app) => {
      if (!acceptedStatuses.has(app.status)) return false;
      if (yearFilter !== "all" && app.admissionYear !== yearFilter)
        return false;
      if (classFilter !== "all" && app.class?.id !== classFilter) return false;
      if (!normalizedSearch) return true;
      const studentName =
        `${app.studentFirstName} ${app.studentLastName}`.toLowerCase();
      return (
        app.applicationId.toLowerCase().includes(normalizedSearch) ||
        studentName.includes(normalizedSearch) ||
        app.emergencyContact.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [applications, activePipelineStage, yearFilter, classFilter, searchTerm]);

  // Counts per pipeline stage for the header — each bucket aggregates the
  // canonical statuses listed in STAGE_MATCHES so "Awaiting Review" surfaces
  // both payment_completed and submitted applications, etc.
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of PIPELINE_STAGES) {
      counts[stage.id] = applications.filter((app) =>
        STAGE_MATCHES[stage.id].includes(app.status),
      ).length;
    }
    return counts;
  }, [applications]);

  const totalPages = Math.max(
    1,
    Math.ceil(stageApplications.length / PAGE_SIZE),
  );
  const paginatedApplications = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return stageApplications.slice(start, start + PAGE_SIZE);
  }, [stageApplications, page, totalPages]);

  const selectedApplications = useMemo(
    () => paginatedApplications.filter((app) => selectedIds.includes(app.id)),
    [paginatedApplications, selectedIds],
  );

  const actionableSelections = useMemo(
    () => selectedApplications.filter((app) => isReviewableStatus(app.status)),
    [selectedApplications],
  );

  const isPageFullySelected =
    paginatedApplications.length > 0 &&
    paginatedApplications.every((app) => selectedIds.includes(app.id));

  const togglePageSelection = () => {
    if (isPageFullySelected) {
      setSelectedIds((prev) =>
        prev.filter(
          (id) => !paginatedApplications.some((app) => app.id === id),
        ),
      );
      return;
    }
    setSelectedIds((prev) => {
      const merged = new Set(prev);
      paginatedApplications.forEach((app) => {
        if (isReviewableStatus(app.status)) merged.add(app.id);
      });
      return Array.from(merged);
    });
  };

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleRefresh = async () => {
    if (!token) return;
    await Promise.all([
      loadDashboard(token),
      loadCustomPlans(token),
      loadFeeStructures(token),
    ]);
  };

  const handleSignOut = () => {
    clearPrincipalSession();
    router.replace("/principal/login");
  };

  // Open the transition modal for a single application
  const openTransitionModal = (
    app: PrincipalApplication,
    toStatus: string,
    label: string,
  ) => {
    const needsCorrection = toStatus === "needs_correction";
    // For "needs_correction" we actually send status="under_review" + needsCorrection=true
    setTransitionModal({ app, toStatus, label, needsCorrection });
    setTransitionComments("");
    setTransitionCorrectionDetails("");
  };

  const closeTransitionModal = () => {
    setTransitionModal(null);
    setTransitionComments("");
    setTransitionCorrectionDetails("");
  };

  const handleConfirmTransition = async () => {
    if (!token || !transitionModal) return;
    const { app, toStatus, needsCorrection } = transitionModal;

    // Validation
    const requiresComment = toStatus !== "under_review" || needsCorrection;
    if (requiresComment && !transitionComments.trim()) {
      addToast("error", "Comments are required for this transition.");
      return;
    }
    if (needsCorrection && !transitionCorrectionDetails.trim()) {
      addToast("error", "Please describe what needs to be corrected.");
      return;
    }

    setActionLoadingFor(app.id);
    const previousStatus = app.status;
    const previousCorrection = app.correctionNeeded;

    // Optimistic update
    setApplications((prev) =>
      prev.map((row) =>
        row.id === app.id
          ? {
              ...row,
              status: needsCorrection ? "needs_correction" : toStatus,
              correctionNeeded: needsCorrection,
            }
          : row,
      ),
    );

    closeTransitionModal();

    try {
      await reviewPrincipalApplication(token, {
        applicationId: app.applicationId,
        status: needsCorrection
          ? "under_review"
          : (toStatus as "under_review" | "approved" | "rejected" | "on_hold"),
        comments:
          transitionComments.trim() ||
          `Moved to ${toStatus} from principal pipeline.`,
        needsCorrection: needsCorrection || undefined,
        correctionDetails: needsCorrection
          ? transitionCorrectionDetails.trim()
          : undefined,
      });
      addToast(
        "success",
        `${app.applicationId} moved to ${needsCorrection ? "needs correction" : toStatus.replace("_", " ")}.`,
      );
      void loadDashboard(token);
    } catch (err) {
      // Rollback
      setApplications((prev) =>
        prev.map((row) =>
          row.id === app.id
            ? {
                ...row,
                status: previousStatus,
                correctionNeeded: previousCorrection,
              }
            : row,
        ),
      );
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to update application.",
      );
    } finally {
      setActionLoadingFor(null);
    }
  };

  // Legacy: bulk move to under_review (keep for keyboard shortcut)
  const handleMoveToReview = async (app: PrincipalApplication) => {
    if (!token) return;
    setActionLoadingFor(app.id);
    const previousStatus = app.status;
    const previousCorrection = app.correctionNeeded;
    setApplications((prev) =>
      prev.map((row) =>
        row.id === app.id
          ? { ...row, status: "under_review", correctionNeeded: false }
          : row,
      ),
    );

    try {
      await reviewPrincipalApplication(token, {
        applicationId: app.applicationId,
        status: "under_review",
        comments: "Moved to under review from principal dashboard pipeline.",
      });
      addToast("success", `${app.applicationId} moved to under review.`);
      void loadDashboard(token);
    } catch (err) {
      setApplications((prev) =>
        prev.map((row) =>
          row.id === app.id
            ? {
                ...row,
                status: previousStatus,
                correctionNeeded: previousCorrection,
              }
            : row,
        ),
      );
      addToast(
        "error",
        err instanceof Error
          ? err.message
          : "Failed to move application to under review",
      );
    } finally {
      setActionLoadingFor(null);
    }
  };

  const handleReviewCustomPlan = async (planId: string, approved: boolean) => {
    if (!token) return;

    if (editingCustomPlanId === planId) {
      addToast(
        "error",
        "Save terms before approving or rejecting this custom plan.",
      );
      return;
    }

    const comments = customPlanComments[planId]?.trim();
    if (!comments) {
      addToast(
        "error",
        "Comments are required before approving or rejecting a custom plan.",
      );
      return;
    }

    setCustomPlanActionLoadingFor(planId);
    try {
      await reviewCustomPaymentPlan(token, { planId, approved, comments });
      setPendingCustomPlans((prev) =>
        prev.filter((plan) => plan.id !== planId),
      );
      setCustomPlanComments((prev) => {
        const next = { ...prev };
        delete next[planId];
        return next;
      });
      setCustomPlanDrafts((prev) => {
        const next = { ...prev };
        delete next[planId];
        return next;
      });
      setEditingCustomPlanId((current) =>
        current === planId ? null : current,
      );
      addToast(
        "success",
        `Custom installment request ${approved ? "approved" : "rejected"} successfully.`,
      );
      void Promise.all([loadDashboard(token), loadCustomPlans(token)]);
    } catch (err) {
      addToast(
        "error",
        err instanceof Error
          ? err.message
          : "Failed to review custom installment request.",
      );
    } finally {
      setCustomPlanActionLoadingFor(null);
    }
  };

  const beginEditCustomPlan = (plan: PendingCustomPaymentPlan) => {
    setEditingCustomPlanId(plan.id);
    setCustomPlanDrafts((prev) => {
      if (prev[plan.id]) return prev;
      return {
        ...prev,
        [plan.id]: plan.installments.map((installment) => ({
          id: installment.id,
          name: installment.name,
          dueDate: installment.dueDate,
          amount: installment.amount,
        })),
      };
    });
  };

  const cancelEditCustomPlan = (planId: string) => {
    setEditingCustomPlanId((current) => (current === planId ? null : current));
    setCustomPlanDrafts((prev) => {
      const next = { ...prev };
      delete next[planId];
      return next;
    });
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
    if (!token) return;
    const draft = customPlanDrafts[planId];
    if (!draft || draft.length === 0) {
      addToast("error", "No editable installments found.");
      return;
    }

    for (const [index, installment] of draft.entries()) {
      if (!installment.name.trim()) {
        addToast("error", `Installment ${index + 1} name is required.`);
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(installment.dueDate)) {
        addToast(
          "error",
          `Installment ${index + 1} due date must be in YYYY-MM-DD format.`,
        );
        return;
      }
      if (!Number.isFinite(installment.amount) || installment.amount <= 0) {
        addToast(
          "error",
          `Installment ${index + 1} amount must be greater than 0.`,
        );
        return;
      }
    }

    setCustomPlanSaveLoadingFor(planId);
    try {
      const updated = await updatePendingCustomPaymentPlan(token, {
        planId,
        installments: draft,
        comments: customPlanComments[planId]?.trim() || undefined,
      });
      setPendingCustomPlans((prev) =>
        prev.map((plan) => (plan.id === planId ? updated : plan)),
      );
      setEditingCustomPlanId((current) =>
        current === planId ? null : current,
      );
      setCustomPlanDrafts((prev) => {
        const next = { ...prev };
        delete next[planId];
        return next;
      });
      addToast(
        "success",
        "Custom plan updated. You can now approve/reject final terms.",
      );
    } catch (err) {
      addToast(
        "error",
        err instanceof Error
          ? err.message
          : "Failed to update custom payment plan.",
      );
    } finally {
      setCustomPlanSaveLoadingFor(null);
    }
  };

  const getBulkValidationError = (): string | null => {
    const trimmedComments = bulkComments.trim();
    const trimmedCorrectionDetails = bulkCorrectionDetails.trim();
    if (bulkActionType !== "under_review" && !trimmedComments) {
      return "Comments are required for on-hold or correction requests.";
    }
    if (bulkActionType === "needs_correction" && !trimmedCorrectionDetails) {
      return "Correction details are required for needs-correction action.";
    }
    return null;
  };

  const performBulkDecision = async (options?: {
    reasonOverride?: string;
  }): Promise<BulkActionResult> => {
    if (!token || actionableSelections.length === 0)
      return { ok: 0, failed: 0 };
    const validationError = getBulkValidationError();
    if (validationError) {
      addToast("error", validationError);
      return { ok: 0, failed: 0 };
    }

    const trimmedComments = bulkComments.trim();
    const trimmedCorrectionDetails = bulkCorrectionDetails.trim();
    const reasonOverride = options?.reasonOverride?.trim();
    setIsBulkActionLoading(true);

    const results = await Promise.allSettled(
      actionableSelections.map((app) =>
        reviewPrincipalApplication(token, {
          applicationId: app.applicationId,
          status:
            bulkActionType === "needs_correction"
              ? "under_review"
              : bulkActionType,
          comments:
            reasonOverride ||
            trimmedComments ||
            (bulkActionType === "under_review"
              ? "Bulk moved to under review from principal pipeline."
              : "Bulk principal decision applied from pipeline."),
          needsCorrection: bulkActionType === "needs_correction",
          correctionDetails:
            bulkActionType === "needs_correction"
              ? trimmedCorrectionDetails
              : undefined,
        }),
      ),
    );

    const successCount = results.filter(
      (result) => result.status === "fulfilled",
    ).length;
    const failureCount = results.length - successCount;

    if (successCount > 0) {
      addToast(
        "success",
        `${successCount} application(s) updated successfully.`,
      );
    }
    if (failureCount > 0) {
      addToast(
        "error",
        `${failureCount} application(s) could not be updated. Please retry individually.`,
      );
    }

    setSelectedIds([]);
    setBulkComments("");
    setBulkCorrectionDetails("");
    await loadDashboard(token);
    setIsBulkActionLoading(false);
    return { ok: successCount, failed: failureCount };
  };

  const handleBulkApplyDecision = async () => {
    if (!token || actionableSelections.length === 0) return;
    const validationError = getBulkValidationError();
    if (validationError) {
      addToast("error", validationError);
      return;
    }
    if (bulkActionType === "on_hold" || bulkActionType === "needs_correction") {
      setConfirmBulkOpen(true);
      return;
    }
    await performBulkDecision();
  };

  const handleAuditConfirm = async () => {
    const reason = auditReason.trim();
    if (!reason) {
      addToast(
        "error",
        "Audit reason is required before confirming bulk decision.",
      );
      return;
    }
    const applicationIds = actionableSelections.map(
      (item) => item.applicationId,
    );
    const result = await performBulkDecision({ reasonOverride: reason });
    if (result) {
      const entry: AuditLogEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action: bulkActionType,
        reason,
        affectedApplicationIds: applicationIds,
        successCount: result.ok,
        failureCount: result.failed,
      };
      setAuditLogs((prev) => [entry, ...prev].slice(0, 12));
    }
    setAuditDrawerOpen(false);
    setAuditReason("");
  };

  const handleExportSelectedCsv = () => {
    if (selectedApplications.length === 0) {
      addToast("error", "Select at least one application to export.");
      return;
    }
    const header = [
      "Application ID",
      "Student Name",
      "Admission Year",
      "Class",
      "Status",
      "Payment Status",
      "Correction Needed",
      "Emergency Contact",
    ];

    const rows = selectedApplications.map((app) => [
      app.applicationId,
      `${app.studentFirstName} ${app.studentLastName}`,
      app.admissionYear,
      app.class
        ? `${app.class.name}${app.class.section ? ` - ${app.class.section}` : ""}`
        : "Unassigned",
      app.status,
      app.payment?.status ?? "none",
      app.correctionNeeded ? "yes" : "no",
      app.emergencyContact,
    ]);

    const csv = [header, ...rows]
      .map((line) => line.map((value) => csvEscape(value)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `principal-admissions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast(
      "success",
      `Exported ${selectedApplications.length} application(s).`,
    );
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingContext =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable;
      if (isTypingContext) return;
      if (!token) return;

      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key.toLowerCase() === "r"
      ) {
        event.preventDefault();
        void handleRefresh();
      }
      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key.toLowerCase() === "e"
      ) {
        event.preventDefault();
        handleExportSelectedCsv();
      }
      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key.toLowerCase() === "u"
      ) {
        event.preventDefault();
        setBulkActionType("under_review");
        void handleBulkApplyDecision();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const resetFeeSetupForm = () => {
    setInstallmentIntervalDays(30);
    setFeeComponentsDraft([
      { name: "Tuition Fee", amount: 0, description: "", isMandatory: true },
      { name: "Lab Fee", amount: 0, description: "", isMandatory: false },
    ]);
    setInstallmentsDraft([
      { name: "Installment 1", dueOffsetDays: 0, percentage: 40 },
      { name: "Installment 2", dueOffsetDays: 30, percentage: 30 },
      { name: "Installment 3", dueOffsetDays: 60, percentage: 30 },
    ]);
  };

  const autoScheduleInstallmentOffsets = () => {
    const interval = Math.max(1, Number(installmentIntervalDays) || 1);
    setInstallmentsDraft((prev) =>
      prev.map((item, index) => ({
        ...item,
        dueOffsetDays: index * interval,
      })),
    );
  };

  const handleFeeClassSelection = (selectedClassId: string) => {
    setFeeClassId(selectedClassId);
    const selectedClass = allClasses.find((item) => item.id === selectedClassId);
    if (!selectedClass) {
      setFeeAcademicYear("");
      resetFeeSetupForm();
      return;
    }

    setFeeAcademicYear(selectedClass.academicYear);
    const existingStructure = feeStructures.find(
      (row) =>
        row.classId === selectedClassId &&
        row.academicYear === selectedClass.academicYear,
    );
    if (!existingStructure) {
      resetFeeSetupForm();
      return;
    }

    setFeeComponentsDraft(
      existingStructure.feeComponents.map((component) => ({
        name: component.name,
        amount: component.amount,
        description: component.description ?? "",
        isMandatory: component.isMandatory,
      })),
    );

    const primaryInstallmentOption = existingStructure.installmentOptions[0];
    if (
      !primaryInstallmentOption ||
      primaryInstallmentOption.installments.length === 0
    ) {
      resetFeeSetupForm();
      return;
    }

    const mappedInstallments = primaryInstallmentOption.installments.map(
      (installment, index) => ({
        name: installment.name,
        dueOffsetDays:
          typeof installment.dueOffsetDays === "number"
            ? installment.dueOffsetDays
            : index * 30,
        percentage: Number(installment.percentage),
      }),
    );
    setInstallmentsDraft(mappedInstallments);
  };

  const handleCreateClass = async () => {
    if (!token) return;
    const name = classForm.name.trim();
    const section = classForm.section.trim();
    const academicYear = classForm.academicYear.trim();
    const capacityValue = classForm.capacity.trim();
    if (!name || !academicYear) {
      addToast("error", "Class name and academic year are required.");
      return;
    }
    const capacity = capacityValue ? Number(capacityValue) : undefined;
    if (
      capacity !== undefined &&
      (!Number.isFinite(capacity) || capacity <= 0)
    ) {
      addToast("error", "Capacity must be a positive number.");
      return;
    }

    setIsCreatingClass(true);
    try {
      const created = await createPrincipalClass(token, {
        name,
        section: section || undefined,
        academicYear,
        capacity,
      });
      addToast("success", "Class created successfully.");
      setClassForm((prev) => ({
        ...prev,
        name: "",
        section: "",
        capacity: "",
      }));
      setFeeAcademicYear(academicYear);
      setFeeClassId(created.id);
      await Promise.all([loadDashboard(token), loadFeeStructures(token), loadAllClasses(token)]);
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to create class.",
      );
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleCreateFeeStructure = async () => {
    if (!token) return;
    if (!feeClassId) {
      addToast("error", "Select a class before creating fee structure.");
      return;
    }

    const normalizedComponents = feeComponentsDraft
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        description: item.description?.trim() || undefined,
        amount: Number(item.amount),
      }))
      .filter((item) => item.name.length > 0);
    if (normalizedComponents.length === 0) {
      addToast("error", "Add at least one fee component.");
      return;
    }
    if (
      normalizedComponents.some(
        (item) => !Number.isFinite(item.amount) || item.amount <= 0,
      )
    ) {
      addToast(
        "error",
        "Every fee component amount must be greater than zero.",
      );
      return;
    }

    const normalizedInstallments = installmentsDraft.map((item, index) => {
      const offset = Math.max(0, Math.trunc(Number(item.dueOffsetDays)));
      return {
        name: item.name.trim() || `Installment ${index + 1}`,
        dueOffsetDays: Number.isFinite(offset) ? offset : index * 30,
        percentage: Number(item.percentage),
      };
    });
    if (
      normalizedInstallments.some(
        (item) =>
          !Number.isFinite(item.dueOffsetDays) ||
          item.dueOffsetDays < 0 ||
          item.percentage <= 0,
      )
    ) {
      addToast(
        "error",
        "Each installment needs a valid 'days after enrollment' value (0 or more) and a percentage greater than 0.",
      );
      return;
    }
    const sortedOffsets = normalizedInstallments
      .map((item) => item.dueOffsetDays)
      .slice()
      .sort((a, b) => a - b);
    if (
      sortedOffsets.some((offset, idx) =>
        idx === 0 ? false : offset === sortedOffsets[idx - 1],
      )
    ) {
      addToast(
        "error",
        "Installment offsets must be unique (no two installments can fall on the same day).",
      );
      return;
    }
    const totalPercentage = normalizedInstallments.reduce(
      (sum, item) => sum + item.percentage,
      0,
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      addToast("error", "Installment percentages must add up to 100.");
      return;
    }

    setIsCreatingFeeStructure(true);
    try {
      await createFeeStructure(token, {
        classId: feeClassId,
        academicYear: feeAcademicYear,
        feeComponents: normalizedComponents,
        installmentOptions: [
          {
            name: "Standard Installments",
            numberOfInstallments: normalizedInstallments.length,
            installments: normalizedInstallments,
          },
        ],
      });
      addToast("success", "Fee structure configured successfully.");
      resetFeeSetupForm();
      await Promise.all([loadDashboard(token), loadFeeStructures(token)]);
    } catch (err) {
      addToast(
        "error",
        err instanceof Error
          ? err.message
          : "Failed to configure fee structure.",
      );
    } finally {
      setIsCreatingFeeStructure(false);
    }
  };

  const currentStageConfig = PIPELINE_STAGES.find(
    (s) => s.id === activePipelineStage,
  )!;
  const currentTransitions = STAGE_TRANSITIONS[activePipelineStage];

  const navItems = [
    {
      id: "pipeline" as const,
      label: "Pipeline",
      icon: Files,
      badge: stats.pendingReview + stats.underReview,
    },
    {
      id: "custom_plans" as const,
      label: "Custom Plans",
      icon: BarChart3,
      badge: pendingCustomPlans.length,
    },
    { id: "settings" as const, label: "Setup", icon: Settings2, badge: 0 },
    {
      id: "audit" as const,
      label: "Audit",
      icon: ClipboardCheck,
      badge: auditLogs.length,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast container */}
      <div className="fixed right-4 top-4 z-50 flex w-[340px] max-w-[90vw] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-md border px-3 py-2 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <div className="flex items-start gap-2">
              {toast.type === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
          <div className="border-b border-slate-100 px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-royal">
              Principal
            </p>
            <h1 className="mt-1 text-base font-bold text-slate-900">
              Admissions
            </h1>
          </div>
          <nav className="flex-1 space-y-0.5 p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition ${
                    isActive
                      ? "bg-brand-royal/10 text-brand-royal"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${isActive ? "bg-brand-royal text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mini stats */}
          <div className="border-t border-slate-100 p-3 space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Collected</span>
              <span className="font-semibold text-emerald-700">
                {isLoadingStats
                  ? "..."
                  : formatCurrency(stats.totalFeeCollected)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Pending</span>
              <span className="font-semibold text-amber-700">
                {isLoadingStats ? "..." : formatCurrency(stats.totalFeePending)}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 p-2">
            <Button
              variant="secondary"
              className="h-8 w-full justify-center text-xs"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <div className="w-full lg:pl-60">
          {/* Top header */}
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="lg:hidden">
                  <p className="text-sm font-bold text-slate-900">Admissions</p>
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-slate-900">
                    {activeSection === "pipeline"
                      ? "Admission Pipeline"
                      : activeSection === "custom_plans"
                        ? "Custom Payment Plans"
                        : activeSection === "settings"
                          ? "Setup — Classes & Fees"
                          : "Audit Logs"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={handleRefresh}
                  disabled={isLoadingApps || isLoadingStats}
                >
                  {isLoadingApps || isLoadingStats ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-xs lg:hidden"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Mobile nav tabs */}
            <div className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                    activeSection === item.id
                      ? "border-brand-royal bg-brand-royal text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {item.label}
                  {item.badge > 0 ? ` (${item.badge})` : ""}
                </button>
              ))}
            </div>
          </header>

          <main className="px-4 py-5 sm:px-6">
            {error ? (
              <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-semibold text-rose-700">
                  Unable to load dashboard
                </p>
                <p className="mt-1 text-sm text-rose-600">{error}</p>
              </div>
            ) : null}

            {/* ─── PIPELINE SECTION ─── */}
            {activeSection === "pipeline" ? (
              <div className="space-y-4">
                {/* Stat bar */}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {PIPELINE_STAGES.map((stage) => {
                    const count = stageCounts[stage.id] ?? 0;
                    const isActive = activePipelineStage === stage.id;
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setActivePipelineStage(stage.id)}
                        className={`rounded-lg border p-2.5 text-left transition ${
                          isActive
                            ? `border-current ring-2 ${stage.ringColor} ${stage.bgColor}`
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`text-xl font-bold ${isActive ? stage.textColor : "text-slate-800"}`}
                        >
                          {isLoadingStats ? "…" : count}
                        </div>
                        <div
                          className={`mt-0.5 text-[11px] font-medium leading-tight ${isActive ? stage.textColor : "text-slate-500"}`}
                        >
                          {stage.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Active stage panel */}
                <Card className="border border-surface-border">
                  {/* Stage header */}
                  <div
                    className={`flex items-center gap-3 rounded-t-lg border-b border-slate-200 px-4 py-3 ${currentStageConfig.bgColor}`}
                  >
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${currentStageConfig.color}`}
                    />
                    <h2
                      className={`text-sm font-bold ${currentStageConfig.textColor}`}
                    >
                      {currentStageConfig.label}
                    </h2>
                    <Badge>{stageApplications.length}</Badge>
                    <div className="ml-auto flex items-center gap-1.5">
                      {currentTransitions.length > 0 && (
                        <div className="flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-xs text-slate-500">
                          <ArrowRight className="h-3 w-3" />
                          <span>Quick actions available</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by ID, name, or contact"
                      className="h-8 w-52 text-xs"
                    />
                    <Select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Years</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Classes</option>
                      {classes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                          {item.section ? ` - ${item.section}` : ""}
                        </option>
                      ))}
                    </Select>
                    <div className="ml-auto flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        className="h-8 px-2.5 text-xs"
                        disabled={selectedApplications.length === 0}
                        onClick={handleExportSelectedCsv}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Export ({selectedApplications.length})
                      </Button>
                    </div>
                  </div>

                  {/* Bulk actions panel — only show when selections exist */}
                  {actionableSelections.length > 0 && (
                    <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
                      <p className="mb-2 text-xs font-semibold text-amber-800">
                        Bulk action — {actionableSelections.length} selected
                      </p>
                      <div className="flex flex-wrap items-end gap-2">
                        <div>
                          <Select
                            value={bulkActionType}
                            onChange={(e) =>
                              setBulkActionType(
                                e.target.value as BulkActionType,
                              )
                            }
                            className="h-8 text-xs"
                          >
                            <option value="under_review">
                              Move to Under Review
                            </option>
                            <option value="on_hold">Mark On Hold</option>
                            <option value="needs_correction">
                              Request Correction
                            </option>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-40">
                          <Textarea
                            value={bulkComments}
                            onChange={(e) => setBulkComments(e.target.value)}
                            placeholder={
                              bulkActionType === "under_review"
                                ? "Optional comments"
                                : "Required comments"
                            }
                            className="min-h-[34px] text-xs"
                          />
                        </div>
                        {bulkActionType === "needs_correction" && (
                          <div className="flex-1 min-w-40">
                            <Textarea
                              value={bulkCorrectionDetails}
                              onChange={(e) =>
                                setBulkCorrectionDetails(e.target.value)
                              }
                              placeholder="Required: correction details"
                              className="min-h-[34px] text-xs"
                            />
                          </div>
                        )}
                        <Button
                          className="h-8 px-3 text-xs"
                          disabled={isBulkActionLoading}
                          onClick={() => void handleBulkApplyDecision()}
                        >
                          {isBulkActionLoading ? "Applying..." : "Apply"}
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          disabled={isBulkActionLoading}
                          onClick={() => setAuditDrawerOpen(true)}
                        >
                          Audit &amp; Confirm
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Application list */}
                  <div className="divide-y divide-slate-100">
                    {isLoadingApps ? (
                      <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                      </div>
                    ) : paginatedApplications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-400">
                        No applications in this stage.
                      </div>
                    ) : (
                      paginatedApplications.map((app) => {
                        const transitions =
                          STAGE_TRANSITIONS[app.status as PipelineStage] ?? [];
                        const isLoading = actionLoadingFor === app.id;
                        return (
                          <div
                            key={app.id}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50"
                          >
                            {/* Select checkbox */}
                            <div className="mt-0.5 flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(app.id)}
                                onChange={() => toggleRowSelection(app.id)}
                                disabled={!isReviewableStatus(app.status)}
                                aria-label={`Select ${app.applicationId}`}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="font-semibold text-slate-900 text-sm">
                                  {app.applicationId}
                                </span>
                                <span className="text-sm text-slate-600">
                                  {app.studentFirstName} {app.studentLastName}
                                </span>
                                {app.correctionNeeded && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                                    <AlertTriangle className="h-2.5 w-2.5" />{" "}
                                    Correction needed
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                                {app.class ? (
                                  <span>
                                    {app.class.name}
                                    {app.class.section
                                      ? ` - ${app.class.section}`
                                      : ""}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">
                                    No class
                                  </span>
                                )}
                                <span>{app.admissionYear}</span>
                                <Badge
                                  variant={paymentBadgeVariant(
                                    app.payment?.status,
                                  )}
                                >
                                  {app.payment?.status ?? "no payment"}
                                </Badge>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                              <Link
                                href={`/principal/admissions/${app.applicationId}`}
                                className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-brand-royal hover:border-brand-royal hover:bg-brand-royal/5 transition"
                              >
                                Open <ChevronRight className="h-3 w-3" />
                              </Link>
                              {transitions.map((t) => (
                                <button
                                  key={t.status}
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() =>
                                    openTransitionModal(app, t.status, t.label)
                                  }
                                  className={`flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                    t.direction === "forward"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      : t.direction === "terminal"
                                        ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                        : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  }`}
                                >
                                  {isLoading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : t.direction === "forward" ? (
                                    <ArrowRight className="h-3 w-3" />
                                  ) : t.direction === "back" ? (
                                    <ArrowLeft className="h-3 w-3" />
                                  ) : null}
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                      <p className="text-xs text-slate-500">
                        Page {Math.min(page, totalPages)} of {totalPages}
                      </p>
                      <div className="flex gap-1.5">
                        <Button
                          variant="secondary"
                          className="h-7 px-2.5 text-xs"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Prev
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-7 px-2.5 text-xs"
                          disabled={page >= totalPages}
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Select all row */}
                  {paginatedApplications.length > 1 && (
                    <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={isPageFullySelected}
                        onChange={togglePageSelection}
                        aria-label="Select all on page"
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="text-xs text-slate-500">
                        {isPageFullySelected
                          ? "Deselect all on page"
                          : "Select all on page"}
                      </span>
                      <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                        <Keyboard className="h-3.5 w-3.5" />
                        <span>
                          <b>R</b> refresh · <b>E</b> export · <b>U</b> bulk
                          under review
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            ) : null}

            {/* ─── CUSTOM PLANS ─── */}
            {activeSection === "custom_plans" ? (
              <Card className="border border-surface-border p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Custom Installment Requests
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Review and approve or reject requested custom payment
                      plans.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{pendingCustomPlans.length} pending</Badge>
                    <Button
                      variant="secondary"
                      className={UI.queueActionBtn}
                      disabled={isLoadingCustomPlans}
                      onClick={() => token && void loadCustomPlans(token)}
                    >
                      Refresh
                    </Button>
                  </div>
                </div>

                {customPlansError ? (
                  <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    {customPlansError}
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {isLoadingCustomPlans ? (
                    <p className="text-sm text-slate-500">
                      Loading custom requests…
                    </p>
                  ) : pendingCustomPlans.length === 0 ? (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                      No pending custom payment plan requests.
                    </div>
                  ) : (
                    pendingCustomPlans.map((plan) => {
                      const isEditing = editingCustomPlanId === plan.id;
                      const editableInstallments =
                        customPlanDrafts[plan.id] ?? plan.installments;
                      return (
                        <div
                          key={plan.id}
                          className="rounded-lg border border-slate-200 bg-white p-4"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {plan.studentName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Application: {plan.applicationId}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Requested: {formatCurrency(plan.totalAmount)} ·{" "}
                            {plan.installments.length} installments
                          </p>
                          {plan.customPlanReason ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Reason: {plan.customPlanReason}
                            </p>
                          ) : null}

                          <div className="mt-3">
                            <Label htmlFor={`plan-comments-${plan.id}`}>
                              Review comments (required)
                            </Label>
                            <Textarea
                              id={`plan-comments-${plan.id}`}
                              value={customPlanComments[plan.id] ?? ""}
                              onChange={(e) =>
                                setCustomPlanComments((prev) => ({
                                  ...prev,
                                  [plan.id]: e.target.value,
                                }))
                              }
                              placeholder="Comments for approve/reject decision"
                              className="min-h-[60px]"
                            />
                          </div>

                          <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Installments
                              </p>
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <Button
                                    variant="secondary"
                                    className={UI.queueActionBtn}
                                    disabled={
                                      customPlanSaveLoadingFor === plan.id
                                    }
                                    onClick={() =>
                                      cancelEditCustomPlan(plan.id)
                                    }
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    className={UI.queueActionBtn}
                                    disabled={
                                      customPlanSaveLoadingFor === plan.id
                                    }
                                    onClick={() =>
                                      void handleSaveCustomPlanDraft(plan.id)
                                    }
                                  >
                                    {customPlanSaveLoadingFor === plan.id
                                      ? "Saving…"
                                      : "Save Terms"}
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="secondary"
                                  className={UI.queueActionBtn}
                                  disabled={
                                    customPlanActionLoadingFor === plan.id
                                  }
                                  onClick={() => beginEditCustomPlan(plan)}
                                >
                                  Edit Terms
                                </Button>
                              )}
                            </div>
                            <div className="mt-2 space-y-2">
                              {editableInstallments.map((installment) => (
                                <div
                                  key={installment.id}
                                  className="grid grid-cols-12 gap-2 text-xs"
                                >
                                  <div className="col-span-5">
                                    {isEditing ? (
                                      <Input
                                        value={installment.name}
                                        onChange={(e) =>
                                          updateCustomDraftInstallment(
                                            plan.id,
                                            installment.id,
                                            { name: e.target.value },
                                          )
                                        }
                                        className="h-8"
                                      />
                                    ) : (
                                      <p className="truncate text-slate-800">
                                        {installment.name}
                                      </p>
                                    )}
                                  </div>
                                  <div className="col-span-4">
                                    {isEditing ? (
                                      <Input
                                        type="date"
                                        value={installment.dueDate}
                                        onChange={(e) =>
                                          updateCustomDraftInstallment(
                                            plan.id,
                                            installment.id,
                                            { dueDate: e.target.value },
                                          )
                                        }
                                        className="h-8"
                                      />
                                    ) : (
                                      <p className="text-slate-500">
                                        {installment.dueDate}
                                      </p>
                                    )}
                                  </div>
                                  <div className="col-span-3">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        min={1}
                                        value={installment.amount}
                                        onChange={(e) =>
                                          updateCustomDraftInstallment(
                                            plan.id,
                                            installment.id,
                                            {
                                              amount: Number(
                                                e.target.value || 0,
                                              ),
                                            },
                                          )
                                        }
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
                              disabled={
                                customPlanActionLoadingFor === plan.id ||
                                customPlanSaveLoadingFor === plan.id
                              }
                              onClick={() =>
                                void handleReviewCustomPlan(plan.id, true)
                              }
                            >
                              {customPlanActionLoadingFor === plan.id
                                ? "Processing…"
                                : "Approve"}
                            </Button>
                            <Button
                              variant="secondary"
                              className={UI.queueActionBtn}
                              disabled={
                                customPlanActionLoadingFor === plan.id ||
                                customPlanSaveLoadingFor === plan.id
                              }
                              onClick={() =>
                                void handleReviewCustomPlan(plan.id, false)
                              }
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
            ) : null}

            {/* ─── SETTINGS ─── */}
            {activeSection === "settings" ? (
              <div className="grid gap-5 xl:grid-cols-[1.1fr_1.4fr]">
                <Card className="border border-surface-border p-4 sm:p-5">
                  <h2 className="text-base font-bold text-slate-900">
                    Create Class
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Add admission classes before configuring fee structures.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <div>
                      <Label>Grade</Label>
                      <Select
                        value={classForm.name}
                        onChange={(e) =>
                          setClassForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select grade</option>
                        {MASTER_GRADES.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </Select>
                      <p className="mt-1 text-xs text-slate-500">
                        Standard grades only. Free-text class names are no
                        longer accepted.
                      </p>
                    </div>
                    <div>
                      <Label>Section (optional)</Label>
                      <Select
                        value={classForm.section}
                        onChange={(e) =>
                          setClassForm((prev) => ({
                            ...prev,
                            section: e.target.value,
                          }))
                        }
                      >
                        <option value="">No section</option>
                        {SECTION_LETTERS.map((letter) => (
                          <option key={letter} value={letter}>
                            {letter}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Academic Year</Label>
                      <Input
                        value={classForm.academicYear}
                        onChange={(e) =>
                          setClassForm((prev) => ({
                            ...prev,
                            academicYear: e.target.value,
                          }))
                        }
                        placeholder="2026"
                      />
                    </div>
                    <div>
                      <Label>Capacity (optional)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={classForm.capacity}
                        onChange={(e) =>
                          setClassForm((prev) => ({
                            ...prev,
                            capacity: e.target.value,
                          }))
                        }
                        placeholder="40"
                      />
                    </div>
                    <Button
                      className="mt-1"
                      disabled={isCreatingClass}
                      onClick={() => void handleCreateClass()}
                    >
                      {isCreatingClass ? "Creating…" : "Create Class"}
                    </Button>
                  </div>
                </Card>

                <Card className="border border-surface-border p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Fee Configuration
                      </h2>
                      <p className="mt-0.5 text-sm text-slate-500">
                        Define fee components and installment split.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className={UI.queueActionBtn}
                      disabled={!token || isLoadingFeeStructures}
                      onClick={() => token && void loadFeeStructures(token)}
                    >
                      {isLoadingFeeStructures ? "Refreshing…" : "Refresh"}
                    </Button>
                  </div>

                  {settingsError ? (
                    <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                      {settingsError}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Class</Label>
                      <Select
                        value={feeClassId}
                        onChange={(e) =>
                          handleFeeClassSelection(e.target.value)
                        }
                      >
                        <option value="">Select class</option>
                        {allClasses.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                            {item.section ? ` - ${item.section}` : ""} (
                            {item.academicYear})
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Academic Year</Label>
                      <Input
                        value={feeAcademicYear}
                        onChange={(e) => setFeeAcademicYear(e.target.value)}
                        placeholder="2026"
                      />
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">
                        Fee Components
                      </p>
                      <Button
                        variant="secondary"
                        className={UI.queueActionBtn}
                        onClick={() =>
                          setFeeComponentsDraft((prev) => [
                            ...prev,
                            {
                              name: "",
                              amount: 0,
                              description: "",
                              isMandatory: true,
                            },
                          ])
                        }
                      >
                        Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {feeComponentsDraft.map((component, index) => (
                        <div
                          key={`component-${index}`}
                          className="grid gap-2 md:grid-cols-[2fr_1fr_auto]"
                        >
                          <Input
                            value={component.name}
                            onChange={(e) =>
                              setFeeComponentsDraft((prev) =>
                                prev.map((item, idx) =>
                                  idx === index
                                    ? { ...item, name: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Component name"
                          />
                          <Input
                            type="number"
                            min={1}
                            value={component.amount}
                            onChange={(e) =>
                              setFeeComponentsDraft((prev) =>
                                prev.map((item, idx) =>
                                  idx === index
                                    ? {
                                        ...item,
                                        amount: Number(e.target.value || 0),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Amount"
                          />
                          <Button
                            variant="ghost"
                            className={UI.queueActionBtn}
                            disabled={feeComponentsDraft.length <= 1}
                            onClick={() =>
                              setFeeComponentsDraft((prev) =>
                                prev.filter((_, idx) => idx !== index),
                              )
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">
                        Standard Installments
                      </p>
                      <Button
                        variant="secondary"
                        className={UI.queueActionBtn}
                        onClick={() =>
                          setInstallmentsDraft((prev) => [
                            ...prev,
                            {
                              name: `Installment ${prev.length + 1}`,
                              dueOffsetDays:
                                prev.length *
                                Math.max(
                                  1,
                                  Number(installmentIntervalDays) || 30,
                                ),
                              percentage: 0,
                            },
                          ])
                        }
                      >
                        Add
                      </Button>
                    </div>
                    <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                      Installment due dates are configured as <span className="font-semibold">days after the student's enrollment</span>, not calendar dates. The system computes the actual due date for each student when their plan is created — so installments stay correct no matter when the parent enrolls during the admission window.
                    </div>
                    <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto]">
                      <div>
                        <Label>Spacing between installments (days)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={installmentIntervalDays}
                          onChange={(e) =>
                            setInstallmentIntervalDays(
                              Number(e.target.value || 30),
                            )
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={autoScheduleInstallmentOffsets}
                        >
                          Auto-fill Offsets
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {installmentsDraft.map((installment, index) => (
                        <div
                          key={`installment-${index}`}
                          className="grid gap-2 md:grid-cols-[1.5fr_1.3fr_1fr_auto]"
                        >
                          <Input
                            value={installment.name}
                            onChange={(e) =>
                              setInstallmentsDraft((prev) =>
                                prev.map((item, idx) =>
                                  idx === index
                                    ? { ...item, name: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Installment name"
                          />
                          <div>
                            <Input
                              type="number"
                              min={0}
                              value={installment.dueOffsetDays}
                              onChange={(e) =>
                                setInstallmentsDraft((prev) =>
                                  prev.map((item, idx) =>
                                    idx === index
                                      ? {
                                          ...item,
                                          dueOffsetDays: Math.max(
                                            0,
                                            Math.trunc(
                                              Number(e.target.value || 0),
                                            ),
                                          ),
                                        }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="Days after enrollment"
                            />
                            <p className="mt-1 text-[11px] text-slate-500">
                              {installment.dueOffsetDays === 0
                                ? "Due on enrollment day"
                                : `Due ${installment.dueOffsetDays} day${installment.dueOffsetDays === 1 ? "" : "s"} after enrollment`}
                            </p>
                          </div>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={installment.percentage}
                            onChange={(e) =>
                              setInstallmentsDraft((prev) =>
                                prev.map((item, idx) =>
                                  idx === index
                                    ? {
                                        ...item,
                                        percentage: Number(e.target.value || 0),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder="%"
                          />
                          <Button
                            variant="ghost"
                            className={UI.queueActionBtn}
                            disabled={installmentsDraft.length <= 1}
                            onClick={() =>
                              setInstallmentsDraft((prev) =>
                                prev.filter((_, idx) => idx !== index),
                              )
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Total: {installmentPercentageTotal}%{" "}
                      {Math.abs(installmentPercentageTotal - 100) <= 0.01
                        ? "(valid ✓)"
                        : "(must be 100%)"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={isCreatingFeeStructure}
                      onClick={() => void handleCreateFeeStructure()}
                    >
                      {isCreatingFeeStructure
                        ? "Saving…"
                        : "Save Fee Structure"}
                    </Button>
                    <Button variant="secondary" onClick={resetFeeSetupForm}>
                      Reset Draft
                    </Button>
                  </div>

                  <div className="mt-5 rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-800">
                      Existing Fee Structures ({feeStructures.length})
                    </p>
                    {isLoadingFeeStructures ? (
                      <p className="mt-2 text-sm text-slate-500">Loading…</p>
                    ) : feeStructures.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        None configured yet.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {feeStructures.map((row) => (
                          <div
                            key={row.id}
                            className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                          >
                            <p className="text-sm font-medium text-slate-800">
                              {row.class.name}
                              {row.class.section
                                ? ` - ${row.class.section}`
                                : ""}{" "}
                              · {row.academicYear}
                            </p>
                            <Badge>{formatCurrency(row.totalAmount)}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            ) : null}

            {/* ─── AUDIT ─── */}
            {activeSection === "audit" ? (
              <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
                <Card className="border border-surface-border p-4 sm:p-5">
                  <h2 className="text-base font-bold text-slate-900">
                    Recent Action Logs
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Session-local bulk decision trail.
                  </p>
                  <div className="mt-4 space-y-2">
                    {auditLogs.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No audit entries yet.
                      </p>
                    ) : (
                      auditLogs.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-md border border-slate-200 bg-slate-50 p-3"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {entry.action.replace("_", " ")} (
                            {entry.successCount} ok / {entry.failureCount}{" "}
                            failed)
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(entry.timestamp).toLocaleString("en-IN")}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Reason: {entry.reason}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
                <Card className="border border-surface-border p-4 sm:p-5">
                  <h2 className="text-base font-bold text-slate-900">
                    Guidance
                  </h2>
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="font-semibold">
                      Before confirming bulk actions:
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      <li>Only reviewable rows will be affected.</li>
                      <li>Write clear reason and correction notes.</li>
                      <li>Prefer smaller batches for sensitive actions.</li>
                    </ul>
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="secondary"
                      disabled={
                        actionableSelections.length === 0 || isBulkActionLoading
                      }
                      onClick={() => setAuditDrawerOpen(true)}
                    >
                      Open Audit Preview ({actionableSelections.length})
                    </Button>
                  </div>
                </Card>
              </div>
            ) : null}
          </main>
        </div>
      </div>

      {/* ─── TRANSITION MODAL ─── */}
      {transitionModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md p-5">
            <h3 className="text-base font-bold text-slate-900">
              {transitionModal.label}
            </h3>
            <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
              <p className="font-semibold text-slate-800">
                {transitionModal.app.applicationId}
              </p>
              <p className="text-slate-500">
                {transitionModal.app.studentFirstName}{" "}
                {transitionModal.app.studentLastName}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Current stage:{" "}
                <span className="font-semibold text-slate-600">
                  {transitionModal.app.status.replace(/_/g, " ")}
                </span>
                {" → "}
                <span className="font-semibold text-slate-800">
                  {transitionModal.toStatus.replace(/_/g, " ")}
                </span>
              </p>
            </div>

            <div className="mt-3">
              <Label>
                Comments
                {transitionModal.toStatus !== "under_review" ||
                transitionModal.needsCorrection
                  ? " (required)"
                  : " (optional)"}
              </Label>
              <Textarea
                value={transitionComments}
                onChange={(e) => setTransitionComments(e.target.value)}
                placeholder="Explain this decision…"
                className="min-h-[80px]"
                autoFocus
              />
            </div>

            {transitionModal.needsCorrection && (
              <div className="mt-3">
                <Label>Correction Details (required)</Label>
                <Textarea
                  value={transitionCorrectionDetails}
                  onChange={(e) =>
                    setTransitionCorrectionDetails(e.target.value)
                  }
                  placeholder="What exactly needs to be corrected?"
                  className="min-h-[80px]"
                />
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={closeTransitionModal}
                disabled={actionLoadingFor === transitionModal.app.id}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleConfirmTransition()}
                disabled={actionLoadingFor === transitionModal.app.id}
              >
                {actionLoadingFor === transitionModal.app.id
                  ? "Updating…"
                  : "Confirm"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {/* ─── CONFIRM BULK MODAL ─── */}
      {confirmBulkOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg p-5">
            <h3 className="text-base font-bold text-slate-900">
              Confirm Bulk Decision
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              You are about to apply{" "}
              <span className="font-semibold text-slate-900">
                {bulkActionType === "on_hold" ? "On Hold" : "Needs Correction"}
              </span>{" "}
              to {actionableSelections.length} application(s).
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmBulkOpen(false)}
                disabled={isBulkActionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setConfirmBulkOpen(false);
                  await performBulkDecision();
                }}
                disabled={isBulkActionLoading}
              >
                Confirm
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {/* ─── AUDIT DRAWER ─── */}
      {auditDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bulk Audit Preview
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Review exact impact before applying.
                </p>
              </div>
              <Button variant="ghost" onClick={() => setAuditDrawerOpen(false)}>
                Close
              </Button>
            </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">
                Action: {bulkActionType.replace("_", " ")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Actionable: {actionableSelections.length}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {actionableSelections.map((app) => (
                <div
                  key={app.id}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <p className="font-semibold text-slate-900">
                    {app.applicationId}
                  </p>
                  <p className="text-slate-500">
                    {app.studentFirstName} {app.studentLastName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {app.status} →{" "}
                    {bulkActionType === "needs_correction"
                      ? "needs_correction"
                      : bulkActionType}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Audit Reason (required)
              </label>
              <Textarea
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="Explain why this bulk decision is being applied."
                className="min-h-[90px]"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setAuditDrawerOpen(false)}
                disabled={isBulkActionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleAuditConfirm()}
                disabled={
                  isBulkActionLoading || actionableSelections.length === 0
                }
              >
                {isBulkActionLoading ? "Applying…" : "Confirm with Audit"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
