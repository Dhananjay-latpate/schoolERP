import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { BulkActionType } from "../types";

interface BulkConfirmModalProps {
  bulkActionType: BulkActionType;
  actionableCount: number;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function BulkConfirmModal({
  bulkActionType,
  actionableCount,
  isLoading,
  onCancel,
  onConfirm,
}: BulkConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg p-5">
        <h3 className="text-base font-bold text-slate-900">Confirm Bulk Decision</h3>
        <p className="mt-2 text-sm text-slate-600">
          You are about to apply{" "}
          <span className="font-semibold text-slate-900">
            {bulkActionType === "on_hold" ? "On Hold" : "Needs Correction"}
          </span>{" "}
          to {actionableCount} application(s).
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            Confirm
          </Button>
        </div>
      </Card>
    </div>
  );
}
