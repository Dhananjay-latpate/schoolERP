
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type AdmissionStatus =
  | "draft"
  | "submitted"
  | "payment_pending"
  | "payment_completed"
  | "under_review"
  | "approved"
  | "admission_confirmed"
  | "rejected";

export type AdmissionSubmission = {
  applicationId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: "male" | "female" | "other";
  /** Optional for draft saves — backend skips date conversion when absent */
  dateOfBirth?: string;
  /** Optional for draft saves — backend allows no class on partial drafts */
  classAdmitted?: string;
  fatherName: string;
  motherName: string;
  address: string;
  emergencyContact: string;
  placeOfBirth?: string;
  nationality?: string;
  religion?: string;
  caste?: string;
  subCaste?: string;
  adharNumber?: string;
  motherTongue?: string;
  paymentMethod?: "full_payment" | "installment" | "custom_payment";
  customPaymentAmount?: number;
  customPaymentReason?: string;
  status?: AdmissionStatus;
};

export type AdmissionRecord = AdmissionSubmission & {
  applicationId: string;
  status: AdmissionStatus;
  createdAt?: string;
  updatedAt?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || "Request failed");
  }

  if (body.data !== undefined) {
    return body.data;
  }

  const topLevelPayload = { ...body } as Record<string, unknown>;
  delete topLevelPayload.success;
  delete topLevelPayload.message;
  return topLevelPayload as T;
}

