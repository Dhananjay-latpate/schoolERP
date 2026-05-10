"use client";

import { useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { FeeApprovalRequest } from "@/types/fees";

interface Props {
  approvals: FeeApprovalRequest[];
}

const STATUS_ICONS = {
  pending: <Clock className="h-4 w-4 text-amber-500" />,
  approved: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
  cancelled: <XCircle className="h-4 w-4 text-gray-400" />,
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
      <p className="py-8 text-center text-sm text-gray-400">
        No approval requests found.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {approvals.map((approval) => (
        <div
          key={approval.id}
          className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="mt-0.5 shrink-0">
            {STATUS_ICONS[approval.status] ?? STATUS_ICONS.pending}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xs font-semibold text-gray-600">
                {TYPE_LABELS[approval.type] ?? approval.type}
              </span>
              <span
                className={`capitalize text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  approval.status === "approved"
                    ? "bg-green-100 text-green-700"
                    : approval.status === "rejected"
                      ? "bg-red-100 text-red-600"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {approval.status}
              </span>
            </div>
            <p className="text-sm text-gray-800">{approval.reason}</p>
            {approval.reviewerNotes && (
              <p className="mt-1 text-xs text-gray-500 italic">
                Note: {approval.reviewerNotes}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {formatDate(approval.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
