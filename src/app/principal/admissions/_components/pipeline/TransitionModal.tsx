import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import type { TransitionModalData } from "../types";

interface TransitionModalProps {
  modal: TransitionModalData;
  comments: string;
  correctionDetails: string;
  isLoading: boolean;
  onCommentsChange: (value: string) => void;
  onCorrectionDetailsChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TransitionModal({
  modal,
  comments,
  correctionDetails,
  isLoading,
  onCommentsChange,
  onCorrectionDetailsChange,
  onCancel,
  onConfirm,
}: TransitionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md p-5">
        <h3 className="text-base font-bold text-slate-900">{modal.label}</h3>
        <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
          <p className="font-semibold text-slate-800">{modal.app.applicationId}</p>
          <p className="text-slate-500">
            {modal.app.studentFirstName} {modal.app.studentLastName}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Current stage:{" "}
            <span className="font-semibold text-slate-600">
              {modal.app.status.replace(/_/g, " ")}
            </span>
            {" → "}
            <span className="font-semibold text-slate-800">
              {modal.toStatus.replace(/_/g, " ")}
            </span>
          </p>
        </div>

        <div className="mt-3">
          <Label>
            Comments
            {modal.toStatus !== "under_review" || modal.needsCorrection
              ? " (required)"
              : " (optional)"}
          </Label>
          <Textarea
            value={comments}
            onChange={(e) => onCommentsChange(e.target.value)}
            placeholder="Explain this decision…"
            className="min-h-[80px]"
            autoFocus
          />
        </div>

        {modal.needsCorrection && (
          <div className="mt-3">
            <Label>Correction Details (required)</Label>
            <Textarea
              value={correctionDetails}
              onChange={(e) => onCorrectionDetailsChange(e.target.value)}
              placeholder="What exactly needs to be corrected?"
              className="min-h-[80px]"
            />
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Updating…" : "Confirm"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
