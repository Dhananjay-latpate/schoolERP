"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getPrincipalDashboardStats,
  listClasses,
  listPrincipalApplications,
  PrincipalApiError,
  type PrincipalApplication,
  type PrincipalClass,
  type PrincipalDashboardStats,
} from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

import { ToastContainer } from "./_components/ToastContainer";
import { Sidebar } from "./_components/Sidebar";
import { Header } from "./_components/Header";
import { PipelineSection } from "./_components/pipeline/PipelineSection";
import { CustomPlansSection } from "./_components/custom-plans/CustomPlansSection";
import { SetupSection } from "./_components/setup/SetupSection";
import { AuditSection } from "./_components/audit/AuditSection";
import {
  type AuditLogEntry,
  type SectionId,
  type ToastItem,
  DEFAULT_STATS,
  TOAST_TTL_MS,
} from "./_components/types";
import { BarChart3, ClipboardCheck, Files, Settings2 } from "lucide-react";

const VALID_SECTIONS: SectionId[] = [
  "pipeline",
  "custom_plans",
  "setup",
  "audit",
];

function PrincipalAdmissionsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const initialSection = (() => {
    const fromUrl = searchParams.get("section");
    return fromUrl && VALID_SECTIONS.includes(fromUrl as SectionId)
      ? (fromUrl as SectionId)
      : "pipeline";
  })();
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);
  const [refreshSignal, setRefreshSignal] = useState(0);

  // Keep the URL ?section= param in sync when the user clicks tabs / sidebar
  // entries so deep-links remain stable and refresh works.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("section") === activeSection) return;
    params.set("section", activeSection);
    router.replace(`/principal/admissions?${params.toString()}`, {
      scroll: false,
    });
  }, [activeSection, router]);

  const [stats, setStats] = useState<PrincipalDashboardStats>(DEFAULT_STATS);
  const [applications, setApplications] = useState<PrincipalApplication[]>([]);
  const [classes, setClasses] = useState<PrincipalClass[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [pendingCustomPlansCount, setPendingCustomPlansCount] = useState(0);

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
      try {
        const [statsResult, appResult, classResult] = await Promise.all([
          getPrincipalDashboardStats(authToken),
          listPrincipalApplications(authToken, { status: "all", page: 1, limit: 200 }),
          listClasses(authToken),
        ]);
        setStats(statsResult);
        setApplications(appResult.data);
        setClasses(classResult);
      } catch (err) {
        if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) {
          clearPrincipalSession();
          router.replace("/principal/login?next=%2Fprincipal%2Fadmissions");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setIsLoadingStats(false);
        setIsLoadingApps(false);
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
  }, [loadDashboard, router]);

  const handleRefresh = useCallback(async () => {
    if (!token) return;
    await loadDashboard(token);
    setRefreshSignal((s) => s + 1);
  }, [token, loadDashboard]);

  const handleSignOut = () => {
    clearPrincipalSession();
    router.replace("/principal/login");
  };

  const navItems = [
    { id: "pipeline" as const, label: "Pipeline", icon: Files, badge: stats.pendingReview + stats.underReview },
    { id: "custom_plans" as const, label: "Custom Plans", icon: BarChart3, badge: pendingCustomPlansCount },
    { id: "setup" as const, label: "Setup", icon: Settings2, badge: 0 },
    { id: "audit" as const, label: "Audit", icon: ClipboardCheck, badge: auditLogs.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer toasts={toasts} />

      <div className="flex min-h-screen">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          stats={stats}
          isLoadingStats={isLoadingStats}
          pipelineBadge={stats.pendingReview + stats.underReview}
          pendingCustomPlansCount={pendingCustomPlansCount}
          auditLogsCount={auditLogs.length}
          onSignOut={handleSignOut}
        />

        <div className="w-full lg:pl-60">
          <Header
            activeSection={activeSection}
            navItems={navItems}
            onSectionChange={setActiveSection}
            isLoading={isLoadingStats || isLoadingApps}
            onRefresh={() => void handleRefresh()}
            onSignOut={handleSignOut}
          />

          <main className="px-4 py-5 sm:px-6">
            {error && (
              <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-semibold text-rose-700">Unable to load dashboard</p>
                <p className="mt-1 text-sm text-rose-600">{error}</p>
              </div>
            )}

            {activeSection === "pipeline" && (
              <PipelineSection
                token={token}
                applications={applications}
                classes={classes}
                isLoadingStats={isLoadingStats}
                isLoadingApps={isLoadingApps}
                addToast={addToast}
                onRefresh={handleRefresh}
                onAuditEntry={(entry) => setAuditLogs((prev) => [entry, ...prev].slice(0, 12))}
                onApplicationsChange={setApplications}
              />
            )}

            {activeSection === "custom_plans" && (
              <CustomPlansSection
                token={token}
                refreshSignal={refreshSignal}
                addToast={addToast}
                onCountChange={setPendingCustomPlansCount}
              />
            )}

            {activeSection === "setup" && (
              <SetupSection
                token={token}
                refreshSignal={refreshSignal}
                addToast={addToast}
                onRefreshDashboard={handleRefresh}
              />
            )}

            {activeSection === "audit" && <AuditSection auditLogs={auditLogs} />}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function PrincipalAdmissionsDashboardPage() {
  return (
    <Suspense fallback={null}>
      <PrincipalAdmissionsDashboard />
    </Suspense>
  );
}
