"use client";

import { Card } from "@/components/ui/Card";
import { STATUS_LABELS, type ApplicationStatus } from "@/lib/admissionWorkflow";

export type TimelineEntry = {
  id: string;
  status: string;
  changedAt: string;
  changedByName?: string | null;
  comments?: string | null;
};

interface StatusTimelineProps {
  entries: TimelineEntry[];
  className?: string;
}

const formatDateTime = (value: string): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const dotColor = (status: string): string => {
  if (status === "approved") return "bg-emerald-500";
  if (status === "rejected" || status === "cancelled") return "bg-rose-500";
  if (status === "on_hold") return "bg-amber-500";
  if (status === "needs_correction") return "bg-orange-500";
  if (status === "under_review") return "bg-violet-500";
  if (status === "payment_completed" || status === "payment_pending")
    return "bg-blue-500";
  return "bg-slate-400";
};

const labelFor = (status: string): string => {
  if (status in STATUS_LABELS) {
    return STATUS_LABELS[status as ApplicationStatus];
  }
  return status.replace(/_/g, " ");
};

export function StatusTimeline({ entries, className }: StatusTimelineProps) {
  // Most recent first → oldest last; render top to bottom in chronological
  // order so the eye reads the story forward.
  const ordered = [...entries].sort(
    (a, b) =>
      new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
  );

  if (ordered.length === 0) {
    return (
      <Card className={`border border-surface-border p-4 ${className ?? ""}`}>
        <p className="text-sm text-slate-500">No status changes yet.</p>
      </Card>
    );
  }

  return (
    <Card className={`border border-surface-border p-4 sm:p-5 ${className ?? ""}`}>
      <h3 className="text-sm font-bold uppercase tracking-wider text-brand-royal">
        Status Timeline
      </h3>
      <ol className="relative mt-4 space-y-4 border-l-2 border-slate-200 pl-5">
        {ordered.map((entry) => (
          <li key={entry.id} className="relative">
            <span
              className={`absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-white ${dotColor(entry.status)}`}
              aria-hidden="true"
            />
            <p className="text-sm font-semibold capitalize text-slate-900">
              {labelFor(entry.status)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatDateTime(entry.changedAt)}
              {entry.changedByName ? ` · by ${entry.changedByName}` : ""}
            </p>
            {entry.comments ? (
              <p className="mt-1 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {entry.comments}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}
