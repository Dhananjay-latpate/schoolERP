import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SectionId } from "./types";

interface NavItem {
  id: SectionId;
  label: string;
  badge: number;
}

interface HeaderProps {
  activeSection: SectionId;
  navItems: NavItem[];
  onSectionChange: (section: SectionId) => void;
  isLoading: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
}

const SECTION_TITLES: Record<SectionId, string> = {
  pipeline: "Admission Pipeline",
  custom_plans: "Custom Payment Plans",
  settings: "Setup — Classes & Fees",
  audit: "Audit Logs",
};

export function Header({
  activeSection,
  navItems,
  onSectionChange,
  isLoading,
  onRefresh,
  onSignOut,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="lg:hidden">
            <p className="text-sm font-bold text-slate-900">Admissions</p>
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold text-slate-900">
              {SECTION_TITLES[activeSection]}
            </p>
          </div>
          <nav
            className="hidden lg:flex lg:items-center lg:gap-1"
            aria-label="Admissions sections"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  activeSection === item.id
                    ? "border-brand-royal bg-brand-royal text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-royal/40 hover:text-brand-royal"
                }`}
                aria-current={activeSection === item.id ? "page" : undefined}
              >
                {item.label}
                {item.badge > 0 ? (
                  <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px] text-white">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-8 px-3 text-xs"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs lg:hidden"
            onClick={onSignOut}
          >
            Sign Out
          </Button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
              activeSection === item.id
                ? "border-brand-royal bg-brand-royal text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {item.label}
            {item.badge > 0 ? ` (${item.badge})` : ""}
          </button>
        ))}
      </div>
    </header>
  );
}
