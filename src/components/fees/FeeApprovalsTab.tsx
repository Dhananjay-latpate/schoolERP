"use client";

import { useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { FeeApprovalRequest } from "@/types/fees";

interface Props {
  approvals: FeeApprovalRequest[];
}

const STATUS_ICONS = {
  pending: <Clock className="h-4 w-4 text-status-warning" />,
  approved: <CheckCircle2 className="h-4 w-4 text-status-success" />,
  rejected: <XCircle className="h-4 w-4 text-status-error" />,
  cancelled: <XCircle className="h-4 w-4 text-text-muted" />,
};

const TYPE_LABELS: Record<string, string> = {
  custom_installment: "Custom Payment Plan",
  concession: "Fee Concession",
  late_fee_waiver: "Late Fee Waiver",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function FeeApprovalsTab({ approvals }: Props) {
  if (approvals.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        No approval requests found.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {approvals.map((approval) => (
        <div
          key={approval.id}
          className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-card p-4"
        >
          <div className="mt-0.5 shrink-0">
            {STATUS_ICONS[approval.status] ?? STATUS_ICONS.pending}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xs font-semibold text-text-secondary">
                {TYPE_LABELS[approval.type] ?? approval.type}
              </span>
              <span
                className={`badge-base capitalize ${
                  approval.status === "approved"
                    ? "badge-success"
                    : approval.status === "rejected"
                      ? "badge-error"
                      : "badge-warning"
                }`}
              >
                {approval.status}
              </span>
            </div>
            <p className="text-sm text-text-primary">{approval.reason}</p>
            {approval.reviewerNotes && (
              <p className="mt-1 text-xs text-text-secondary italic">
                Note: {approval.reviewerNotes}
              </p>
            )}
            <p className="mt-1 text-xs text-text-muted">
              {formatDate(approval.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
