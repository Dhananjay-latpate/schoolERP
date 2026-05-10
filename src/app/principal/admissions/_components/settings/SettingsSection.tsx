"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
  createFeeStructure,
  createPrincipalClass,
  listClasses,
  listFeeStructures,
  PrincipalApiError,
  type FeeComponentInput,
  type PrincipalClass,
  type PrincipalFeeStructure,
} from "@/lib/principalApi";
import { clearPrincipalSession } from "@/lib/principalSession";
import { MASTER_GRADES, SECTION_LETTERS } from "@/lib/grades";
import { useRouter } from "next/navigation";
import { type SettingsInstallmentDraft, UI } from "../types";
import { formatCurrency } from "../utils";
import { AdmissionInitWizard } from "./AdmissionInitWizard";

interface SettingsSectionProps {
  token: string;
  refreshSignal: number;
  addToast: (type: "success" | "error", message: string) => void;
  onRefreshDashboard: () => Promise<void>;
}

const DEFAULT_FEE_COMPONENTS: FeeComponentInput[] = [
  { name: "Tuition Fee", amount: 0, description: "", isMandatory: true },
  { name: "Lab Fee", amount: 0, description: "", isMandatory: false },
];

const DEFAULT_INSTALLMENTS: SettingsInstallmentDraft[] = [
  { name: "Installment 1", dueOffsetDays: 0, percentage: 40 },
  { name: "Installment 2", dueOffsetDays: 30, percentage: 30 },
  { name: "Installment 3", dueOffsetDays: 60, percentage: 30 },
];

