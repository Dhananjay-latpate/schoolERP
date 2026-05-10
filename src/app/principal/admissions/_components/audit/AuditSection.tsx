import { Card } from "@/components/ui/Card";
import type { AuditLogEntry } from "../types";

interface AuditSectionProps {
  auditLogs: AuditLogEntry[];
}

export function AuditSection({ auditLogs }: AuditSectionProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
      <Card className="border border-surface-border p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-900">Recent Action Logs</h2>
        <p className="mt-0.5 text-sm text-slate-500">Session-local bulk decision trail.</p>
        <div className="mt-4 space-y-2">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-slate-500">No audit entries yet.</p>
          ) : (
            auditLogs.map((entry) => (
              <div
                key={entry.id}
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {entry.action.replace("_", " ")} ({entry.successCount} ok / {entry.failureCount} failed)
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(entry.timestamp).toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs text-slate-500">Reason: {entry.reason}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="border border-surface-border p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-900">Guidance</h2>
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-semibold">Before confirming bulk actions:</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Only reviewable rows will be affected.</li>
            <li>Write clear reason and correction notes.</li>
            <li>Prefer smaller batches for sensitive actions.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
