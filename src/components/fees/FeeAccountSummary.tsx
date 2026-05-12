import type { FeeAccount } from "@/lib/principalApi";
import { formatRupees } from "@/lib/money";

interface Props {
  feeAccount: NonNullable<FeeAccount>;
}

export function FeeAccountSummary({ feeAccount }: Props) {
  const items = [
    {
      label: "Total Charged",
      value: feeAccount.totalCharged,
      color: "text-gray-900",
    },
    {
      label: "Concessions",
      value: feeAccount.totalConcession,
      color: "text-emerald-700",
    },
    { label: "Paid", value: feeAccount.totalPaid, color: "text-blue-700" },
    {
      label: "Balance Due",
      value: feeAccount.totalDue,
      color:
        feeAccount.totalDue > 0
          ? "text-red-600 font-bold"
          : "text-green-600 font-bold",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-surface-border bg-surface-card p-4 text-center"
        >
          <p className="text-xs text-gray-500 mb-1">{item.label}</p>
          <p className={`text-lg ${item.color}`}>
            {/* amounts are already in RUPEES from getStudentAccount */}₹
            {item.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
      ))}
    </div>
  );
}
