import { clearParentSession } from "./parentSession";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export class ParentApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ParentApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiEnvelope<T> = { success: boolean; message?: string; data?: T };

async function parseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

// An expired/invalid parent token: clear the stale session and bounce to
// login. Centralised here so every page doesn't need its own 401 branch.
function handleUnauthorized(): void {
  if (typeof window === "undefined") return;
  clearParentSession();
  if (!window.location.pathname.startsWith("/parent/login")) {
    window.location.href = "/parent/login";
  }
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = (await parseBody(response)) as ApiEnvelope<T> | undefined;
  if (!response.ok || !body?.success) {
    if (response.status === 401) handleUnauthorized();
    throw new ParentApiError(
      body?.message || `Request failed (${response.status})`,
      response.status,
      body,
    );
  }
  return (body.data as T) ?? (body as unknown as T);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type ParentLoginResponse = {
  token: string;
  expiresInMinutes: number;
  application: { id: string; applicationId: string; status: string };
};

export async function parentLogin(payload: {
  applicationId: string;
  phone: string;
}): Promise<ParentLoginResponse> {
  return request<ParentLoginResponse>("/api/parent/auth/login", "", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Fees ─────────────────────────────────────────────────────────────────────

export type ParentInstallment = {
  id: string;
  name: string;
  dueDate: string;
  amount: number;
  isPaid: boolean;
  paidAmount?: number | null;
  paidDate?: string | null;
  receiptNumber?: string | null;
  isCustom?: boolean;
  transactions?: Array<{
    id: string;
    amount: number;
    method: string;
    paidAt: string;
    receiptNumber: string | null;
  }>;
};

export type ParentOverview = {
  accountId: string;
  applicationId: string | null;
  grNumber: string | null;
  studentName: string;
  className: string | null;
  section: string | null;
  academicYear: string;
  totalCharged: number;
  totalConcession: number;
  totalPaid: number;
  totalDue: number;
  installments: ParentInstallment[];
  paymentPlan: {
    id: string;
    isCustomPlan: boolean;
    status: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
  } | null;
};

export type ParentDuesResponse = {
  totalDue: number;
  installments: Array<{
    id: string;
    name: string;
    dueDate: string;
    amount: number;
    isPaid: boolean;
    paidAmount?: number | null;
  }>;
  adHocCharges: Array<{
    id: string;
    name: string;
    source: string;
    amount: number;
    paid: number;
    due: number;
    dueDate: string | null;
  }>;
};

export type ParentTransaction = {
  id: string;
  amount: number;
  method: string;
  paidAt: string;
  receiptNumber: string | null;
  transactionId: string | null;
  installmentName: string | null;
  installmentDueDate: string | null;
};

export async function getParentOverview(token: string): Promise<ParentOverview> {
  return request<ParentOverview>("/api/parent/fees/account", token);
}

export async function getParentDues(token: string): Promise<ParentDuesResponse> {
  return request<ParentDuesResponse>("/api/parent/fees/dues", token);
}

export async function getParentTransactions(token: string): Promise<ParentTransaction[]> {
  return request<ParentTransaction[]>("/api/parent/fees/transactions", token);
}

export async function getParentReceipt(token: string, transactionId: string): Promise<unknown> {
  return request<unknown>(
    `/api/parent/fees/receipts/${encodeURIComponent(transactionId)}`,
    token,
  );
}

export async function downloadParentReceiptPdf(
  token: string,
  transactionId: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/parent/fees/receipts/${encodeURIComponent(transactionId)}/pdf`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) {
    let message = `Failed to download receipt (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new ParentApiError(message, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fee_receipt_${transactionId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export type ParentPaymentOrder = {
  order: {
    id: string;
    amount: number; // paise
    currency: string;
  };
  key_id: string;
  installmentDetails: {
    name: string;
    amount: number; // rupees
    dueDate: string;
  };
};

export type ParentPaymentConfig = {
  gateway: "razorpay" | "cashfree";
  cashfreeEnv: "sandbox" | "production" | string;
  configured: boolean;
};

export async function getParentPaymentConfig(
  token: string,
): Promise<ParentPaymentConfig> {
  return request<ParentPaymentConfig>("/api/parent/fees/pay/config", token);
}

export type ParentCashfreeOrder = {
  orderId: string;
  paymentSessionId: string;
  cashfreeEnv: "sandbox" | "production" | string;
  installmentDetails: {
    name: string;
    amount: number; // rupees
    dueDate: string;
  };
};

export async function createParentCashfreeOrder(
  token: string,
  installmentId: string,
  customer?: { customerEmail?: string; customerPhone?: string },
  amount?: number,
): Promise<ParentCashfreeOrder> {
  const response = await fetch(`${API_BASE_URL}/api/parent/fees/pay/cashfree-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ installmentId, amount, ...customer }),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => undefined)) as
    | (ParentCashfreeOrder & { success: boolean; message?: string })
    | undefined;
  if (!response.ok || !body?.success) {
    throw new ParentApiError(
      body?.message || `Order failed (${response.status})`,
      response.status,
      body,
    );
  }
  return {
    orderId: body.orderId,
    paymentSessionId: body.paymentSessionId,
    cashfreeEnv: body.cashfreeEnv,
    installmentDetails: body.installmentDetails,
  };
}

export async function verifyParentCashfreePayment(
  token: string,
  payload: { installmentId: string; orderId: string; amount?: number },
): Promise<{ receiptNumber: string }> {
  return request<{ receiptNumber: string }>(
    "/api/parent/fees/pay/cashfree-verify",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function createParentPaymentOrder(
  token: string,
  installmentId: string,
  amount?: number,
): Promise<ParentPaymentOrder> {
  // Server returns the envelope at the top level (not nested under data)
  // so we can't use the standard request helper for this one.
  const response = await fetch(`${API_BASE_URL}/api/parent/fees/pay/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ installmentId, amount }),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => undefined)) as
    | (ParentPaymentOrder & { success: boolean; message?: string })
    | undefined;
  if (!response.ok || !body?.success) {
    throw new ParentApiError(
      body?.message || `Order failed (${response.status})`,
      response.status,
      body,
    );
  }
  return {
    order: body.order,
    key_id: body.key_id,
    installmentDetails: body.installmentDetails,
  };
}

export async function verifyParentPayment(
  token: string,
  payload: {
    installmentId: string;
    amount?: number;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
): Promise<{ receiptNumber: string }> {
  return request<{ receiptNumber: string }>("/api/parent/fees/pay/verify", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Service Catalogue & Requests ─────────────────────────────────────────────

export type ServiceItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  amount: number;
  requiresApproval: boolean;
  isActive: boolean;
  feeHeadId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceRequest = {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  amount: number;
  note: string | null;
  reviewComments: string | null;
  requestedByName: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  serviceName: string | null;
  serviceCode: string | null;
  requiresApproval: boolean | null;
  accountId: string | null;
  studentName: string | null;
  applicationId: string | null;
  charge: { id: string; status: string; amount: number; paid: number; due: number } | null;
};

export async function getServiceCatalog(token: string): Promise<ServiceItem[]> {
  return request<ServiceItem[]>("/api/parent/fees/service-catalog", token);
}

export async function getServiceRequests(token: string): Promise<ServiceRequest[]> {
  return request<ServiceRequest[]>("/api/parent/fees/service-requests", token);
}

export async function createServiceRequest(
  token: string,
  payload: { serviceItemId: string; note?: string },
): Promise<ServiceRequest> {
  return request<ServiceRequest>("/api/parent/fees/service-requests", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Ad-hoc Charge Payment (Cashfree) ─────────────────────────────────────────

export type ChargeCashfreeOrder = {
  orderId: string;
  paymentSessionId: string;
  cashfreeEnv: "sandbox" | "production" | string;
  charge: { id: string; name: string; amount: number };
};

export async function createChargePaymentOrder(
  token: string,
  payload: { chargeId: string; customerPhone?: string; customerEmail?: string },
): Promise<ChargeCashfreeOrder> {
  // The server returns the envelope at the top level (orderId/paymentSessionId
  // are not nested under `data`), so the standard request helper can't be used.
  const response = await fetch(
    `${API_BASE_URL}/api/parent/fees/charges/pay/cashfree-order`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
  const body = (await response.json().catch(() => undefined)) as
    | (ChargeCashfreeOrder & { success: boolean; message?: string })
    | undefined;
  if (!response.ok || !body?.success) {
    throw new ParentApiError(
      body?.message || `Order failed (${response.status})`,
      response.status,
      body,
    );
  }
  return {
    orderId: body.orderId,
    paymentSessionId: body.paymentSessionId,
    cashfreeEnv: body.cashfreeEnv,
    charge: body.charge,
  };
}

export async function verifyChargePayment(
  token: string,
  payload: { chargeId: string; orderId: string },
): Promise<{ message: string; data: unknown }> {
  const response = await fetch(
    `${API_BASE_URL}/api/parent/fees/charges/pay/cashfree-verify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
  const body = (await response.json().catch(() => undefined)) as
    | { success: boolean; message?: string; data?: unknown }
    | undefined;
  if (!response.ok || !body?.success) {
    if (response.status === 401) handleUnauthorized();
    throw new ParentApiError(
      body?.message || `Verification failed (${response.status})`,
      response.status,
      body,
    );
  }
  return { message: body.message ?? "Payment verified", data: body.data };
}
