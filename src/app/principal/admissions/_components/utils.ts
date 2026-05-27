export function paymentBadgeVariant(
  paymentStatus: string | undefined,
): "default" | "success" | "warning" | "error" {
  if (paymentStatus === "completed") return "success";
  if (paymentStatus === "failed") return "error";
  if (paymentStatus === "pending") return "warning";
  return "default";
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isReviewableStatus(status: string): boolean {
  return ["payment_pending", "payment_completed", "under_review", "on_hold", "needs_correction"].includes(status);
}

export function csvEscape(value: string | number | null | undefined): string {
  const stringified = value === null || value === undefined ? "" : String(value);
  return `"${stringified.replace(/"/g, '""')}"`;
}
