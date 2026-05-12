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

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  partial: "bg-yellow-100 text-yellow-700",
  unpaid: "bg-red-100 text-red-700",
  waived: "bg-gray-100 text-gray-500",
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
        <h3 className="text-sm font-semibold text-gray-700">Fee Charges</h3>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Charge
        </Button>
      </div>

      {charges.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          No charges assigned yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="py-2.5 pr-4 font-medium text-gray-800">
                    {charge.name}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 capitalize">
                    {charge.source}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    ₹
                    {charge.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-green-700">
                    ₹
                    {charge.paid.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-red-600">
                    ₹
                    {charge.due.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500">
                    {formatDate(charge.dueDate)}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[charge.status] ?? "bg-gray-100 text-gray-600"}`}
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
