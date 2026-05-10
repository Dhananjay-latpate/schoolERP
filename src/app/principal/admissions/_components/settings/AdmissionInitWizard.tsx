"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  GraduationCap,
  IndianRupee,
  Loader2,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  commenceAdmissionSession,
  createAdmissionSession,
  getAdmissionSessionReadiness,
  initializeAdmissionSession,
  listAdmissionSessions,
  PrincipalApiError,
  type AdmissionSessionReadiness,
  type PrincipalAdmissionSession,
  type PrincipalClass,
  type PrincipalFeeStructure,
} from "@/lib/principalApi";

interface AdmissionInitWizardProps {
  token: string;
  refreshSignal: number;
  classes: PrincipalClass[];
  feeStructures: PrincipalFeeStructure[];
  addToast: (type: "success" | "error", message: string) => void;
  onJumpToCreateClass: () => void;
  onJumpToFeeConfig: (classId?: string) => void;
  onAfterChange: () => Promise<void>;
}

type WizardStep =
  | "academic_year"
  | "classes"
  | "fees"
  | "commence"
  | "complete";

const STEP_ORDER: WizardStep[] = [
  "academic_year",
  "classes",
  "fees",
  "commence",
  "complete",
];

const STEP_META: Record<
  WizardStep,
  { title: string; subtitle: string; icon: typeof CalendarDays }
> = {
  academic_year: {
    title: "Set Academic Year",
    subtitle: "Create the admission session you're opening applications for.",
    icon: CalendarDays,
  },
  classes: {
    title: "Publish Classes",
    subtitle: "Add the grades + sections this session will accept students into.",
    icon: GraduationCap,
  },
  fees: {
    title: "Configure Fees",
    subtitle:
      "Define fee components and the standard installment plan for each class.",
    icon: IndianRupee,
  },
  commence: {
    title: "Open the Portal",
    subtitle: "Commence admissions to make the form public to parents.",
    icon: PlayCircle,
  },
  complete: {
    title: "All Set",
    subtitle: "Admissions are open. Parents can now apply.",
    icon: Sparkles,
  },
};

function inferNextSessionCode(): string {
  const today = new Date();
  // Indian academic year typically runs June–May. If we're past March we
  // assume the next session is for the upcoming year.
  const year = today.getMonth() >= 2 ? today.getFullYear() : today.getFullYear() - 1;
  const next = (year + 1) % 100;
  return `${year}-${String(next).padStart(2, "0")}`;
}

