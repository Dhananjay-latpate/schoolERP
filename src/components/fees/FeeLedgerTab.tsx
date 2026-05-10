"use client";

import type { FeeAccountLedgerEntry } from "@/lib/principalApi";

interface Props {
  entries: FeeAccountLedgerEntry[];
}

const TYPE_COLORS: Record<string, string> = {
  payment: "text-green-700",
  charge: "text-red-600",
  concession: "text-emerald-600",
  late_fee: "text-orange-600",
  reversal: "text-gray-500",
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function FeeLedgerTab({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        No transactions recorded.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 pr-4">Type</th>
            <th className="pb-2 pr-4">Description</th>
            <th className="pb-2 pr-4">Method</th>
            <th className="pb-2 pr-4 text-right">Amount</th>
            <th className="pb-2 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-gray-100 last:border-0"
            >
              <td className="py-2.5 pr-4 text-gray-500">
                {formatDate(entry.postedAt)}
              </td>
              <td className="py-2.5 pr-4">
                <span
                  className={`capitalize font-medium ${TYPE_COLORS[entry.entryType] ?? "text-gray-700"}`}
                >
                  {entry.entryType.replace(/_/g, " ")}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-gray-700">
                {entry.description ?? "—"}
              </td>
              <td className="py-2.5 pr-4 text-gray-500 capitalize">
                {entry.method ?? "—"}
              </td>
              <td
                className={`py-2.5 pr-4 text-right font-medium ${TYPE_COLORS[entry.entryType] ?? "text-gray-700"}`}
              >
                {entry.debit > 0 ? "-" : "+"}
                ₹
                {(entry.debit || entry.credit).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td className="py-2.5 text-right text-gray-700">
                {entry.runningBalance != null
                  ? `₹${entry.runningBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
