import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { PrincipalApplication } from "@/lib/principalApi";
import type { BulkActionType } from "../types";

interface AuditDrawerProps {
  bulkActionType: BulkActionType;
  actionableSelections: PrincipalApplication[];
  auditReason: string;
  isLoading: boolean;
  onAuditReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function AuditDrawer({
  bulkActionType,
  actionableSelections,
  auditReason,
  isLoading,
  onAuditReasonChange,
  onClose,
  onConfirm,
}: AuditDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Bulk Audit Preview</h3>
            <p className="mt-0.5 text-sm text-slate-500">Review exact impact before applying.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">
            Action: {bulkActionType.replace("_", " ")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Actionable: {actionableSelections.length}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {actionableSelections.map((app) => (
            <div
              key={app.id}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <p className="font-semibold text-slate-900">{app.applicationId}</p>
              <p className="text-slate-500">
                {app.studentFirstName} {app.studentLastName}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {app.status} →{" "}
                {bulkActionType === "needs_correction" ? "needs_correction" : bulkActionType}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Audit Reason (required)
          </label>
          <Textarea
            value={auditReason}
            onChange={(e) => onAuditReasonChange(e.target.value)}
            placeholder="Explain why this bulk decision is being applied."
            className="min-h-[90px]"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || actionableSelections.length === 0}
          >
            {isLoading ? "Applying…" : "Confirm with Audit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