export function SettingsSection({
  token,
  refreshSignal,
  addToast,
  onRefreshDashboard,
}: SettingsSectionProps) {
  const router = useRouter();
  const [allClasses, setAllClasses] = useState<PrincipalClass[]>([]);
  const [feeStructures, setFeeStructures] = useState<PrincipalFeeStructure[]>([]);
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
  const [feeAcademicYear, setFeeAcademicYear] = useState(new Date().getFullYear().toString());
  const [installmentIntervalDays, setInstallmentIntervalDays] = useState(30);
  const [feeComponentsDraft, setFeeComponentsDraft] = useState<FeeComponentInput[]>(DEFAULT_FEE_COMPONENTS);
  const [installmentsDraft, setInstallmentsDraft] = useState<SettingsInstallmentDraft[]>(DEFAULT_INSTALLMENTS);

  const installmentPercentageTotal = useMemo(
    () => installmentsDraft.reduce((sum, item) => sum + Number(item.percentage || 0), 0),
    [installmentsDraft],
  );

  const handleAuthError = useCallback(() => {
    clearPrincipalSession();
    router.replace("/principal/login?next=%2Fprincipal%2Fadmissions");
  }, [router]);

  const loadFeeStructures = useCallback(async () => {
    setIsLoadingFeeStructures(true);
    setSettingsError(null);
    try {
      setFeeStructures(await listFeeStructures(token));
    } catch (err) {
      if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) { handleAuthError(); return; }
      setSettingsError(err instanceof Error ? err.message : "Failed to load admission settings.");
    } finally {
      setIsLoadingFeeStructures(false);
    }
  }, [token, handleAuthError]);

  const loadAllClasses = useCallback(async () => {
    try {
      setAllClasses(await listClasses(token, undefined, true));
    } catch (err) {
      if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) handleAuthError();
    }
  }, [token, handleAuthError]);

  useEffect(() => {
    if (token) {
      void loadFeeStructures();
      void loadAllClasses();
    }
  }, [token, refreshSignal, loadFeeStructures, loadAllClasses]);

  useEffect(() => {
    if (!feeClassId && allClasses.length > 0) {
      setFeeClassId(allClasses[0].id);
      setFeeAcademicYear(allClasses[0].academicYear);
    }
  }, [allClasses, feeClassId]);

  const resetFeeSetupForm = () => {
    setInstallmentIntervalDays(30);
    setFeeComponentsDraft(DEFAULT_FEE_COMPONENTS);
    setInstallmentsDraft(DEFAULT_INSTALLMENTS);
  };

  const autoScheduleInstallmentOffsets = () => {
    const interval = Math.max(1, Number(installmentIntervalDays) || 1);
    setInstallmentsDraft((prev) => prev.map((item, index) => ({ ...item, dueOffsetDays: index * interval })));
  };

  const handleFeeClassSelection = (selectedClassId: string) => {
    setFeeClassId(selectedClassId);
    const selectedClass = allClasses.find((item) => item.id === selectedClassId);
    if (!selectedClass) { setFeeAcademicYear(""); resetFeeSetupForm(); return; }
    setFeeAcademicYear(selectedClass.academicYear);
    const existingStructure = feeStructures.find(
      (row) => row.classId === selectedClassId && row.academicYear === selectedClass.academicYear,
    );
    if (!existingStructure) { resetFeeSetupForm(); return; }
    setFeeComponentsDraft(
      existingStructure.feeComponents.map((c) => ({
        name: c.name, amount: c.amount, description: c.description ?? "", isMandatory: c.isMandatory,
      })),
    );
    const primaryOption = existingStructure.installmentOptions[0];
    if (!primaryOption || primaryOption.installments.length === 0) { resetFeeSetupForm(); return; }
    setInstallmentsDraft(
      primaryOption.installments.map((i, index) => ({
        name: i.name,
        dueOffsetDays: typeof i.dueOffsetDays === "number" ? i.dueOffsetDays : index * 30,
        percentage: Number(i.percentage),
      })),
    );
  };

  const handleCreateClass = async () => {
    const name = classForm.name.trim();
    const academicYear = classForm.academicYear.trim();
    if (!name || !academicYear) { addToast("error", "Class name and academic year are required."); return; }
    const capacityValue = classForm.capacity.trim();
    const capacity = capacityValue ? Number(capacityValue) : undefined;
    if (capacity !== undefined && (!Number.isFinite(capacity) || capacity <= 0)) {
      addToast("error", "Capacity must be a positive number."); return;
    }
    setIsCreatingClass(true);
    try {
      const created = await createPrincipalClass(token, {
        name,
        section: classForm.section.trim() || undefined,
        academicYear,
        capacity,
      });
      addToast("success", "Class created successfully.");
      setClassForm((prev) => ({ ...prev, name: "", section: "", capacity: "" }));
      setFeeAcademicYear(academicYear);
      setFeeClassId(created.id);
      await Promise.all([onRefreshDashboard(), loadFeeStructures(), loadAllClasses()]);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to create class.");
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleCreateFeeStructure = async () => {
    if (!feeClassId) { addToast("error", "Select a class before creating fee structure."); return; }
    const normalizedComponents = feeComponentsDraft
      .map((item) => ({ ...item, name: item.name.trim(), description: item.description?.trim() || undefined, amount: Number(item.amount) }))
      .filter((item) => item.name.length > 0);
    if (normalizedComponents.length === 0) { addToast("error", "Add at least one fee component."); return; }
    if (normalizedComponents.some((item) => !Number.isFinite(item.amount) || item.amount <= 0)) {
      addToast("error", "Every fee component amount must be greater than zero."); return;
    }
    const normalizedInstallments = installmentsDraft.map((item, index) => {
      const offset = Math.max(0, Math.trunc(Number(item.dueOffsetDays)));
      return { name: item.name.trim() || `Installment ${index + 1}`, dueOffsetDays: Number.isFinite(offset) ? offset : index * 30, percentage: Number(item.percentage) };
    });
    if (normalizedInstallments.some((item) => !Number.isFinite(item.dueOffsetDays) || item.dueOffsetDays < 0 || item.percentage <= 0)) {
      addToast("error", "Each installment needs a valid 'days after enrollment' value (0 or more) and a percentage greater than 0."); return;
    }
    const sortedOffsets = [...normalizedInstallments.map((i) => i.dueOffsetDays)].sort((a, b) => a - b);
    if (sortedOffsets.some((offset, idx) => idx !== 0 && offset === sortedOffsets[idx - 1])) {
      addToast("error", "Installment offsets must be unique (no two installments can fall on the same day)."); return;
    }
    const totalPct = normalizedInstallments.reduce((sum, i) => sum + i.percentage, 0);
    if (Math.abs(totalPct - 100) > 0.01) { addToast("error", "Installment percentages must add up to 100."); return; }

    setIsCreatingFeeStructure(true);
    try {
      await createFeeStructure(token, {
        classId: feeClassId,
        academicYear: feeAcademicYear,
        feeComponents: normalizedComponents,
        installmentOptions: [{
          name: "Standard Installments",
          numberOfInstallments: normalizedInstallments.length,
          installments: normalizedInstallments,
        }],
      });
      addToast("success", "Fee structure configured successfully.");
      resetFeeSetupForm();
      await Promise.all([onRefreshDashboard(), loadFeeStructures()]);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to configure fee structure.");
    } finally {
      setIsCreatingFeeStructure(false);
    }
  };

  const createClassRef = useRef<HTMLDivElement | null>(null);
  const feeConfigRef = useRef<HTMLDivElement | null>(null);

  const jumpToCreateClass = useCallback(() => {
    createClassRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    createClassRef.current?.focus({ preventScroll: true });
  }, []);

  const jumpToFeeConfig = useCallback(
    (classId?: string) => {
      if (classId) {
        handleFeeClassSelection(classId);
      }
      feeConfigRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-5">
      <AdmissionInitWizard
        token={token}
        refreshSignal={refreshSignal}
        classes={allClasses}
        feeStructures={feeStructures}
        addToast={addToast}
        onJumpToCreateClass={jumpToCreateClass}
        onJumpToFeeConfig={jumpToFeeConfig}
        onAfterChange={async () => {
          await Promise.all([
            onRefreshDashboard(),
            loadAllClasses(),
            loadFeeStructures(),
          ]);
        }}
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1.4fr]">
      {/* Create Class */}
      <Card
        ref={createClassRef}
        tabIndex={-1}
        className="border border-surface-border p-4 sm:p-5"
      >
        <h2 className="text-base font-bold text-slate-900">Create Class</h2>
        <p className="mt-0.5 text-sm text-slate-500">Add admission classes before configuring fee structures.</p>
        <div className="mt-4 grid gap-3">
          <div>
            <Label>Grade</Label>
            <Select value={classForm.name} onChange={(e) => setClassForm((prev) => ({ ...prev, name: e.target.value }))}>
              <option value="">Select grade</option>
              {MASTER_GRADES.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
            </Select>
            <p className="mt-1 text-xs text-slate-500">Standard grades only. Free-text class names are no longer accepted.</p>
          </div>
          <div>
            <Label>Section (optional)</Label>
            <Select value={classForm.section} onChange={(e) => setClassForm((prev) => ({ ...prev, section: e.target.value }))}>
              <option value="">No section</option>
              {SECTION_LETTERS.map((letter) => <option key={letter} value={letter}>{letter}</option>)}
            </Select>
          </div>
          <div>
            <Label>Academic Year</Label>
            <Input
              value={classForm.academicYear}
              onChange={(e) => setClassForm((prev) => ({ ...prev, academicYear: e.target.value }))}
              placeholder="2026"
            />
          </div>
          <div>
            <Label>Capacity (optional)</Label>
            <Input
              type="number"
              min={1}
              value={classForm.capacity}
              onChange={(e) => setClassForm((prev) => ({ ...prev, capacity: e.target.value }))}
              placeholder="40"
            />
          </div>
          <Button className="mt-1" disabled={isCreatingClass} onClick={() => void handleCreateClass()}>
            {isCreatingClass ? "Creating…" : "Create Class"}
          </Button>
        </div>
      </Card>

      {/* Fee Configuration */}
      <Card
        ref={feeConfigRef}
        tabIndex={-1}
        className="border border-surface-border p-4 sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Fee Configuration</h2>
            <p className="mt-0.5 text-sm text-slate-500">Define fee components and installment split.</p>
          </div>
          <Button variant="secondary" className={UI.queueActionBtn} disabled={isLoadingFeeStructures} onClick={() => void loadFeeStructures()}>
            {isLoadingFeeStructures ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {settingsError && (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {settingsError}
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <Label>Class</Label>
            <Select value={feeClassId} onChange={(e) => handleFeeClassSelection(e.target.value)}>
              <option value="">Select class</option>
              {allClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.section ? ` - ${item.section}` : ""} ({item.academicYear})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Academic Year</Label>
            <Input value={feeAcademicYear} onChange={(e) => setFeeAcademicYear(e.target.value)} placeholder="2026" />
          </div>
        </div>

        {/* Fee Components */}
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Fee Components</p>
            <Button
              variant="secondary"
              className={UI.queueActionBtn}
              onClick={() => setFeeComponentsDraft((prev) => [...prev, { name: "", amount: 0, description: "", isMandatory: true }])}
            >
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {feeComponentsDraft.map((component, index) => (
              <div key={`component-${index}`} className="grid gap-2 md:grid-cols-[2fr_1fr_auto]">
                <Input
                  value={component.name}
                  onChange={(e) => setFeeComponentsDraft((prev) => prev.map((item, idx) => idx === index ? { ...item, name: e.target.value } : item))}
                  placeholder="Component name"
                />
                <Input
                  type="number"
                  min={1}
                  value={component.amount}
                  onChange={(e) => setFeeComponentsDraft((prev) => prev.map((item, idx) => idx === index ? { ...item, amount: Number(e.target.value || 0) } : item))}
                  placeholder="Amount"
                />
                <Button
                  variant="ghost"
                  className={UI.queueActionBtn}
                  disabled={feeComponentsDraft.length <= 1}
                  onClick={() => setFeeComponentsDraft((prev) => prev.filter((_, idx) => idx !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Installments */}
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Standard Installments</p>
            <Button
              variant="secondary"
              className={UI.queueActionBtn}
              onClick={() =>
                setInstallmentsDraft((prev) => [
                  ...prev,
                  { name: `Installment ${prev.length + 1}`, dueOffsetDays: prev.length * Math.max(1, Number(installmentIntervalDays) || 30), percentage: 0 },
                ])
              }
            >
              Add
            </Button>
          </div>
          <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Installment due dates are configured as{" "}
            <span className="font-semibold">days after the student's enrollment</span>, not calendar dates.
            The system computes the actual due date for each student when their plan is created.
          </div>
          <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto]">
            <div>
              <Label>Spacing between installments (days)</Label>
              <Input
                type="number"
                min={1}
                value={installmentIntervalDays}
                onChange={(e) => setInstallmentIntervalDays(Number(e.target.value || 30))}
              />
            </div>
            <div className="flex items-end">
              <Button variant="secondary" className="w-full" onClick={autoScheduleInstallmentOffsets}>
                Auto-fill Offsets
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {installmentsDraft.map((installment, index) => (
              <div key={`installment-${index}`} className="grid gap-2 md:grid-cols-[1.5fr_1.3fr_1fr_auto]">
                <Input
                  value={installment.name}
                  onChange={(e) => setInstallmentsDraft((prev) => prev.map((item, idx) => idx === index ? { ...item, name: e.target.value } : item))}
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
                          idx === index ? { ...item, dueOffsetDays: Math.max(0, Math.trunc(Number(e.target.value || 0))) } : item,
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
                  onChange={(e) => setInstallmentsDraft((prev) => prev.map((item, idx) => idx === index ? { ...item, percentage: Number(e.target.value || 0) } : item))}
                  placeholder="%"
                />
                <Button
                  variant="ghost"
                  className={UI.queueActionBtn}
                  disabled={installmentsDraft.length <= 1}
                  onClick={() => setInstallmentsDraft((prev) => prev.filter((_, idx) => idx !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Total: {installmentPercentageTotal}%{" "}
            {Math.abs(installmentPercentageTotal - 100) <= 0.01 ? "(valid ✓)" : "(must be 100%)"}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={isCreatingFeeStructure} onClick={() => void handleCreateFeeStructure()}>
            {isCreatingFeeStructure ? "Saving…" : "Save Fee Structure"}
          </Button>
          <Button variant="secondary" onClick={resetFeeSetupForm}>Reset Draft</Button>
        </div>

        {/* Existing fee structures */}
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-800">
            Existing Fee Structures ({feeStructures.length})
          </p>
          {isLoadingFeeStructures ? (
            <p className="mt-2 text-sm text-slate-500">Loading…</p>
          ) : feeStructures.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">None configured yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {feeStructures.map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-sm font-medium text-slate-800">
                    {row.class.name}{row.class.section ? ` - ${row.class.section}` : ""} · {row.academicYear}
                  </p>
                  <Badge>{formatCurrency(row.totalAmount)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      </div>
    </div>
  );
}
