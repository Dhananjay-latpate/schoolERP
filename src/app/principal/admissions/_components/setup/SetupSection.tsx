"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  GraduationCap,
  IndianRupee,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  commenceAdmissionSession,
  listAdmissionSessions,
  listClasses,
  listFeeStructures,
  PrincipalApiError,
  type PrincipalAdmissionSession,
  type PrincipalClass,
  type PrincipalFeeStructure,
} from "@/lib/principalApi";
import { clearPrincipalSession } from "@/lib/principalSession";
import { computeSessionReadiness } from "./setupShared";
import { SetupReadinessBanner } from "./SetupReadinessBanner";
import { SessionsPanel } from "./SessionsPanel";
import { ClassesPanel } from "./ClassesPanel";
import { FeeStructuresPanel } from "./FeeStructuresPanel";

interface SetupSectionProps {
  token: string;
  refreshSignal: number;
  addToast: (type: "success" | "error", message: string) => void;
  onRefreshDashboard: () => Promise<void>;
}

type SubTab = "sessions" | "classes" | "fees";

export function SetupSection({
  token,
  refreshSignal,
  addToast,
  onRefreshDashboard,
}: SetupSectionProps) {
  const router = useRouter();

  const [subTab, setSubTab] = useState<SubTab>("sessions");
  const [sessions, setSessions] = useState<PrincipalAdmissionSession[]>([]);
  const [classes, setClasses] = useState<PrincipalClass[]>([]);
  const [feeStructures, setFeeStructures] = useState<PrincipalFeeStructure[]>(
    [],
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [focusClassId, setFocusClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionList, classList, feeList] = await Promise.all([
        listAdmissionSessions(token),
        listClasses(token, undefined, true),
        listFeeStructures(token),
      ]);
      setSessions(sessionList);
      setClasses(classList);
      setFeeStructures(feeList);
    } catch (err) {
      if (
        err instanceof PrincipalApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        clearPrincipalSession();
        router.replace("/principal/login?next=%2Fprincipal%2Fadmissions");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load setup.");
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [token, router]);

  useEffect(() => {
    if (token) void load();
  }, [token, refreshSignal, load]);

  // Keep a valid working session selected as the session list changes.
  useEffect(() => {
    if (sessions.length === 0) {
      setSelectedSessionId(null);
      return;
    }
    setSelectedSessionId((prev) => {
      if (prev && sessions.some((s) => s.id === prev)) return prev;
      const fallback =
        sessions.find((s) => s.isActive) ??
        sessions.find((s) => s.status === "ready") ??
        sessions[0];
      return fallback.id;
    });
  }, [sessions]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const readiness = useMemo(
    () =>
      computeSessionReadiness(
        selectedSession?.sessionCode,
        classes,
        feeStructures,
      ),
    [selectedSession, classes, feeStructures],
  );

  const handleMutated = useCallback(async () => {
    await onRefreshDashboard();
  }, [onRefreshDashboard]);

  const tabs = useMemo(
    () => [
      {
        id: "sessions" as const,
        label: "Sessions",
        icon: CalendarRange,
        count: sessions.length,
      },
      {
        id: "classes" as const,
        label: "Classes",
        icon: GraduationCap,
        count: readiness.classCount,
      },
      {
        id: "fees" as const,
        label: "Fees",
        icon: IndianRupee,
        count: readiness.classesWithFees,
      },
    ],
    [sessions.length, readiness.classCount, readiness.classesWithFees],
  );

  if (loading && !hasLoadedOnce) {
    return (
      <Card className="border border-surface-border p-6">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading admission setup…
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <SetupReadinessBanner
        sessions={sessions}
        selectedSession={selectedSession}
        onSelectSession={setSelectedSessionId}
        readiness={readiness}
        onGoToSessions={() => setSubTab("sessions")}
        onGoToClasses={() => setSubTab("classes")}
        onGoToFees={() => setSubTab("fees")}
        onCommence={async () => {
          if (!selectedSession) return;
          try {
            await commenceAdmissionSession(token, selectedSession.id);
            addToast("success", "Admissions are now open.");
            await handleMutated();
          } catch (err) {
            addToast(
              "error",
              err instanceof Error ? err.message : "Failed to open admissions.",
            );
          }
        }}
      />

      {/* Sub-tab nav */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-brand-royal bg-brand-royal text-white"
                  : "border-surface-border bg-white text-slate-700 hover:border-brand-royal/40"
              }`}
            >
              <Icon size={15} />
              {tab.label}
              <span
                className={`rounded-full px-1.5 text-xs font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {subTab === "sessions" && (
        <SessionsPanel
          token={token}
          sessions={sessions}
          classes={classes}
          feeStructures={feeStructures}
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
          addToast={addToast}
          onMutated={handleMutated}
        />
      )}

      {subTab === "classes" && (
        <ClassesPanel
          token={token}
          session={selectedSession}
          classes={classes}
          feeStructures={feeStructures}
          addToast={addToast}
          onMutated={handleMutated}
          onGoToSessions={() => setSubTab("sessions")}
          onConfigureFees={(classId) => {
            setFocusClassId(classId);
            setSubTab("fees");
          }}
        />
      )}

      {subTab === "fees" && (
        <FeeStructuresPanel
          token={token}
          session={selectedSession}
          classes={classes}
          feeStructures={feeStructures}
          addToast={addToast}
          onMutated={handleMutated}
          onGoToSessions={() => setSubTab("sessions")}
          focusClassId={focusClassId}
          onFocusHandled={() => setFocusClassId(null)}
        />
      )}
    </div>
  );
}
