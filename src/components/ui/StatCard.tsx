import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./Skeleton";

// A premium KPI tile — gradient wash, left accent strip, icon medallion,
// big value and an optional meta line. Used for dashboard metrics.
export type StatTone = "brand" | "emerald" | "amber" | "rose" | "neutral";

const ACCENT: Record<StatTone, string> = {
  brand: "var(--color-brand-royal)",
  emerald: "#1a7a45",
  amber: "#9a6212",
  rose: "#b3372f",
  neutral: "#6b6a64",
};

const VALUE_TONE: Record<StatTone, string> = {
  brand: "text-brand-royal",
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
  neutral: "text-text-primary",
};

const ICON_TONE: Record<StatTone, string> = {
  brand: "bg-brand-royal/10 text-brand-royal",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  neutral: "bg-surface-muted text-text-secondary",
};

type StatCardProps = {
  label: string;
  value: string;
  meta?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: StatTone;
  loading?: boolean;
};

export function StatCard({
  label,
  value,
  meta,
  icon: Icon,
  tone = "neutral",
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="kpi-tile kpi-tile-accent p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-28" />
        <Skeleton className="mt-2 h-3 w-16" />
      </div>
    );
  }
  return (
    <div
      className="kpi-tile kpi-tile-accent p-4"
      style={{ ["--kpi-accent" as string]: ACCENT[tone] }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md",
              ICON_TONE[tone],
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className={cn("mt-2 text-2xl font-bold tracking-tight", VALUE_TONE[tone])}>
        {value}
      </p>
      {meta && <p className="mt-1 text-xs text-text-muted">{meta}</p>}
    </div>
  );
}
