"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import type { PrincipalAdmissionSession } from "@/lib/principalApi";
import { SESSION_STATUS_META, type SessionReadiness } from "./setupShared";

interface SetupReadinessBannerProps {
  sessions: PrincipalAdmissionSession[];
  selectedSession: PrincipalAdmissionSession | null;
  onSelectSession: (id: string) => void;
  readiness: SessionReadiness;
  onGoToSessions: () => void;
  onGoToClasses: () => void;
  onGoToFees: () => void;
  onCommence?: () => Promise<void>;
}

export function SetupReadinessBanner({
  sessions,
  selectedSession,
  onSelectSession,
  readiness,
  onGoToSessions,
  onGoToClasses,
  onGoToFees,
  onCommence,
}: SetupReadinessBannerProps) {
  // No session at all — the entry point of the whole admission setup.
  if (sessions.length === 0) {
    return (
      <Card className="border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                No admission session exists yet
              </p>
              <p className="mt-0.5 text-sm text-amber-800">
                Until you create a session and define its classes and fees,
                parents cannot apply and students have no class or fee details
                to pay against.
              </p>
            </div>
          </div>
          <Button onClick={onGoToSessions}>
            Create a Session <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
      </Card>
    );
  }

  if (!selectedSession) return null;

  const meta = SESSION_STATUS_META[selectedSession.status];
  const isOpen = selectedSession.status === "commenced";
  const { classCount, classesWithFees, classesMissingFees, canCommence } =
    readiness;

  const steps = [
    {
      label: "Session created",
      done: true,
    },
    {
      label: `Classes added (${classCount})`,
      done: classCount > 0,
    },
    {
      label: `Fees configured (${classesWithFees}/${classCount})`,
      done: classCount > 0 && classesMissingFees.length === 0,
    },
    {
      label: "Admissions opened",
      done: isOpen,
    },
  ];

  const tone = isOpen
    ? "border-emerald-200 bg-emerald-50"
    : canCommence
      ? "border-blue-200 bg-blue-50"
      : "border-amber-200 bg-amber-50";

  return (
    <Card className={`border p-4 sm:p-5 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Working session
            </p>
            <Select
              value={selectedSession.id}
              onChange={(e) => onSelectSession(e.target.value)}
              className="mt-1 h-9 w-44 bg-white"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sessionCode}
                  {s.isActive ? " (active)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>

        {isOpen ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 size={16} />
            Admissions are open — parents can apply now.
          </div>
        ) : canCommence ? (
          <Button onClick={() => void onCommence?.()}>
            <Rocket size={14} className="mr-1.5" /> Ready — Open Admissions
          </Button>
        ) : null}
      </div>

      {/* Progress steps */}
      <ol className="mt-4 grid gap-2 sm:grid-cols-4">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
              step.done
                ? "border-emerald-200 bg-white text-emerald-800"
                : "border-slate-200 bg-white/70 text-slate-500"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                step.done
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {step.done ? <CheckCircle2 size={13} /> : index + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ol>

      {/* What's blocking */}
      {!isOpen && !canCommence && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-amber-900">
          <AlertTriangle size={14} className="text-amber-600" />
          {classCount === 0 ? (
            <>
              <span>This session has no classes yet.</span>
              <button
                type="button"
                onClick={onGoToClasses}
                className="font-semibold text-amber-900 underline underline-offset-2"
              >
                Add classes
              </button>
            </>
          ) : (
            <>
              <span>
                {classesMissingFees.length} class(es) still need a fee
                structure:{" "}
                {classesMissingFees
                  .map((c) => (c.section ? `${c.name}-${c.section}` : c.name))
                  .join(", ")}
              </span>
              <button
                type="button"
                onClick={onGoToFees}
                className="font-semibold text-amber-900 underline underline-offset-2"
              >
                Configure fees
              </button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
