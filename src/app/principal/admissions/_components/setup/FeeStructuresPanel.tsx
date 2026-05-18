"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import {
  archiveFeeStructure,
  createFeeStructure,
  listFeeStructures,
  restoreFeeStructure,
  updateFeeStructure,
  type FeeComponentInput,
  type InstallmentInput,
  type PrincipalAdmissionSession,
  type PrincipalClass,
  type PrincipalFeeStructure,
} from "@/lib/principalApi";
import { formatCurrency } from "../utils";
import { ConfirmDialog, Modal } from "./setupShared";

interface FeeStructuresPanelProps {
  token: string;
  session: PrincipalAdmissionSession | null;
  classes: PrincipalClass[];
  feeStructures: PrincipalFeeStructure[];
  addToast: (type: "success" | "error", message: string) => void;
  onMutated: () => Promise<void> | void;
  onGoToSessions: () => void;
  focusClassId: string | null;
  onFocusHandled: () => void;
}

interface ComponentDraft {
  name: string;
  amount: number;
}

interface InstallmentDraft {
  name: string;
  dueOffsetDays: number;
  percentage: number;
}

const DEFAULT_COMPONENTS: ComponentDraft[] = [
  { name: "Tuition Fee", amount: 0 },
];

const DEFAULT_INSTALLMENTS: InstallmentDraft[] = [
  { name: "Installment 1", dueOffsetDays: 0, percentage: 100 },
];

function classLabel(cls: PrincipalClass | undefined): string {
  if (!cls) return "Class";
  return cls.section ? `${cls.name} — ${cls.section}` : cls.name;
}

