"use client";

import type { FeeAccountLedgerEntry } from "@/lib/principalApi";

interface Props {
  entries: FeeAccountLedgerEntry[];
}

const TYPE_COLORS: Record<string, string> = {
  payment: "text-status-success",
  charge: "text-status-error",
  concession: "text-status-success",
  late_fee: "text-status-warning",
  reversal: "text-text-secondary",
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
      <p className="py-8 text-center text-sm text-text-muted">
        No transactions recorded.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
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
              className="border-b border-surface-divider last:border-0"
            >
              <td className="py-2.5 pr-4 text-text-secondary">
                {formatDate(entry.postedAt)}
              </td>
              <td className="py-2.5 pr-4">
                <span
                  className={`capitalize font-medium ${TYPE_COLORS[entry.entryType] ?? "text-text-primary"}`}
                >
                  {entry.entryType.replace(/_/g, " ")}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-text-primary">
                {entry.description ?? "—"}
              </td>
              <td className="py-2.5 pr-4 text-text-secondary capitalize">
                {entry.method ?? "—"}
              </td>
              <td
                className={`py-2.5 pr-4 text-right font-medium ${TYPE_COLORS[entry.entryType] ?? "text-text-primary"}`}
              >
                {entry.debit > 0 ? "-" : "+"}
                ₹
                {(entry.debit || entry.credit).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td className="py-2.5 text-right text-text-primary">
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
