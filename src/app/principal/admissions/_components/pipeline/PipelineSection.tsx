"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Download,
  Keyboard,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { reviewPrincipalApplication } from "@/lib/principalApi";
import type { PrincipalApplication, PrincipalClass } from "@/lib/principalApi";
import {
  type AuditLogEntry,
  type BulkActionType,
  type BulkActionResult,
  type PipelineStage,
  type TransitionModalData,
  PAGE_SIZE,
  PIPELINE_STAGES,
  STAGE_MATCHES,
  STAGE_TRANSITIONS,
  UI,
} from "../types";
import { csvEscape, isReviewableStatus, paymentBadgeVariant } from "../utils";
import { TransitionModal } from "./TransitionModal";
import { BulkConfirmModal } from "./BulkConfirmModal";
import { AuditDrawer } from "./AuditDrawer";

interface PipelineSectionProps {
  token: string;
  applications: PrincipalApplication[];
  classes: PrincipalClass[];
  isLoadingStats: boolean;
  isLoadingApps: boolean;
  addToast: (type: "success" | "error", message: string) => void;
  onRefresh: () => Promise<void>;
  onAuditEntry: (entry: AuditLogEntry) => void;
  onApplicationsChange: (updater: (prev: PrincipalApplication[]) => PrincipalApplication[]) => void;
}

