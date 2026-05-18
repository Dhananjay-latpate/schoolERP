"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AddChargeModal } from "./AddChargeModal";
import type { FeeAccountCharge } from "@/lib/principalApi";

interface Props {
  charges: FeeAccountCharge[];
  accountId: string;
  token: string;
  onCharged: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  paid: "badge-success",
  partial: "badge-warning",
  unpaid: "badge-error",
  waived: "badge-muted",
};

function formatDate(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function FeeChargesTab({ charges, accountId, token, onCharged }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Fee Charges</h3>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Charge
        </Button>
      </div>

      {charges.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          No charges assigned yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Source</th>
                <th className="pb-2 pr-4 text-right">Amount</th>
                <th className="pb-2 pr-4 text-right">Paid</th>
                <th className="pb-2 pr-4 text-right">Due</th>
                <th className="pb-2 pr-4">Due Date</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((charge) => (
                <tr
                  key={charge.id}
                  className="border-b border-surface-divider last:border-0"
                >
                  <td className="py-2.5 pr-4 font-medium text-text-primary">
                    {charge.name}
                  </td>
                  <td className="py-2.5 pr-4 text-text-secondary capitalize">
                    {charge.source}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    ₹
                    {charge.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-status-success">
                    ₹
                    {charge.paid.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-status-error">
                    ₹
                    {charge.due.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2.5 pr-4 text-text-secondary">
                    {formatDate(charge.dueDate)}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`badge-base capitalize ${STATUS_BADGE[charge.status] ?? "badge-muted"}`}
                    >
                      {charge.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddChargeModal
          accountId={accountId}
          token={token}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onCharged();
          }}
        />
      )}
    </div>
  );
}
