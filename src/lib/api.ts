const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
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

  return body.data;
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

export async function getFeeStructure(
  className: string,
  academicYear: string,
): Promise<FeeStructure> {
  return request<FeeStructure>(
    `/api/fees/structure/class/${encodeURIComponent(className)}/year/${encodeURIComponent(academicYear)}`,
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
   Custom Payment Plans (applicant-facing)
   ───────────────────────────────────────────────────────────── */

export type CustomPlanStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "completed";

export type CustomPlanStatusResponse = {
  id: string;
  status: CustomPlanStatus;
  totalAmount: number;
  requestedAmount: number;
  comments?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
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