export function FeeStructuresPanel({
  token,
  session,
  classes,
  feeStructures,
  addToast,
  onMutated,
  onGoToSessions,
  focusClassId,
  onFocusHandled,
}: FeeStructuresPanelProps) {
  const sessionCode = session?.sessionCode ?? null;

  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived] = useState<PrincipalFeeStructure[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  const [editorClassId, setEditorClassId] = useState<string | null>(null);
  const [components, setComponents] = useState<ComponentDraft[]>([]);
  const [installments, setInstallments] = useState<InstallmentDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const [archiveTarget, setArchiveTarget] =
    useState<PrincipalFeeStructure | null>(null);
  const [restoreTarget, setRestoreTarget] =
    useState<PrincipalFeeStructure | null>(null);
  const [busy, setBusy] = useState(false);

  const sessionClasses = useMemo(
    () =>
      sessionCode
        ? classes.filter((c) => c.academicYear === sessionCode)
        : [],
    [classes, sessionCode],
  );

  const structureByClassId = useMemo(() => {
    const map = new Map<string, PrincipalFeeStructure>();
    for (const fs of feeStructures) {
      if (fs.academicYear === sessionCode) map.set(fs.classId, fs);
    }
    return map;
  }, [feeStructures, sessionCode]);

  const componentTotal = useMemo(
    () => components.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
    [components],
  );
  const percentageTotal = useMemo(
    () => installments.reduce((sum, i) => sum + (Number(i.percentage) || 0), 0),
    [installments],
  );

  const openEditor = useCallback(
    (classId: string) => {
      const existing = structureByClassId.get(classId);
      if (existing) {
        setComponents(
          existing.feeComponents.map((c) => ({
            name: c.name,
            amount: c.amount,
          })),
        );
        const option = existing.installmentOptions[0];
        if (option && option.installments.length > 0) {
          setInstallments(
            option.installments.map((inst, index) => ({
              name: inst.name,
              dueOffsetDays:
                typeof inst.dueOffsetDays === "number"
                  ? inst.dueOffsetDays
                  : index * 30,
              percentage: Number(inst.percentage),
            })),
          );
        } else {
          setInstallments(DEFAULT_INSTALLMENTS.map((i) => ({ ...i })));
        }
      } else {
        setComponents(DEFAULT_COMPONENTS.map((c) => ({ ...c })));
        setInstallments(DEFAULT_INSTALLMENTS.map((i) => ({ ...i })));
      }
      setEditorClassId(classId);
    },
    [structureByClassId],
  );

  // Deep-link from the Classes tab "Set up fees" action.
  useEffect(() => {
    if (focusClassId) {
      openEditor(focusClassId);
      onFocusHandled();
    }
  }, [focusClassId, openEditor, onFocusHandled]);

  const loadArchived = useCallback(async () => {
    if (!sessionCode) return;
    setLoadingArchived(true);
    try {
      const all = await listFeeStructures(token, true);
      setArchived(
        all.filter(
          (f) => f.academicYear === sessionCode && f.isActive === false,
        ),
      );
    } catch (err) {
      addToast(
        "error",
        err instanceof Error
          ? err.message
          : "Failed to load archived fee structures.",
      );
    } finally {
      setLoadingArchived(false);
    }
  }, [token, sessionCode, addToast]);

  useEffect(() => {
    if (showArchived) void loadArchived();
  }, [showArchived, loadArchived, feeStructures]);

  const refreshAll = useCallback(async () => {
    await onMutated();
    if (showArchived) await loadArchived();
  }, [onMutated, showArchived, loadArchived]);

  const closeEditor = () => {
    if (saving) return;
    setEditorClassId(null);
  };

  const handleSave = async () => {
    if (!editorClassId || !sessionCode) return;
    const cleanComponents = components
      .map((c) => ({ name: c.name.trim(), amount: Number(c.amount) }))
      .filter((c) => c.name.length > 0);
    if (cleanComponents.length === 0) {
      addToast("error", "Add at least one fee component.");
      return;
    }
    if (cleanComponents.some((c) => !Number.isFinite(c.amount) || c.amount <= 0)) {
      addToast("error", "Every fee component amount must be greater than zero.");
      return;
    }
    const cleanInstallments = installments.map((inst, index) => ({
      name: inst.name.trim() || `Installment ${index + 1}`,
      dueOffsetDays: Math.max(0, Math.trunc(Number(inst.dueOffsetDays) || 0)),
      percentage: Number(inst.percentage),
    }));
    if (cleanInstallments.some((i) => !Number.isFinite(i.percentage) || i.percentage <= 0)) {
      addToast("error", "Every installment needs a percentage greater than zero.");
      return;
    }
    const offsets = cleanInstallments.map((i) => i.dueOffsetDays);
    if (new Set(offsets).size !== offsets.length) {
      addToast("error", "Installment due-day offsets must be unique.");
      return;
    }
    if (Math.abs(percentageTotal - 100) > 0.01) {
      addToast("error", "Installment percentages must add up to 100%.");
      return;
    }

    const feeComponents: FeeComponentInput[] = cleanComponents.map((c) => ({
      name: c.name,
      amount: c.amount,
      isMandatory: true,
    }));
    const installmentInputs: InstallmentInput[] = cleanInstallments.map((i) => ({
      name: i.name,
      dueOffsetDays: i.dueOffsetDays,
      percentage: i.percentage,
    }));

    const existing = structureByClassId.get(editorClassId);
    setSaving(true);
    try {
      if (existing) {
        await updateFeeStructure(token, existing.id, {
          feeComponents,
          installmentOptions: [
            {
              name: "Standard Installments",
              numberOfInstallments: installmentInputs.length,
              installments: installmentInputs,
            },
          ],
        });
        addToast("success", "Fee structure updated.");
      } else {
        await createFeeStructure(token, {
          classId: editorClassId,
          academicYear: sessionCode,
          feeComponents,
          installmentOptions: [
            {
              name: "Standard Installments",
              numberOfInstallments: installmentInputs.length,
              installments: installmentInputs,
            },
          ],
        });
        addToast("success", "Fee structure created.");
      }
      setEditorClassId(null);
      await refreshAll();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to save fee structure.",
      );
    } finally {
      setSaving(false);
    }
  };

  const runArchive = async () => {
    if (!archiveTarget) return;
    setBusy(true);
    try {
      await archiveFeeStructure(token, archiveTarget.id);
      addToast("success", "Fee structure archived.");
      setArchiveTarget(null);
      await refreshAll();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to archive.",
      );
    } finally {
      setBusy(false);
    }
  };

  const runRestore = async () => {
    if (!restoreTarget) return;
    setBusy(true);
    try {
      await restoreFeeStructure(token, restoreTarget.id);
      addToast("success", "Fee structure restored.");
      setRestoreTarget(null);
      await refreshAll();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to restore.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <Card className="border border-surface-border p-4 sm:p-5">
        <EmptyState
          icon={IndianRupee}
          title="No admission session selected"
          description="Fee structures are configured per class within a session. Pick a session first."
          action={
            <Button onClick={onGoToSessions}>
              Go to Sessions <ArrowRight size={14} className="ml-1" />
            </Button>
          }
        />
      </Card>
    );
  }

  const editorClass = classes.find((c) => c.id === editorClassId);
  const editorExisting = editorClassId
    ? structureByClassId.get(editorClassId)
    : undefined;

  return (
    <div className="space-y-5">
      <Card className="border border-surface-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IndianRupee size={16} className="text-brand-royal" />
            <h2 className="text-base font-bold text-slate-900">
              Fee Structures — {session.sessionCode}
            </h2>
          </div>
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
        <p className="mt-0.5 text-sm text-slate-500">
          Each class needs a fee structure before admissions can open — it
          drives the amount a parent pays at admission.
        </p>

        {sessionClasses.length === 0 ? (
          <EmptyState
            icon={IndianRupee}
            title="No classes to price"
            description="Add classes to this session first, then configure their fees here."
            className="py-8"
          />
        ) : (
          <div className="mt-4 divide-y divide-surface-border">
            {sessionClasses.map((cls) => {
              const structure = structureByClassId.get(cls.id);
              return (
                <div
                  key={cls.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {classLabel(cls)}
                    </p>
                    {structure ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {structure.feeComponents.length} component(s) ·{" "}
                        {structure.installmentOptions[0]?.installments.length ??
                          0}{" "}
                        installment(s)
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-amber-700">
                        Not configured
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {structure && (
                      <Badge variant="success">
                        {formatCurrency(structure.totalAmount)}
                      </Badge>
                    )}
                    <Button
                      variant={structure ? "ghost" : "primary"}
                      size="sm"
                      onClick={() => openEditor(cls.id)}
                    >
                      {structure ? (
                        <>
                          <Pencil size={13} className="mr-1" /> Edit
                        </>
                      ) : (
                        <>
                          <Plus size={13} className="mr-1" /> Set up fees
                        </>
                      )}
                    </Button>
                    {structure && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600"
                        onClick={() => setArchiveTarget(structure)}
                      >
                        <Archive size={13} className="mr-1" /> Archive
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showArchived && (
          <div className="mt-5 border-t border-surface-border pt-4">
            <p className="text-sm font-semibold text-slate-700">
              Archived fee structures
            </p>
            {loadingArchived ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </p>
            ) : archived.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No archived fee structures.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-surface-border">
                {archived.map((fs) => (
                  <div
                    key={fs.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {fs.class.section
                          ? `${fs.class.name} — ${fs.class.section}`
                          : fs.class.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatCurrency(fs.totalAmount)}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setRestoreTarget(fs)}
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

      {/* Editor */}
      {editorClassId && (
        <Modal
          wide
          title={`${editorExisting ? "Edit" : "Set up"} fees — ${classLabel(editorClass)}`}
          description={`Session ${session.sessionCode}. Total is the sum of all components.`}
          onClose={closeEditor}
          footer={
            <>
              <Button variant="secondary" disabled={saving} onClick={closeEditor}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={() => void handleSave()}>
                {saving
                  ? "Saving…"
                  : editorExisting
                    ? "Save Changes"
                    : "Create Fee Structure"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Components */}
            <div className="rounded-lg border border-surface-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  Fee Components
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setComponents((prev) => [...prev, { name: "", amount: 0 }])
                  }
                >
                  <Plus size={12} className="mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {components.map((component, index) => (
                  <div
                    key={`component-${index}`}
                    className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]"
                  >
                    <Input
                      value={component.name}
                      placeholder="Component name"
                      onChange={(e) =>
                        setComponents((prev) =>
                          prev.map((c, i) =>
                            i === index ? { ...c, name: e.target.value } : c,
                          ),
                        )
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      value={component.amount}
                      placeholder="Amount"
                      onChange={(e) =>
                        setComponents((prev) =>
                          prev.map((c, i) =>
                            i === index
                              ? { ...c, amount: Number(e.target.value || 0) }
                              : c,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={components.length <= 1}
                      onClick={() =>
                        setComponents((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Total: {formatCurrency(componentTotal)}
              </p>
            </div>

            {/* Installments */}
            <div className="rounded-lg border border-surface-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  Installments
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setInstallments((prev) => [
                      ...prev,
                      {
                        name: `Installment ${prev.length + 1}`,
                        dueOffsetDays: prev.length * 30,
                        percentage: 0,
                      },
                    ])
                  }
                >
                  <Plus size={12} className="mr-1" /> Add
                </Button>
              </div>
              <p className="mb-2 rounded-md bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
                Due dates are set as <strong>days after the student
                enrolls</strong>, not fixed calendar dates. The real date is
                computed per student.
              </p>
              <div className="space-y-2">
                {installments.map((installment, index) => (
                  <div
                    key={`installment-${index}`}
                    className="grid gap-2 sm:grid-cols-[1.6fr_1.2fr_1fr_auto]"
                  >
                    <Input
                      value={installment.name}
                      placeholder="Installment name"
                      onChange={(e) =>
                        setInstallments((prev) =>
                          prev.map((inst, i) =>
                            i === index
                              ? { ...inst, name: e.target.value }
                              : inst,
                          ),
                        )
                      }
                    />
                    <div>
                      <Input
                        type="number"
                        min={0}
                        value={installment.dueOffsetDays}
                        placeholder="Days after enrollment"
                        onChange={(e) =>
                          setInstallments((prev) =>
                            prev.map((inst, i) =>
                              i === index
                                ? {
                                    ...inst,
                                    dueOffsetDays: Math.max(
                                      0,
                                      Math.trunc(Number(e.target.value || 0)),
                                    ),
                                  }
                                : inst,
                            ),
                          )
                        }
                      />
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {installment.dueOffsetDays === 0
                          ? "Due on enrollment day"
                          : `${installment.dueOffsetDays} day(s) after`}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={installment.percentage}
                      placeholder="%"
                      onChange={(e) =>
                        setInstallments((prev) =>
                          prev.map((inst, i) =>
                            i === index
                              ? {
                                  ...inst,
                                  percentage: Number(e.target.value || 0),
                                }
                              : inst,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={installments.length <= 1}
                      onClick={() =>
                        setInstallments((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              <p
                className={`mt-2 text-sm font-semibold ${
                  Math.abs(percentageTotal - 100) <= 0.01
                    ? "text-emerald-700"
                    : "text-rose-600"
                }`}
              >
                Total: {percentageTotal}%{" "}
                {Math.abs(percentageTotal - 100) <= 0.01
                  ? "✓"
                  : "(must be 100%)"}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">
                Per-installment amounts
              </span>{" "}
              are derived from the percentages and the total of{" "}
              {formatCurrency(componentTotal)}.
            </div>
          </div>
        </Modal>
      )}

      {archiveTarget && (
        <ConfirmDialog
          title="Archive this fee structure?"
          confirmLabel="Archive"
          tone="danger"
          busy={busy}
          message={
            <>
              The fee structure for{" "}
              <strong>
                {archiveTarget.class.section
                  ? `${archiveTarget.class.name} — ${archiveTarget.class.section}`
                  : archiveTarget.class.name}
              </strong>{" "}
              will be hidden. Charges already raised against it are preserved.
              New admissions for this class will have no fees until you set them
              up again.
            </>
          }
          onCancel={() => (busy ? undefined : setArchiveTarget(null))}
          onConfirm={() => void runArchive()}
        />
      )}

      {restoreTarget && (
        <ConfirmDialog
          title="Restore this fee structure?"
          confirmLabel="Restore"
          busy={busy}
          message={
            <>
              The fee structure for{" "}
              <strong>
                {restoreTarget.class.section
                  ? `${restoreTarget.class.name} — ${restoreTarget.class.section}`
                  : restoreTarget.class.name}
              </strong>{" "}
              will be active again.
            </>
          }
          onCancel={() => (busy ? undefined : setRestoreTarget(null))}
          onConfirm={() => void runRestore()}
        />
      )}
    </div>
  );
}
