const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export class PrincipalApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "PrincipalApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
  stats?: T;
  total?: number;
};

export type PrincipalDashboardStats = {
  totalApplications: number;
  pendingReview: number;
  underReview: number;
  onHold: number;
  approved: number;
  rejected: number;
  pendingCustomPaymentPlans: number;
  totalFeeCollected: number;
  totalFeePending: number;
};

export type PrincipalApplication = {
  id: string;
  applicationId: string;
  admissionYear: string;
  status: string;
  correctionNeeded: boolean;
  submittedAt: string;
  lastUpdatedAt: string;
  studentFirstName: string;
  studentLastName: string;
  emergencyContact: string;
  class: {
    id: string;
    name: string;
    section: string | null;
  } | null;
  payment: {
    status: string;
  } | null;
};

export type PrincipalClass = {
  id: string;
  name: string;
  section: string | null;
  academicYear: string;
  capacity?: number | null;
  isActive?: boolean;
};

export type FeeComponentInput = {
  name: string;
  amount: number;
  description?: string;
  isMandatory?: boolean;
};

export type InstallmentInput = {
  name: string;
  dueDate: string;
  percentage: number;
  amount?: number;
};

export type InstallmentOptionInput = {
  name: string;
  numberOfInstallments: number;
  installments: InstallmentInput[];
};

export type PrincipalFeeStructure = {
  id: string;
  classId: string;
  academicYear: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  class: {
    id: string;
    name: string;
    section: string | null;
    academicYear: string;
  };
  feeComponents: Array<{
    id: string;
    name: string;
    amount: number;
    description?: string | null;
    isMandatory: boolean;
  }>;
  installmentOptions: Array<{
    id: string;
    name: string;
    numberOfInstallments: number;
    installments: Array<{
      id: string;
      name: string;
      dueDate: string;
      percentage: number;
      amount?: number | null;
    }>;
  }>;
};

export type ReviewPrincipalApplicationInput = {
  applicationId: string;
  status: "under_review" | "approved" | "rejected" | "on_hold";
  comments: string;
  needsCorrection?: boolean;
  correctionDetails?: string;
};

export type PrincipalApplicationDetail = PrincipalApplication & {
  correctionDetails?: string | null;
  fatherName: string;
  motherName: string;
  address: string;
  statusHistory: Array<{
    id: string;
    status: string;
    changedAt: string;
    changedByName?: string | null;
    comments?: string | null;
  }>;
  reviews: Array<{
    id: string;
    reviewerName?: string | null;
    reviewerRole: string;
    status: string;
    comments: string;
    reviewedAt: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    url: string;
    fileType?: string | null;
    fileSize?: number | null;
    uploadedAt: string;
  }>;
};

export type StudentFeeAccount = {
  planId: string;
  applicationId: string;
  studentName: string;
  academicYear: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  isCustomPlan: boolean;
  installments: Array<{
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
      receiptNumber?: string | null;
      transactionId?: string | null;
    }>;
  }>;
  transactions: Array<{
    id: string;
    amount: number;
    method: string;
    paidAt: string;
    receiptNumber?: string | null;
    transactionId?: string | null;
    installmentName?: string;
    installmentDueDate?: string;
  }>;
};

export type PendingCustomPaymentPlan = {
  id: string;
  applicationId: string;
  studentName: string;
  academicYear: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  isCustomPlan: boolean;
  customPlanReason?: string | null;
  status: "pending_approval" | "approved" | "rejected" | "completed";
  comments?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  installments: Array<{
    id: string;
    name: string;
    dueDate: string;
    amount: number;
    isPaid: boolean;
  }>;
};

export type EditableCustomInstallment = {
  id: string;
  name: string;
  dueDate: string;
  amount: number;
};

type PrincipalApplicationListResponse = {
  success: true;
  total: number;
  data: PrincipalApplication[];
};

function buildAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseErrorBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function request<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...buildAuthHeaders(token),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const rawBody = (await parseErrorBody(response)) as ApiEnvelope<T> | undefined;

  if (!response.ok) {
    const message =
      (rawBody?.message && String(rawBody.message)) ||
      `Request failed with status ${response.status}`;
    throw new PrincipalApiError(message, response.status, rawBody);
  }

  if (rawBody && rawBody.success === false) {
    throw new PrincipalApiError(
      rawBody.message || "Request failed",
      response.status,
      rawBody,
    );
  }

  if (!rawBody) {
    throw new PrincipalApiError("Empty response from server", response.status);
  }

  if ("data" in rawBody && rawBody.data !== undefined) {
    return rawBody.data;
  }

  if ("stats" in rawBody && rawBody.stats !== undefined) {
    return rawBody.stats;
  }

  return rawBody as T;
}