export function PipelineSection({
  token,
  applications,
  classes,
  isLoadingStats,
  isLoadingApps,
  addToast,
  onRefresh,
  onAuditEntry,
  onApplicationsChange,
}: PipelineSectionProps) {
  const [activePipelineStage, setActivePipelineStage] = useState<PipelineStage>("payment_completed");
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] = useState<BulkActionType>("under_review");
  const [bulkComments, setBulkComments] = useState("");
  const [bulkCorrectionDetails, setBulkCorrectionDetails] = useState("");
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [auditReason, setAuditReason] = useState("");
  const [actionLoadingFor, setActionLoadingFor] = useState<string | null>(null);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [transitionModal, setTransitionModal] = useState<TransitionModalData | null>(null);
  const [transitionComments, setTransitionComments] = useState("");
  const [transitionCorrectionDetails, setTransitionCorrectionDetails] = useState("");

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [activePipelineStage, yearFilter, classFilter, searchTerm]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    for (const app of applications) years.add(app.admissionYear);
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [applications]);

  const stageApplications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const acceptedStatuses = new Set(STAGE_MATCHES[activePipelineStage] ?? []);
    return applications.filter((app) => {
      if (!acceptedStatuses.has(app.status)) return false;
      if (yearFilter !== "all" && app.admissionYear !== yearFilter) return false;
      if (classFilter !== "all" && app.class?.id !== classFilter) return false;
      if (!normalizedSearch) return true;
      const studentName = `${app.studentFirstName} ${app.studentLastName}`.toLowerCase();
      return (
        app.applicationId.toLowerCase().includes(normalizedSearch) ||
        studentName.includes(normalizedSearch) ||
        app.emergencyContact.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [applications, activePipelineStage, yearFilter, classFilter, searchTerm]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of PIPELINE_STAGES) {
      counts[stage.id] = applications.filter((app) =>
        STAGE_MATCHES[stage.id].includes(app.status),
      ).length;
    }
    return counts;
  }, [applications]);

  const totalPages = Math.max(1, Math.ceil(stageApplications.length / PAGE_SIZE));

  const paginatedApplications = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    return stageApplications.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
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
        prev.filter((id) => !paginatedApplications.some((app) => app.id === id)),
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

  const openTransitionModal = (app: PrincipalApplication, toStatus: string, label: string) => {
    setTransitionModal({ app, toStatus, label, needsCorrection: toStatus === "needs_correction" });
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

    onApplicationsChange((prev) =>
      prev.map((row) =>
        row.id === app.id
          ? { ...row, status: needsCorrection ? "needs_correction" : toStatus, correctionNeeded: needsCorrection }
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
        comments: transitionComments.trim() || `Moved to ${toStatus} from principal pipeline.`,
        needsCorrection: needsCorrection || undefined,
        correctionDetails: needsCorrection ? transitionCorrectionDetails.trim() : undefined,
      });
      addToast(
        "success",
        `${app.applicationId} moved to ${needsCorrection ? "needs correction" : toStatus.replace("_", " ")}.`,
      );
      void onRefresh();
    } catch (err) {
      onApplicationsChange((prev) =>
        prev.map((row) =>
          row.id === app.id ? { ...row, status: previousStatus, correctionNeeded: previousCorrection } : row,
        ),
      );
      addToast("error", err instanceof Error ? err.message : "Failed to update application.");
    } finally {
      setActionLoadingFor(null);
    }
  };

  const getBulkValidationError = (): string | null => {
    if (bulkActionType !== "under_review" && !bulkComments.trim()) {
      return "Comments are required for on-hold or correction requests.";
    }
    if (bulkActionType === "needs_correction" && !bulkCorrectionDetails.trim()) {
      return "Correction details are required for needs-correction action.";
    }
    return null;
  };

  const performBulkDecision = async (options?: { reasonOverride?: string }): Promise<BulkActionResult> => {
    if (!token || actionableSelections.length === 0) return { ok: 0, failed: 0 };
    const validationError = getBulkValidationError();
    if (validationError) {
      addToast("error", validationError);
      return { ok: 0, failed: 0 };
    }

    const reasonOverride = options?.reasonOverride?.trim();
    setIsBulkActionLoading(true);

    const results = await Promise.allSettled(
      actionableSelections.map((app) =>
        reviewPrincipalApplication(token, {
          applicationId: app.applicationId,
          status: bulkActionType === "needs_correction" ? "under_review" : bulkActionType,
          comments:
            reasonOverride ||
            bulkComments.trim() ||
            (bulkActionType === "under_review"
              ? "Bulk moved to under review from principal pipeline."
              : "Bulk principal decision applied from pipeline."),
          needsCorrection: bulkActionType === "needs_correction",
          correctionDetails: bulkActionType === "needs_correction" ? bulkCorrectionDetails.trim() : undefined,
        }),
      ),
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.length - successCount;

    if (successCount > 0) addToast("success", `${successCount} application(s) updated successfully.`);
    if (failureCount > 0) addToast("error", `${failureCount} application(s) could not be updated. Please retry individually.`);

    setSelectedIds([]);
    setBulkComments("");
    setBulkCorrectionDetails("");
    await onRefresh();
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
      addToast("error", "Audit reason is required before confirming bulk decision.");
      return;
    }
    const applicationIds = actionableSelections.map((item) => item.applicationId);
    const result = await performBulkDecision({ reasonOverride: reason });
    if (result) {
      onAuditEntry({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action: bulkActionType,
        reason,
        affectedApplicationIds: applicationIds,
        successCount: result.ok,
        failureCount: result.failed,
      });
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
      "Application ID", "Student Name", "Admission Year", "Class",
      "Status", "Payment Status", "Correction Needed", "Emergency Contact",
    ];
    const rows = selectedApplications.map((app) => [
      app.applicationId,
      `${app.studentFirstName} ${app.studentLastName}`,
      app.admissionYear,
      app.class ? `${app.class.name}${app.class.section ? ` - ${app.class.section}` : ""}` : "Unassigned",
      app.status,
      app.payment?.status ?? "none",
      app.correctionNeeded ? "yes" : "no",
      app.emergencyContact,
    ]);
    const csv = [header, ...rows].map((line) => line.map((v) => csvEscape(v)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `principal-admissions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast("success", `Exported ${selectedApplications.length} application(s).`);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable) return;
      if (!token || event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "r") { event.preventDefault(); void onRefresh(); }
      if (key === "e") { event.preventDefault(); handleExportSelectedCsv(); }
      if (key === "u") { event.preventDefault(); setBulkActionType("under_review"); void handleBulkApplyDecision(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const currentStageConfig = PIPELINE_STAGES.find((s) => s.id === activePipelineStage)!;
  const currentTransitions = STAGE_TRANSITIONS[activePipelineStage];

  return (
    <>
      <div className="space-y-4">
        {/* Stage stat bar */}
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
                <div className={`text-xl font-bold ${isActive ? stage.textColor : "text-slate-800"}`}>
                  {isLoadingStats ? "…" : count}
                </div>
                <div className={`mt-0.5 text-[11px] font-medium leading-tight ${isActive ? stage.textColor : "text-slate-500"}`}>
                  {stage.label}
                </div>
              </button>
            );
          })}
        </div>

        <Card className="border border-surface-border">
          {/* Stage header */}
          <div className={`flex items-center gap-3 rounded-t-lg border-b border-slate-200 px-4 py-3 ${currentStageConfig.bgColor}`}>
            <div className={`h-2.5 w-2.5 rounded-full ${currentStageConfig.color}`} />
            <h2 className={`text-sm font-bold ${currentStageConfig.textColor}`}>
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
            <Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="h-8 text-xs">
              <option value="all">All Years</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Select>
            <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="h-8 text-xs">
              <option value="all">All Classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.section ? ` - ${item.section}` : ""}
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

          {/* Bulk actions panel */}
          {actionableSelections.length > 0 && (
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
              <p className="mb-2 text-xs font-semibold text-amber-800">
                Bulk action — {actionableSelections.length} selected
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <Select
                  value={bulkActionType}
                  onChange={(e) => setBulkActionType(e.target.value as BulkActionType)}
                  className="h-8 text-xs"
                >
                  <option value="under_review">Move to Under Review</option>
                  <option value="on_hold">Mark On Hold</option>
                  <option value="needs_correction">Request Correction</option>
                </Select>
                <div className="flex-1 min-w-40">
                  <Textarea
                    value={bulkComments}
                    onChange={(e) => setBulkComments(e.target.value)}
                    placeholder={bulkActionType === "under_review" ? "Optional comments" : "Required comments"}
                    className="min-h-[34px] text-xs"
                  />
                </div>
                {bulkActionType === "needs_correction" && (
                  <div className="flex-1 min-w-40">
                    <Textarea
                      value={bulkCorrectionDetails}
                      onChange={(e) => setBulkCorrectionDetails(e.target.value)}
                      placeholder="Required: correction details"
                      className="min-h-[34px] text-xs"
                    />
                  </div>
                )}
                <Button className="h-8 px-3 text-xs" disabled={isBulkActionLoading} onClick={() => void handleBulkApplyDecision()}>
                  {isBulkActionLoading ? "Applying..." : "Apply"}
                </Button>
                <Button variant="secondary" className="h-8 px-3 text-xs" disabled={isBulkActionLoading} onClick={() => setAuditDrawerOpen(true)}>
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
                const transitions = STAGE_TRANSITIONS[app.status as PipelineStage] ?? [];
                const isLoading = actionLoadingFor === app.id;
                return (
                  <div key={app.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
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
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-semibold text-slate-900 text-sm">{app.applicationId}</span>
                        <span className="text-sm text-slate-600">{app.studentFirstName} {app.studentLastName}</span>
                        {app.correctionNeeded && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                            <AlertTriangle className="h-2.5 w-2.5" /> Correction needed
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {app.class ? (
                          <span>{app.class.name}{app.class.section ? ` - ${app.class.section}` : ""}</span>
                        ) : (
                          <span className="text-slate-400">No class</span>
                        )}
                        <span>{app.admissionYear}</span>
                        <Badge variant={paymentBadgeVariant(app.payment?.status)}>
                          {app.payment?.status ?? "no payment"}
                        </Badge>
                      </div>
                    </div>
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
                          onClick={() => openTransitionModal(app, t.status, t.label)}
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
                <Button variant="secondary" className="h-7 px-2.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </Button>
                <Button variant="secondary" className="h-7 px-2.5 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Select all footer */}
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
                {isPageFullySelected ? "Deselect all on page" : "Select all on page"}
              </span>
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                <Keyboard className="h-3.5 w-3.5" />
                <span><b>R</b> refresh · <b>E</b> export · <b>U</b> bulk under review</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      {transitionModal && (
        <TransitionModal
          modal={transitionModal}
          comments={transitionComments}
          correctionDetails={transitionCorrectionDetails}
          isLoading={actionLoadingFor === transitionModal.app.id}
          onCommentsChange={setTransitionComments}
          onCorrectionDetailsChange={setTransitionCorrectionDetails}
          onCancel={closeTransitionModal}
          onConfirm={() => void handleConfirmTransition()}
        />
      )}

      {confirmBulkOpen && (
        <BulkConfirmModal
          bulkActionType={bulkActionType}
          actionableCount={actionableSelections.length}
          isLoading={isBulkActionLoading}
          onCancel={() => setConfirmBulkOpen(false)}
          onConfirm={async () => {
            setConfirmBulkOpen(false);
            await performBulkDecision();
          }}
        />
      )}

      {auditDrawerOpen && (
        <AuditDrawer
          bulkActionType={bulkActionType}
          actionableSelections={actionableSelections}
          auditReason={auditReason}
          isLoading={isBulkActionLoading}
          onAuditReasonChange={setAuditReason}
          onClose={() => setAuditDrawerOpen(false)}
          onConfirm={() => void handleAuditConfirm()}
        />
      )}
    </>
  );
}
