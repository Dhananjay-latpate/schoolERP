import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

// A composed empty/zero state — icon medallion, title, hint, optional action.
// Replaces bare "No data" text for a more considered, premium feel.
type EmptyStateProps = {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "neutral" | "success";
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        "animate-fade-in",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full",
            tone === "success"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-surface-muted text-text-muted",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
