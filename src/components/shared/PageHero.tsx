import type { ComponentType, ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

/**
 * PageHero — the dark teal "brand-gradient" panel used at the top of every
 * principal module page. Mirrors the visual language established by the
 * Principal Command Center landing page (`/principal`).
 *
 * Example:
 *   <PageHero
 *     icon={CalendarCheck2}
 *     eyebrow="Attendance"
 *     title="Daily attendance"
 *     description="Mark, monitor and report classroom attendance across grades."
 *     badges={[{ label: "Today · May 16" }, { label: "48 classes" }]}
 *     actions={<Button variant="pay">Take attendance</Button>}
 *   />
 */
type Badge = { label: string; tone?: "default" | "live" };

type PageHeroProps = {
  icon?: ComponentType<{ className?: string }>;
  eyebrow?: string;
  title: string;
  description?: string;
  badges?: Badge[];
  actions?: ReactNode;
};

export function PageHero({
  icon: Icon,
  eyebrow,
  title,
  description,
  badges,
  actions,
}: PageHeroProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="brand-gradient p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            {Icon && (
              <div className="inline-flex rounded-full bg-surface-card/20 p-2">
                <Icon className="h-5 w-5" />
              </div>
            )}
            {eyebrow && (
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
            {description && (
              <p className="mt-2 text-sm text-white/70">{description}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-3">
            {badges && badges.length > 0 && (
              <div className="flex flex-wrap justify-end gap-2">
                {badges.map((b) => (
                  <span
                    key={b.label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-card/20 px-2.5 py-1 text-xs font-medium text-white"
                  >
                    {b.tone === "live" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}
                    {b.label}
                  </span>
                ))}
              </div>
            )}
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        </div>
      </div>
    </Card>
  );
}