export async function getPrincipalDashboardStats(
  token: string,
): Promise<PrincipalDashboardStats> {
  return request<PrincipalDashboardStats>("/api/principal/dashboard/stats", token);
}

export async function listPrincipalApplications(
  token: string,
  options?: { status?: string; page?: number; limit?: number },
): Promise<PrincipalApplicationListResponse> {
  const query = new URLSearchParams();
  if (options?.status) query.set("status", options.status);
  if (options?.page) query.set("page", String(options.page));
  if (options?.limit) query.set("limit", String(options.limit));

  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await fetch(
    `${API_BASE_URL}/api/principal/applications${suffix}`,
    {
      headers: buildAuthHeaders(token),
      cache: "no-store",
    },
  );

  const body = (await parseErrorBody(response)) as
    | PrincipalApplicationListResponse
    | ApiEnvelope<PrincipalApplication[]>
    | undefined;

  if (!response.ok || !body) {
    const message =
      (body &&
        "message" in body &&
        body.message &&
        typeof body.message === "string" &&
        body.message) ||
      `Failed to load applications (${response.status})`;
    throw new PrincipalApiError(message, response.status, body);
  }

  if ("success" in body && !body.success) {
    throw new PrincipalApiError(
      body.message || "Failed to load applications",
      response.status,
      body,
    );
  }

  if ("data" in body && Array.isArray(body.data) && "total" in body) {
    return {
      success: true,
      data: body.data,
      total: typeof body.total === "number" ? body.total : body.data.length,
    };
  }

  throw new PrincipalApiError(
    "Unexpected response while loading applications",
    response.status,
    body,
  );
}

export async function listClasses(
  token: string,
  academicYear?: string,
): Promise<PrincipalClass[]> {
  const query = new URLSearchParams();
  if (academicYear) query.set("academicYear", academicYear);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<PrincipalClass[]>(`/api/classes${suffix}`, token);
}

export async function createPrincipalClass(
  token: string,
  payload: {
    name: string;
    section?: string;
    academicYear: string;
    capacity?: number;
  },
): Promise<PrincipalClass> {
  return request<PrincipalClass>("/api/classes", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listFeeStructures(token: string): Promise<PrincipalFeeStructure[]> {
  return request<PrincipalFeeStructure[]>("/api/fees/structure", token);
}

export async function createFeeStructure(
  token: string,
  payload: {
    classId: string;
    academicYear: string;
    feeComponents: FeeComponentInput[];
    installmentOptions: InstallmentOptionInput[];
  },
): Promise<PrincipalFeeStructure> {
  return request<PrincipalFeeStructure>("/api/fees/structure", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function reviewPrincipalApplication(
  token: string,
  payload: ReviewPrincipalApplicationInput,
): Promise<{ message: string }> {
  return request<{ message: string }>("/api/principal/review-application", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPrincipalApplicationById(
  token: string,
  applicationId: string,
): Promise<PrincipalApplicationDetail> {
  const response = await fetch(
    `${API_BASE_URL}/api/principal/applications/${encodeURIComponent(applicationId)}`,
    {
      headers: buildAuthHeaders(token),
      cache: "no-store",
    },
  );

  const body = (await parseErrorBody(response)) as
    | { success: boolean; message?: string; application?: PrincipalApplicationDetail }
    | undefined;

  if (!response.ok || !body?.success || !body.application) {
    const message = body?.message || "Failed to load application details";
    throw new PrincipalApiError(message, response.status, body);
  }

  return body.application;
}

export async function getStudentFeeAccount(
  token: string,
  applicationId: string,
): Promise<StudentFeeAccount | null> {
  try {
    return await request<StudentFeeAccount>(
      `/api/fees/account/student/${encodeURIComponent(applicationId)}`,
      token,
    );
  } catch (error) {
    if (error instanceof PrincipalApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function listPendingCustomPaymentPlans(
  token: string,
): Promise<PendingCustomPaymentPlan[]> {
  return request<PendingCustomPaymentPlan[]>(
    "/api/fees/payment-plans/custom/pending",
    token,
  );
}

export async function reviewCustomPaymentPlan(
  token: string,
  payload: { planId: string; approved: boolean; comments?: string },
): Promise<{ message: string }> {
  return request<{ message: string }>("/api/fees/payment-plan/review", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePendingCustomPaymentPlan(
  token: string,
  payload: {
    planId: string;
    installments: EditableCustomInstallment[];
    comments?: string;
  },
): Promise<PendingCustomPaymentPlan> {
  return request<PendingCustomPaymentPlan>("/api/fees/payment-plan/custom/update", token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
