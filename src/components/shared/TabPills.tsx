"use client";

import { cn } from "@/lib/utils";

/**
 * TabPills — a horizontal pill row for filtering or switching views. Each
 * tab can optionally carry a count badge. Click handlers are owned by the
 * caller so this stays a presentational component.
 */
type Tab = {
  key: string;
  label: string;
  count?: number;
};

type TabPillsProps = {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
};

export function TabPills({ tabs, active, onChange, className }: TabPillsProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 overflow-x-auto rounded-full border border-surface-border bg-surface-card p-1",
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-text-primary text-white"
                : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
            )}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span
                className={cn(
                  "ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-surface-muted text-text-muted",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