export function AdmissionInitWizard({
  token,
  refreshSignal,
  classes,
  feeStructures,
  addToast,
  onJumpToCreateClass,
  onJumpToFeeConfig,
  onAfterChange,
}: AdmissionInitWizardProps) {
  const [sessions, setSessions] = useState<PrincipalAdmissionSession[]>([]);
  const [readiness, setReadiness] = useState<AdmissionSessionReadiness | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSessionCode, setNewSessionCode] = useState(inferNextSessionCode());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionList = await listAdmissionSessions(token);
      setSessions(sessionList);
      const targetSession =
        sessionList.find((s) => s.isActive) ??
        sessionList.find((s) => s.status === "ready") ??
        sessionList.find((s) => s.status === "draft") ??
        sessionList[0] ??
        null;
      const targetId = targetSession?.id ?? null;
      setSelectedSessionId((prev) => prev ?? targetId);
      if (targetId) {
        try {
          const r = await getAdmissionSessionReadiness(token, targetId);
          setReadiness(r);
        } catch {
          setReadiness(null);
        }
      } else {
        setReadiness(null);
      }
    } catch (err) {
      if (err instanceof PrincipalApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load wizard.");
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh, refreshSignal]);

  const targetSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find((s) => s.id === selectedSessionId) ?? null;
  }, [sessions, selectedSessionId]);

  const sessionCode = targetSession?.sessionCode ?? null;

  const sessionClasses = useMemo(() => {
    if (!sessionCode) return [];
    return classes.filter((c) => c.academicYear === sessionCode);
  }, [classes, sessionCode]);

  const sessionFeeStructures = useMemo(() => {
    if (!sessionCode) return [];
    return feeStructures.filter((f) => f.academicYear === sessionCode);
  }, [feeStructures, sessionCode]);

  const classesMissingFees = useMemo(() => {
    if (!sessionCode) return [];
    const feeClassIds = new Set(sessionFeeStructures.map((f) => f.classId));
    return sessionClasses.filter((c) => !feeClassIds.has(c.id));
  }, [sessionClasses, sessionFeeStructures, sessionCode]);

  const currentStep: WizardStep = useMemo(() => {
    if (!targetSession) return "academic_year";
    if (targetSession.status === "commenced") return "complete";
    if (sessionClasses.length === 0) return "classes";
    if (classesMissingFees.length > 0) return "fees";
    return "commence";
  }, [targetSession, sessionClasses, classesMissingFees]);

  const handleCreateSession = async () => {
    const code = newSessionCode.trim();
    if (!/^\d{4}-\d{2}$/.test(code)) {
      addToast("error", "Use the format YYYY-YY (e.g. 2026-27).");
      return;
    }
    setWorking(true);
    try {
      const created = await createAdmissionSession(token, { sessionCode: code });
      addToast("success", `Academic year ${created.sessionCode} created.`);
      setSelectedSessionId(created.id);
      await refresh();
      await onAfterChange();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to create session.",
      );
    } finally {
      setWorking(false);
    }
  };

  const handleInitializeFromPrevious = async () => {
    if (!targetSession) return;
    setWorking(true);
    try {
      const result = await initializeAdmissionSession(token, targetSession.id, {
        copyClasses: true,
        copyFeeStructures: true,
      });
      const total = result.classesCreated + result.feeStructuresCreated;
      if (total > 0) {
        addToast(
          "success",
          `Carried forward ${result.classesCreated} class${result.classesCreated === 1 ? "" : "es"} and ${result.feeStructuresCreated} fee structure${result.feeStructuresCreated === 1 ? "" : "s"} from the previous session.`,
        );
      } else {
        addToast(
          "success",
          "No previous session to copy from. Use the manual setup below.",
        );
      }
      await refresh();
      await onAfterChange();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to initialize session.",
      );
    } finally {
      setWorking(false);
    }
  };

  const handleCommence = async () => {
    if (!targetSession) return;
    setWorking(true);
    try {
      await commenceAdmissionSession(token, targetSession.id);
      addToast("success", "Admissions are now open to parents.");
      await refresh();
      await onAfterChange();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to commence admissions.",
      );
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <Card className="border border-surface-border p-6">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading admission setup…
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-surface-border bg-gradient-to-br from-white via-white to-blue-50/40 p-5 sm:p-6">
      <div className="flex flex-col gap-1 border-b border-surface-border pb-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-brand-royal">
          Admission Setup Wizard
        </p>
        <h2 className="text-lg font-bold text-slate-900">
          Open admissions for a new academic year
        </h2>
        <p className="text-sm text-slate-500">
          Follow these steps in order. Parents won't see the application form
          until you've commenced admissions.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <ol className="mt-5 space-y-3">
        {STEP_ORDER.filter((s) => s !== "complete" || currentStep === "complete").map(
          (step, index, arr) => {
            const meta = STEP_META[step];
            const Icon = meta.icon;
            const stepIndex = STEP_ORDER.indexOf(step);
            const currentIndex = STEP_ORDER.indexOf(currentStep);
            const isDone = stepIndex < currentIndex;
            const isActive = step === currentStep;
            const isLast = index === arr.length - 1;

            return (
              <Fragment key={step}>
                <li
                  className={`relative flex gap-4 rounded-2xl border p-4 transition-shadow ${
                    isActive
                      ? "border-brand-royal/40 bg-white shadow-sm"
                      : isDone
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-surface-border bg-white/60"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : isActive
                          ? "bg-brand-royal text-white"
                          : "bg-slate-100 text-slate-500"
                    }`}
                    aria-hidden="true"
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} />
                    ) : isActive ? (
                      <Icon size={18} />
                    ) : (
                      <Circle size={18} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        Step {stepIndex + 1}: {meta.title}
                      </p>
                      {isDone && (
                        <Badge variant="success" className="text-[10px]">
                          Done
                        </Badge>
                      )}
                      {isActive && step !== "complete" && (
                        <Badge className="text-[10px]">Current</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {meta.subtitle}
                    </p>

                    {step === "academic_year" && isActive && (
                      <div className="mt-3 grid gap-3 rounded-xl border border-surface-border bg-white p-3 sm:grid-cols-[1.4fr_auto]">
                        <div>
                          <Label htmlFor="wizard-session-code">
                            New academic year code
                          </Label>
                          <Input
                            id="wizard-session-code"
                            value={newSessionCode}
                            onChange={(e) => setNewSessionCode(e.target.value)}
                            placeholder="2026-27"
                          />
                          <p className="mt-1 text-[11px] text-slate-500">
                            Format YYYY-YY. Example: 2026-27.
                          </p>
                        </div>
                        <div className="flex items-end">
                          <Button
                            className="w-full"
                            disabled={working}
                            onClick={() => void handleCreateSession()}
                          >
                            {working ? "Creating…" : "Create Year"}
                          </Button>
                        </div>
                        {sessions.length > 0 && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-semibold text-slate-700">
                              Or pick an existing year
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {sessions.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setSelectedSessionId(s.id)}
                                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                                    s.id === selectedSessionId
                                      ? "border-brand-royal bg-brand-royal/10 text-brand-royal"
                                      : "border-surface-border bg-white text-slate-600 hover:border-brand-royal/50"
                                  }`}
                                >
                                  {s.sessionCode} · {s.status}
                                  {s.isActive ? " ★" : ""}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {step === "classes" && isActive && targetSession && (
                      <div className="mt-3 rounded-xl border border-surface-border bg-white p-3">
                        <p className="text-xs text-slate-600">
                          Currently <strong>{sessionClasses.length}</strong>{" "}
                          class
                          {sessionClasses.length === 1 ? "" : "es"} for{" "}
                          {targetSession.sessionCode}.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            onClick={onJumpToCreateClass}
                          >
                            Add a Class
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => void handleInitializeFromPrevious()}
                            disabled={working}
                          >
                            {working
                              ? "Copying…"
                              : "Copy from Previous Year"}
                          </Button>
                        </div>
                        {sessionClasses.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {sessionClasses.map((c) => (
                              <span
                                key={c.id}
                                className="rounded-full border border-surface-border bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold text-slate-700"
                              >
                                {c.name}
                                {c.section ? ` — ${c.section}` : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {step === "fees" && isActive && targetSession && (
                      <div className="mt-3 rounded-xl border border-surface-border bg-white p-3">
                        <p className="text-xs text-slate-600">
                          {classesMissingFees.length} class
                          {classesMissingFees.length === 1 ? "" : "es"} still
                          need a fee structure.
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {classesMissingFees.map((c) => (
                            <li
                              key={c.id}
                              className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5"
                            >
                              <span className="text-xs font-semibold text-amber-900">
                                {c.name}
                                {c.section ? ` — ${c.section}` : ""}
                              </span>
                              <Button
                                variant="ghost"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => onJumpToFeeConfig(c.id)}
                              >
                                Configure
                                <ArrowRight size={12} className="ml-1" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                        {sessionFeeStructures.length > 0 && (
                          <p className="mt-2 text-[11px] text-emerald-700">
                            ✓ {sessionFeeStructures.length} class
                            {sessionFeeStructures.length === 1 ? "" : "es"}{" "}
                            already configured.
                          </p>
                        )}
                      </div>
                    )}

                    {step === "commence" && isActive && targetSession && (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-sm font-semibold text-emerald-900">
                          Ready to open admissions for{" "}
                          {targetSession.sessionCode}
                        </p>
                        <p className="mt-0.5 text-xs text-emerald-800">
                          {sessionClasses.length} class
                          {sessionClasses.length === 1 ? "" : "es"},{" "}
                          {sessionFeeStructures.length} fee structure
                          {sessionFeeStructures.length === 1 ? "" : "s"}{" "}
                          configured.
                        </p>
                        <Button
                          className="mt-3"
                          disabled={working}
                          onClick={() => void handleCommence()}
                        >
                          {working ? "Opening…" : "Commence Admissions"}
                        </Button>
                      </div>
                    )}

                    {step === "complete" && isActive && targetSession && (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-sm font-semibold text-emerald-900">
                          Admissions are open for {targetSession.sessionCode}.
                        </p>
                        <p className="mt-0.5 text-xs text-emerald-800">
                          Parents can apply at{" "}
                          <code className="rounded bg-white/60 px-1">
                            /admissions/apply
                          </code>
                          .
                        </p>
                        {readiness && (
                          <p className="mt-2 text-[11px] text-emerald-700">
                            {readiness.totalActiveClasses} class
                            {readiness.totalActiveClasses === 1 ? "" : "es"} ·{" "}
                            {readiness.classesWithFeeStructures} with fee
                            structures
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </li>
                {!isLast && (
                  <li
                    aria-hidden="true"
                    className="ml-[18px] h-3 w-px bg-surface-border"
                  />
                )}
              </Fragment>
            );
          },
        )}
      </ol>
    </Card>
  );
}
