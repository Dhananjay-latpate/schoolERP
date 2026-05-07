"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  BellRing,
  BookCheck,
  CalendarCheck2,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PrincipalApiError, getPrincipalDashboardStats } from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

type PrincipalModule = {
  key: string;
  title: string;
  description: string;
  href?: string;
  status: "active" | "coming_soon";
  icon: ComponentType<{ className?: string }>;
};

const MODULES: PrincipalModule[] = [
  {
    key: "admissions",
    title: "Admissions",
    description: "Review applications, manage decision queue, and process custom plans.",
    href: "/principal/admissions",
    status: "active",
    icon: FileCheck2,
  },
  {
    key: "attendance",
    title: "Attendance",
    description: "Monitor daily class attendance and student absence patterns.",
    status: "coming_soon",
    icon: CalendarCheck2,
  },
  {
    key: "fees_accounts",
    title: "Fees & Accounts",
    description: "Track payment collection, outstanding balances, and finance workflows.",
    status: "coming_soon",
    icon: Banknote,
  },
  {
    key: "exams",
    title: "Exams",
    description: "Manage exam schedules, approvals, and consolidated results.",
    status: "coming_soon",
    icon: GraduationCap,
  },
  {
    key: "academics",
    title: "Academic Oversight",
    description: "Review curriculum milestones and class-level progress indicators.",
    status: "coming_soon",
    icon: BookCheck,
  },
  {
    key: "announcements",
    title: "Announcements",
    description: "Broadcast institution notices and principal circulars.",
    status: "coming_soon",
    icon: BellRing,
  },
];

export default function PrincipalHomePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [overview, setOverview] = useState({
    totalApplications: 0,
    pendingReview: 0,
    underReview: 0,
    pendingCustomPlans: 0,
  });

  useEffect(() => {
    const existingToken = getPrincipalToken();
    if (!existingToken) {
      router.replace("/principal/login?next=%2Fprincipal");
      return;
    }
    setToken(existingToken);
    setIsCheckingSession(false);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    const loadOverview = async () => {
      setIsLoadingOverview(true);
      try {
        const stats = await getPrincipalDashboardStats(token);
        setOverview({
          totalApplications: stats.totalApplications,
          pendingReview: stats.pendingReview,
          underReview: stats.underReview,
          pendingCustomPlans: stats.pendingCustomPaymentPlans,
        });
      } catch (err) {
        if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) {
          clearPrincipalSession();
          router.replace("/principal/login?next=%2Fprincipal");
          return;
        }
      } finally {
        setIsLoadingOverview(false);
      }
    };
    void loadOverview();
  }, [router, token]);

  const activeCount = useMemo(
    () => MODULES.filter((module) => module.status === "active").length,
    [],
  );
  const upcomingCount = useMemo(
    () => MODULES.filter((module) => module.status === "coming_soon").length,
    [],
  );

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing principal workspace...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden p-0">
          <div className="brand-gradient p-6 text-white sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-white/20 p-2">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
                  Principal Command Center
                </p>
                <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Main Dashboard</h1>
                <p className="mt-2 max-w-3xl text-sm text-blue-100">
                  Central workspace for principal operations. Navigate across modules and
                  monitor institution workflows from one place.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-white/20 text-white">Active Modules: {activeCount}</Badge>
                <Badge className="bg-white/20 text-white">Planned Modules: {upcomingCount}</Badge>
              </div>
            </div>
          </div>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-surface-border p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">Total Applications</p>
            <p className="mt-2 text-2xl font-bold text-text-primary">
              {isLoadingOverview ? "..." : overview.totalApplications}
            </p>
          </Card>
          <Card className="border border-surface-border p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">Pending Review</p>
            <p className="mt-2 text-2xl font-bold text-brand-royal">
              {isLoadingOverview ? "..." : overview.pendingReview}
            </p>
          </Card>
          <Card className="border border-surface-border p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">Under Review</p>
            <p className="mt-2 text-2xl font-bold text-violet-700">
              {isLoadingOverview ? "..." : overview.underReview}
            </p>
          </Card>
          <Card className="border border-surface-border p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">Custom Plans Pending</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">
              {isLoadingOverview ? "..." : overview.pendingCustomPlans}
            </p>
          </Card>
        </section>

        <section>
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
              Module Navigation
            </p>
            <h2 className="mt-1 text-xl font-semibold text-text-primary">Choose a module</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Start with Admissions now. Other modules are staged for upcoming releases.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {MODULES.map((module) => {
              const Icon = module.icon;
              const isActive = module.status === "active";

              return (
                <Card key={module.key} className="border border-surface-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="inline-flex rounded-md bg-slate-100 p-2">
                      <Icon className="h-4 w-4 text-slate-700" />
                    </div>
                    <Badge variant={isActive ? "success" : "default"}>
                      {isActive ? "Live" : "Coming Soon"}
                    </Badge>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-text-primary">{module.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{module.description}</p>

                  <div className="mt-4">
                    {isActive && module.href ? (
                      <Link
                        href={module.href}
                        className="inline-flex items-center text-sm font-semibold text-brand-royal hover:underline"
                      >
                        Open module <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center text-sm font-medium text-text-muted">
                        Available in future roadmap
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <Card className="border border-surface-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-700" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Secure principal session</p>
                <p className="text-sm text-text-secondary">
                  Keep role-based access enforced while switching between modules.
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => router.push("/principal/admissions")}>
              Go to Admissions
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
