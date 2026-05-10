import { BarChart3, ClipboardCheck, Files, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PrincipalDashboardStats } from "@/lib/principalApi";
import type { SectionId } from "./types";
import { formatCurrency } from "./utils";

interface SidebarProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
  stats: PrincipalDashboardStats;
  isLoadingStats: boolean;
  pipelineBadge: number;
  pendingCustomPlansCount: number;
  auditLogsCount: number;
  onSignOut: () => void;
}

export function Sidebar({
  activeSection,
  onSectionChange,
  stats,
  isLoadingStats,
  pipelineBadge,
  pendingCustomPlansCount,
  auditLogsCount,
  onSignOut,
}: SidebarProps) {
  const navItems = [
    { id: "pipeline" as const, label: "Pipeline", icon: Files, badge: pipelineBadge },
    { id: "custom_plans" as const, label: "Custom Plans", icon: BarChart3, badge: pendingCustomPlansCount },
    { id: "settings" as const, label: "Setup", icon: Settings2, badge: 0 },
    { id: "audit" as const, label: "Audit", icon: ClipboardCheck, badge: auditLogsCount },
  ];

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
      <div className="border-b border-slate-100 px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-royal">
          Principal
        </p>
        <h1 className="mt-1 text-base font-bold text-slate-900">Admissions</h1>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
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
                  className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    isActive ? "bg-brand-royal text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3 space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Collected</span>
          <span className="font-semibold text-emerald-700">
            {isLoadingStats ? "..." : formatCurrency(stats.totalFeeCollected)}
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
          onClick={onSignOut}
        >
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
