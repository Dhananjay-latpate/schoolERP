import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
  variant?:
    | "default"
    | "success"
    | "warning"
    | "error"
    | "info"
    | "violet";
};

const VARIANT_CLASS: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "badge-muted",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  info: "badge-info",
  violet: "badge-violet",
};

export function Badge({
  children,
  className,
  variant = "default",
}: BadgeProps) {
  return (
    <span className={cn("badge-base", VARIANT_CLASS[variant], className)}>
      {children}
    </span>
  );
}