export async function submitAdmission(data: AdmissionSubmission) {
  return request<AdmissionRecord>("/api/admissions/submit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getAdmissionById(applicationId: string) {
  return request<AdmissionRecord>(`/api/admissions/${applicationId}`);
}

// ---------------------------------------------------------------------------
// Public class & fee helpers (no auth required — used by the admission form)
// ---------------------------------------------------------------------------

export type PublicClass = {
  id: string;
  name: string;
  section: string;
  academicYear: string;
  capacity: number | null;
};

export type FeeComponent = {
  id: string;
  name: string;
  amount: number;
  description?: string | null;
  isMandatory: boolean;
};

export type Installment = {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  // Days from enrollment when this installment is due. Resolved to a real
  // calendar date per student at plan creation; primary schedule semantics.
  dueOffsetDays?: number | null;
  // Legacy fixed-calendar fallback. Optional, only used when an offset is
  // not present on a legacy fee structure.
  dueDate?: string | null;
};

export type InstallmentOption = {
  id: string;
  name: string;
  numberOfInstallments: number;
  installments: Installment[];
};

export type FeeStructure = {
  id: string;
  classId: string;
  academicYear: string;
  totalAmount: number;
  class: {
    id: string;
    name: string;
    section: string;
  };
  feeComponents: FeeComponent[];
  installmentOptions: InstallmentOption[];
};

export async function getPublicClasses(
  academicYear?: string,
): Promise<PublicClass[]> {
  const params = academicYear
    ? `?academicYear=${encodeURIComponent(academicYear)}`
    : "";
  return request<PublicClass[]>(`/api/classes/public${params}`);
}

export type ActiveAdmissionSession = {
  id: string;
  sessionCode: string;
  startYear: number;
  endYear: number;
  status: string;
};

// Public read of the currently-commenced admission session. Used in the
// parent form header so the academic year shown matches reality.
export async function getActiveAdmissionSessionPublic(): Promise<ActiveAdmissionSession | null> {
  try {
    return await request<ActiveAdmissionSession>(
      "/api/admissions/session/active",
    );
  } catch {
    return null;
  }
}

export async function getFeeStructure(
  className: string,
  academicYear: string,
): Promise<FeeStructure> {
  // Public mirror under /api/admissions so unauthenticated parents can
  // render fees on the admission form. The fee-management endpoints under
  // /api/fees/* require authentication (financial data) and are reserved
  // for the principal/admin dashboards.
  return request<FeeStructure>(
    `/api/admissions/public/fees/${encodeURIComponent(className)}/${encodeURIComponent(academicYear)}`,
  );
}

/* ─────────────────────────────────────────────────────────────
   Fee Structure
   ───────────────────────────────────────────────────────────── */

export type FeeInstallment = {
  installmentNumber: number;
  amount: number;
  percentage: number;
  dueDate: string;
};

export type FeeInstallmentOption = {
  name: string;
  count: number;
  installments: FeeInstallment[];
};

/* ─────────────────────────────────────────────────────────────
   Razorpay Payments
   ───────────────────────────────────────────────────────────── */

export type RazorpayOrderResponse = {
  orderId: string;
  amount: number; // in paise
  currency: string;
  applicationId: string;
  key_id: string;
};

export type PaymentVerifyPayload = {
  applicationId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export async function createRazorpayOrder(
  applicationId: string,
  amount: number,
) {
  return request<RazorpayOrderResponse>(
    "/api/admissions/create-razorpay-order",
    {
      method: "POST",
      body: JSON.stringify({ applicationId, amount }),
    },
  );
}

export async function verifyRazorpayPayment(payload: PaymentVerifyPayload) {
  return request<{ message: string }>(
    "/api/admissions/verify-razorpay-payment",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/* ─────────────────────────────────────────────────────────────
   Cashfree Payments
   ───────────────────────────────────────────────────────────── */

export type PaymentGateway = "razorpay" | "cashfree";

export type PaymentConfigResponse = {
  gateway: PaymentGateway;
  cashfreeEnv: "sandbox" | "production";
  configured: boolean;
};

export async function getPaymentConfig() {
  return request<PaymentConfigResponse>("/api/admissions/payment/config");
}

export type CashfreeOrderResponse = {
  orderId: string;
  paymentSessionId: string;
  cashfreeEnv: "sandbox" | "production";
  applicationId: string;
  amount: number;
  currency: string;
};

export async function createCashfreeOrder(
  applicationId: string,
  amount: number,
  customer: { customerEmail?: string; customerPhone?: string },
) {
  return request<CashfreeOrderResponse>(
    "/api/admissions/create-cashfree-order",
    {
      method: "POST",
      body: JSON.stringify({ applicationId, amount, ...customer }),
    },
  );
}

export async function verifyCashfreePayment(payload: {
  applicationId: string;
  orderId: string;
}) {
  return request<{ message: string }>(
    "/api/admissions/verify-cashfree-payment",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/* ─────────────────────────────────────────────────────────────
   Custom Payment Plans (applicant-facing)
   ───────────────────────────────────────────────────────────── */

export type CustomPlanStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "completed";

export type CustomPlanStatusResponse = {
  hasPlan: boolean;
  hasPendingPlan: boolean;
  hasApprovedPlan: boolean;
  status?: CustomPlanStatus | "completed";
  isCustomPlan?: boolean;
  feeStructureId?: string;
  totalAmount?: number;
};

/**
 * Creates a custom payment plan request for an existing application.
 * Sends a single placeholder installment — the principal edits the schedule
 * before approving.
 */
export async function createCustomPlan(
  applicationId: string,
  requestedAmount: number,
  reason: string,
) {
  // Due date placeholder: 30 days from today
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return request<{ id: string; status: CustomPlanStatus }>(
    "/api/fees/create-custom-plan",
    {
      method: "POST",
      body: JSON.stringify({
        applicationId,
        requestedAmount,
        reason,
        installments: [
          { name: "Requested Payment", dueDate, amount: requestedAmount },
        ],
      }),
    },
  );
}

export async function getCustomPlanStatus(applicationId: string) {
  return request<CustomPlanStatusResponse>(
    `/api/fees/payment-plan-status/${encodeURIComponent(applicationId)}`,
  );
}

export type PaymentInstallmentRecord = {
  id: string;
  name: string;
  dueDate: string;
  amount: number;
  isPaid: boolean;
  paidAmount?: number | null;
  paidDate?: string | null;
  transactionId?: string | null;
};

export type PaymentPlanRecord = {
  id: string;
  applicationId: string;
  studentName: string;
  academicYear: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  isCustomPlan: boolean;
  status: CustomPlanStatus | "completed";
  comments?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  installments: PaymentInstallmentRecord[];
};

export async function createStandardPlan(
  applicationId: string,
  installmentOptionIndex: number,
) {
  return request<PaymentPlanRecord>("/api/fees/create-standard-plan", {
    method: "POST",
    body: JSON.stringify({ applicationId, installmentOptionIndex }),
  });
}

export async function getPaymentPlan(applicationId: string) {
  return request<PaymentPlanRecord>(
    `/api/fees/payment-plan/${encodeURIComponent(applicationId)}`,
  );
}

export type InstallmentOrderResponse = {
  message: string;
  order: {
    id: string;
    amount: number;
    currency: string;
  };
  key_id: string;
  installmentDetails: {
    name: string;
    amount: number;
    dueDate: string;
  };
};

export async function createInstallmentPaymentOrder(
  applicationId: string,
  installmentIndex: number,
) {
  return request<InstallmentOrderResponse>(
    "/api/fees/create-installment-payment",
    {
      method: "POST",
      body: JSON.stringify({ applicationId, installmentIndex }),
    },
  );
}

export async function verifyInstallmentPayment(payload: {
  applicationId: string;
  installmentIndex: number;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}) {
  return request<{ message: string }>("/api/fees/verify-installment-payment", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
