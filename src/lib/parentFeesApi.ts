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
