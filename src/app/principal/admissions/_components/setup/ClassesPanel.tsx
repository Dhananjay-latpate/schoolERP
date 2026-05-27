"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Pencil,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { MASTER_GRADES, SECTION_LETTERS } from "@/lib/grades";
import {
  archivePrincipalClass,
  createPrincipalClass,
  listClasses,
  restorePrincipalClass,
  updatePrincipalClass,
  type PrincipalAdmissionSession,
  type PrincipalClass,
  type PrincipalFeeStructure,
} from "@/lib/principalApi";
import { ConfirmDialog, Modal } from "./setupShared";

interface ClassesPanelProps {
  token: string;
  session: PrincipalAdmissionSession | null;
  classes: PrincipalClass[];
  feeStructures: PrincipalFeeStructure[];
  addToast: (type: "success" | "error", message: string) => void;
  onMutated: () => Promise<void> | void;
  onGoToSessions: () => void;
  onConfigureFees: (classId: string) => void;
}

type DialogState =
  | { kind: "edit"; cls: PrincipalClass }
  | { kind: "archive"; cls: PrincipalClass }
  | { kind: "restore"; cls: PrincipalClass }
  | null;

function classLabel(cls: PrincipalClass): string {
  return cls.section ? `${cls.name} — ${cls.section}` : cls.name;
}

