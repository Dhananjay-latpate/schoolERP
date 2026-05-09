// ─── Enums & Literals ────────────────────────────────────────────────────────

export type FeeApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";
export type FeeApprovalType =
  | "custom_installment"
  | "concession"
  | "late_fee_waiver";

export type FeeConcessionType =
  | "sibling"
  | "staff_child"
  | "rte"
  | "ews"
  | "scholarship"
  | "merit"
  | "principal_discretion"
  | "other";

export type FeeHeadCategory =
  | "tuition"
  | "admission"
  | "exam"
  | "transport"
  | "hostel"
  | "activity"
  | "uniform"
  | "books"
  | "late_fee"
  | "concession"
  | "misc";

export type FeeAssignmentType =
  | "transport"
  | "hostel"
  | "exam"
  | "activity"
  | "misc";

export type LateFeeFrequency = "one_time" | "daily" | "monthly";

// ─── Installment Templates ───────────────────────────────────────────────────

export interface TemplateLine {
  sequence: number;
  name?: string;
  percentage: number;
  dueDate?: string;
  dueOffsetDays?: number; // alternative to fixed date
}

export interface FeeInstallmentTemplate {
  id: string;
  name: string;
  academicYear: string;
  lines: TemplateLine[];
  createdAt: string;
  updatedAt: string;
}

// ─── Masters ─────────────────────────────────────────────────────────────────

export interface FeeHead {
  id: string;
  code: string;
  name: string;
  category: FeeHeadCategory;
  isMandatory: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LateFeeRule {
  id: string;
  name: string;
  academicYear: string;
  graceDays: number;
  fixedAmount?: number | null;
  percentage?: number | null;
  maxAmount?: number | null;
  frequency: LateFeeFrequency;
  createdAt: string;
  updatedAt: string;
}

// ─── Transactions & Ledgers ──────────────────────────────────────────────────

export interface StudentFeeCharge {
  id: string;
  studentFeeAccountId: string;
  feeHeadId?: string;
  amountInPaise: string | number; // JSON may serialize BigInt as string
  dueDate?: string;
  status: "pending" | "partial" | "paid" | "cancelled";
  feeHead?: FeeHead;
}

export interface FeeLedgerEntry {
  id: string;
  studentFeeAccountId: string;
  entryType: "charge" | "payment" | "concession" | "waiver" | "refund";
  amountInPaise: string | number;
  balanceInPaise: string | number;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface FeeApprovalRequest {
  id: string;
  studentFeeAccountId: string;
  type: FeeApprovalType;
  status: FeeApprovalStatus;
  amountInPaise: string | number;
  reason?: string;
  requestedBy?: string;
  reviewedBy?: string;
  reviewerNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtendedStudentFeeAccount {
  id: string;
  applicationId: string;
  academicYear: string;
  totalChargedInPaise: string | number;
  totalConcessionInPaise: string | number;
  totalPaidInPaise: string | number;
  totalDueInPaise: string | number;
  charges: StudentFeeCharge[];
  ledger: FeeLedgerEntry[];
  approvalRequests: FeeApprovalRequest[];
}