export function ClassesPanel({
  token,
  session,
  classes,
  feeStructures,
  addToast,
  onMutated,
  onGoToSessions,
  onConfigureFees,
}: ClassesPanelProps) {
  const sessionCode = session?.sessionCode ?? null;

  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [capacity, setCapacity] = useState("");
  const [creating, setCreating] = useState(false);

  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived] = useState<PrincipalClass[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [editCapacity, setEditCapacity] = useState("");
  const [busy, setBusy] = useState(false);

  const sessionClasses = useMemo(
    () =>
      sessionCode
        ? classes.filter((c) => c.academicYear === sessionCode)
        : [],
    [classes, sessionCode],
  );

  const feeClassIds = useMemo(
    () =>
      new Set(
        feeStructures
          .filter((f) => f.academicYear === sessionCode)
          .map((f) => f.classId),
      ),
    [feeStructures, sessionCode],
  );

  const loadArchived = useCallback(async () => {
    if (!sessionCode) return;
    setLoadingArchived(true);
    try {
      const all = await listClasses(token, sessionCode, false, true);
      setArchived(all.filter((c) => c.isActive === false));
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to load archived classes.",
      );
    } finally {
      setLoadingArchived(false);
    }
  }, [token, sessionCode, addToast]);

  useEffect(() => {
    if (showArchived) void loadArchived();
  }, [showArchived, loadArchived, classes]);

  const refreshAll = useCallback(async () => {
    await onMutated();
    if (showArchived) await loadArchived();
  }, [onMutated, showArchived, loadArchived]);

  const closeDialog = () => {
    if (busy) return;
    setDialog(null);
  };

  const handleCreate = async () => {
    if (!sessionCode) return;
    if (!grade) {
      addToast("error", "Pick a grade for the new class.");
      return;
    }
    const capacityValue = capacity.trim();
    const capacityNum = capacityValue ? Number(capacityValue) : undefined;
    if (
      capacityNum !== undefined &&
      (!Number.isFinite(capacityNum) || capacityNum <= 0)
    ) {
      addToast("error", "Capacity must be a positive number.");
      return;
    }
    setCreating(true);
    try {
      await createPrincipalClass(token, {
        name: grade,
        section: section || undefined,
        academicYear: sessionCode,
        capacity: capacityNum,
      });
      addToast("success", `${grade}${section ? ` — ${section}` : ""} added.`);
      setGrade("");
      setSection("");
      setCapacity("");
      await refreshAll();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to create class.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (dialog?.kind !== "edit") return;
    const capacityValue = editCapacity.trim();
    const capacityNum = capacityValue ? Number(capacityValue) : null;
    if (
      capacityNum !== null &&
      (!Number.isFinite(capacityNum) || capacityNum <= 0)
    ) {
      addToast("error", "Capacity must be a positive number.");
      return;
    }
    setBusy(true);
    try {
      await updatePrincipalClass(token, dialog.cls.id, {
        capacity: capacityNum,
      });
      addToast("success", "Class updated.");
      setDialog(null);
      await refreshAll();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to update class.",
      );
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setBusy(true);
    try {
      await action();
      addToast("success", successMessage);
      setDialog(null);
      await refreshAll();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <Card className="border border-surface-border p-4 sm:p-5">
        <EmptyState
          icon={GraduationCap}
          title="No admission session selected"
          description="Classes belong to an admission session. Create or pick a session first."
          action={
            <Button onClick={onGoToSessions}>
              Go to Sessions <ArrowRight size={14} className="ml-1" />
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Create class */}
      <Card className="border border-surface-border p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-brand-royal" />
          <h2 className="text-base font-bold text-slate-900">Add Class</h2>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          Classes for session{" "}
          <span className="font-semibold text-slate-700">
            {session.sessionCode}
          </span>
          . Students choose one of these on the admission form.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div>
            <Label>Grade</Label>
            <Select value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">Select grade</option>
              {MASTER_GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Section</Label>
            <Select
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              <option value="">None</option>
              {SECTION_LETTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Capacity</Label>
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex items-end">
            <Button
              block
              disabled={creating || !grade}
              onClick={() => void handleCreate()}
            >
              {creating ? "Adding…" : "Add Class"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Class list */}
      <Card className="border border-surface-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">
            Classes ({sessionClasses.length})
          </h2>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Show archived
          </label>
        </div>

        {sessionClasses.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No classes yet"
            description="Add the grades and sections this session will accept students into."
            className="py-8"
          />
        ) : (
          <div className="mt-4 divide-y divide-surface-border">
            {sessionClasses.map((cls) => {
              const hasFees = feeClassIds.has(cls.id);
              return (
                <div
                  key={cls.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {classLabel(cls)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Capacity: {cls.capacity ?? "Not set"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {hasFees ? (
                      <Badge
                        variant="success"
                        className="inline-flex items-center gap-1"
                      >
                        <CheckCircle2 size={11} /> Fees set
                      </Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onConfigureFees(cls.id)}
                      >
                        <XCircle size={12} className="mr-1 text-amber-500" />
                        Set up fees
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditCapacity(
                          cls.capacity != null ? String(cls.capacity) : "",
                        );
                        setDialog({ kind: "edit", cls });
                      }}
                    >
                      <Pencil size={13} className="mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600"
                      onClick={() => setDialog({ kind: "archive", cls })}
                    >
                      <Archive size={13} className="mr-1" /> Archive
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showArchived && (
          <div className="mt-5 border-t border-surface-border pt-4">
            <p className="text-sm font-semibold text-slate-700">
              Archived classes
            </p>
            {loadingArchived ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </p>
            ) : archived.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No archived classes.</p>
            ) : (
              <div className="mt-2 divide-y divide-surface-border">
                {archived.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {classLabel(cls)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Capacity: {cls.capacity ?? "Not set"}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDialog({ kind: "restore", cls })}
                    >
                      <RotateCcw size={13} className="mr-1" /> Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Dialogs */}
      {dialog?.kind === "edit" && (
        <Modal
          title={`Edit ${classLabel(dialog.cls)}`}
          description="Grade and section are fixed. Archive and re-add to change them."
          onClose={closeDialog}
          footer={
            <>
              <Button variant="secondary" disabled={busy} onClick={closeDialog}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => void handleSaveEdit()}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </>
          }
        >
          <Label>Capacity</Label>
          <Input
            type="number"
            min={1}
            value={editCapacity}
            onChange={(e) => setEditCapacity(e.target.value)}
            placeholder="Leave blank for no limit"
          />
        </Modal>
      )}

      {dialog?.kind === "archive" && (
        <ConfirmDialog
          title="Archive this class?"
          confirmLabel="Archive Class"
          tone="danger"
          busy={busy}
          message={
            <>
              <strong>{classLabel(dialog.cls)}</strong> will be hidden and can
              no longer be picked on the admission form. Existing applications
              and its fee structure are preserved.
            </>
          }
          onCancel={closeDialog}
          onConfirm={() =>
            void runAction(
              () => archivePrincipalClass(token, dialog.cls.id),
              "Class archived.",
            )
          }
        />
      )}

      {dialog?.kind === "restore" && (
        <ConfirmDialog
          title="Restore this class?"
          confirmLabel="Restore Class"
          busy={busy}
          message={
            <>
              <strong>{classLabel(dialog.cls)}</strong> will be selectable on
              the admission form again.
            </>
          }
          onCancel={closeDialog}
          onConfirm={() =>
            void runAction(
              () => restorePrincipalClass(token, dialog.cls.id),
              "Class restored.",
            )
          }
        />
      )}
    </div>
  );
}
