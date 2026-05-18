import type {
  FeeHead,
  FeeInstallmentTemplate,
  TemplateLine,
  LateFeeRule,
} from "../types/fees";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export const buildAdmissionLetterUrls = (applicationId: string) => {
  const encoded = encodeURIComponent(applicationId);
  return {
    htmlUrl: `${API_BASE_URL}/api/admissions/${encoded}/letter`,
    pdfUrl: `${API_BASE_URL}/api/admissions/${encoded}/letter/pdf`,
  };
};

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
  studentMiddleName?: string | null;
  studentLastName: string;
  grNumber?: string | null;
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

export type AdmissionSessionStatus = "draft" | "ready" | "commenced" | "closed";

export type PrincipalAdmissionSession = {
  id: string;
  sessionCode: string;
  startYear: number;
  endYear: number;
  status: AdmissionSessionStatus;
  isActive: boolean;
  initializedAt?: string | null;
  commencedAt?: string | null;
  closedAt?: string | null;
  archivedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionSessionReadiness = {
  sessionId: string;
  sessionCode: string;
  totalActiveClasses: number;
  classesWithFeeStructures: number;
  missingFeeStructureClassIds: string[];
  hasClasses: boolean;
  allClassesHaveFeeStructures: boolean;
  canCommence: boolean;
};

export type FeeComponentInput = {
  name: string;
  amount: number;
  description?: string;
  isMandatory?: boolean;
};

export type InstallmentInput = {
  name: string;
  // Canonical schedule semantics — days from enrollment when this
  // installment falls due. Resolved to a real calendar date per student.
  dueOffsetDays: number;
  // Optional fallback for legacy fixed-calendar templates only.
  dueDate?: string;
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
  isActive?: boolean;
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
      dueDate: string | null;
      dueOffsetDays?: number | null;
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

export type FeeAccountCharge = {
  id: string;
  name: string;
  source: string;
  amount: number; // RUPEES
  paid: number; // RUPEES
  due: number; // RUPEES
  dueDate: string | Date | null;
  status: string;
  paymentInstallmentId: string | null;
};

export type FeeAccountLedgerEntry = {
  id: string;
  entryType: string;
  debit: number; // RUPEES
  credit: number; // RUPEES
  referenceType: string | null;
  referenceId: string | null;
  postedAt: string | Date;
  description: string | null;
  method?: string | null;
  runningBalance?: number;
};

export type FeeAccount = {
  id: string;
  status: string;
  totalCharged: number; // RUPEES
  totalConcession: number; // RUPEES
  totalPaid: number; // RUPEES
  totalDue: number; // RUPEES
  charges: FeeAccountCharge[];
  ledgerEntries: FeeAccountLedgerEntry[];
} | null;

export type PendingFeeApproval = {
  id: string;
  type: "custom_installment" | "concession" | "late_fee_waiver";
  status: "pending" | "approved" | "rejected" | "cancelled";
  reason: string;
  comments?: string | null;
  accountId?: string | null;
  paymentPlanId?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  requestedBy?: { id: string; name: string; role: string } | null;
  reviewedBy?: { id: string; name: string; role: string } | null;
  documents: Array<{
    id: string;
    name: string;
    url: string;
    fileType?: string | null;
    fileSize?: number | null;
  }>;
  concession?: {
    id: string;
    type: string;
    amountInPaise: string | number;
  } | null;
  lateFeeWaiver?: { id: string; amountInPaise: string | number } | null;
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
  feeAccount?: FeeAccount;
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

  const rawBody = (await parseErrorBody(response)) as
    | ApiEnvelope<T>
    | undefined;

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
  return request<PrincipalDashboardStats>(
    "/api/principal/dashboard/stats",
    token,
  );
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
  includeAllYears?: boolean,
  includeArchived?: boolean,
): Promise<PrincipalClass[]> {
  const query = new URLSearchParams();
  if (academicYear) query.set("academicYear", academicYear);
  if (includeAllYears) query.set("includeAllYears", "true");
  if (includeArchived) query.set("includeArchived", "true");
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

export async function updatePrincipalClass(
  token: string,
  classId: string,
  payload: {
    name?: string;
    section?: string;
    capacity?: number | null;
    isActive?: boolean;
  },
): Promise<PrincipalClass> {
  return request<PrincipalClass>(
    `/api/classes/${encodeURIComponent(classId)}`,
    token,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

// Soft-delete: the backend marks the class inactive (archived) rather than
// destroying it, preserving any applications/students linked to it.
export async function archivePrincipalClass(
  token: string,
  classId: string,
): Promise<void> {
  await request<unknown>(`/api/classes/${encodeURIComponent(classId)}`, token, {
    method: "DELETE",
  });
}

export async function restorePrincipalClass(
  token: string,
  classId: string,
): Promise<PrincipalClass> {
  return updatePrincipalClass(token, classId, { isActive: true });
}

export async function listAdmissionSessions(
  token: string,
  includeArchived?: boolean,
): Promise<PrincipalAdmissionSession[]> {
  const suffix = includeArchived ? "?includeArchived=true" : "";
  return request<PrincipalAdmissionSession[]>(
    `/api/principal/admissions/sessions${suffix}`,
    token,
  );
}

export async function createAdmissionSession(
  token: string,
  payload: { sessionCode: string; notes?: string },
): Promise<PrincipalAdmissionSession> {
  return request<PrincipalAdmissionSession>(
    "/api/principal/admissions/sessions",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateAdmissionSession(
  token: string,
  sessionId: string,
  payload: { notes?: string },
): Promise<PrincipalAdmissionSession> {
  return request<PrincipalAdmissionSession>(
    `/api/principal/admissions/sessions/${encodeURIComponent(sessionId)}`,
    token,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

// Soft-delete: archives the session (hidden from Setup) while keeping every
// application, class and fee structure tied to it intact.
export async function archiveAdmissionSession(
  token: string,
  sessionId: string,
): Promise<void> {
  await request<unknown>(
    `/api/principal/admissions/sessions/${encodeURIComponent(sessionId)}`,
    token,
    { method: "DELETE" },
  );
}

export async function restoreAdmissionSession(
  token: string,
  sessionId: string,
): Promise<PrincipalAdmissionSession> {
  return request<PrincipalAdmissionSession>(
    `/api/principal/admissions/sessions/${encodeURIComponent(sessionId)}/restore`,
    token,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function initializeAdmissionSession(
  token: string,
  sessionId: string,
  payload?: {
    sourceSessionCode?: string;
    copyClasses?: boolean;
    copyFeeStructures?: boolean;
    overwriteExisting?: boolean;
  },
): Promise<{
  session: PrincipalAdmissionSession;
  classesCreated: number;
  feeStructuresCreated: number;
}> {
  return request<{
    session: PrincipalAdmissionSession;
    classesCreated: number;
    feeStructuresCreated: number;
  }>(
    `/api/principal/admissions/sessions/${encodeURIComponent(sessionId)}/initialize`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    },
  );
}

export async function getAdmissionSessionReadiness(
  token: string,
  sessionId: string,
): Promise<AdmissionSessionReadiness> {
  return request<AdmissionSessionReadiness>(
    `/api/principal/admissions/sessions/${encodeURIComponent(sessionId)}/readiness`,
    token,
  );
}

export async function commenceAdmissionSession(
  token: string,
  sessionId: string,
): Promise<PrincipalAdmissionSession> {
  return request<PrincipalAdmissionSession>(
    `/api/principal/admissions/sessions/${encodeURIComponent(sessionId)}/commence`,
    token,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function closeAdmissionSession(
  token: string,
  sessionId: string,
): Promise<PrincipalAdmissionSession> {
  return request<PrincipalAdmissionSession>(
    `/api/principal/admissions/sessions/${encodeURIComponent(sessionId)}/close`,
    token,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function listFeeStructures(
  token: string,
  includeArchived?: boolean,
): Promise<PrincipalFeeStructure[]> {
  const suffix = includeArchived ? "?includeArchived=true" : "";
  return request<PrincipalFeeStructure[]>(
    `/api/fees/structure${suffix}`,
    token,
  );
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

export async function updateFeeStructure(
  token: string,
  feeStructureId: string,
  payload: {
    feeComponents: FeeComponentInput[];
    installmentOptions: InstallmentOptionInput[];
  },
): Promise<PrincipalFeeStructure> {
  return request<PrincipalFeeStructure>(
    `/api/fees/structure/${encodeURIComponent(feeStructureId)}`,
    token,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

// Soft-delete: archives the fee structure so historical student charges
// raised against it stay auditable.
export async function archiveFeeStructure(
  token: string,
  feeStructureId: string,
): Promise<void> {
  await request<unknown>(
    `/api/fees/structure/${encodeURIComponent(feeStructureId)}`,
    token,
    { method: "DELETE" },
  );
}

export async function restoreFeeStructure(
  token: string,
  feeStructureId: string,
): Promise<PrincipalFeeStructure> {
  return request<PrincipalFeeStructure>(
    `/api/fees/structure/${encodeURIComponent(feeStructureId)}/restore`,
    token,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function reviewPrincipalApplication(
  token: string,
  payload: ReviewPrincipalApplicationInput,
): Promise<{ message: string }> {
  return request<{ message: string }>(
    "/api/principal/review-application",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
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
    | {
        success: boolean;
        message?: string;
        application?: PrincipalApplicationDetail;
      }
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
  return request<PendingCustomPaymentPlan>(
    "/api/fees/payment-plan/custom/update",
    token,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

// ─── Installment Templates ────────────────────────────────────────────────────

export async function listInstallmentTemplates(
  token: string,
  academicYear?: string,
): Promise<FeeInstallmentTemplate[]> {
  const qs = academicYear
    ? `?academicYear=${encodeURIComponent(academicYear)}`
    : "";
  return request<FeeInstallmentTemplate[]>(
    `/api/fees/installment-templates${qs}`,
    token,
  );
}

export async function createInstallmentTemplate(
  token: string,
  payload: { name: string; academicYear: string; lines: TemplateLine[] },
): Promise<FeeInstallmentTemplate> {
  return request<FeeInstallmentTemplate>(
    "/api/fees/installment-templates",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteInstallmentTemplate(
  token: string,
  id: string,
): Promise<void> {
  await request<unknown>(
    `/api/fees/installment-templates/${encodeURIComponent(id)}`,
    token,
    {
      method: "DELETE",
    },
  );
}

// ─── Approvals Queue ──────────────────────────────────────────────────────────

export async function listPendingApprovals(
  token: string,
): Promise<PendingFeeApproval[]> {
  return request<PendingFeeApproval[]>("/api/fees/approvals/pending", token);
}

export async function reviewConcession(
  token: string,
  payload: { id: string; approved: boolean; reviewerNotes?: string },
): Promise<PendingFeeApproval> {
  // Backend feeConcessionService.review expects { concessionId, approved, comments }.
  return request<PendingFeeApproval>("/api/fees/concessions/review", token, {
    method: "POST",
    body: JSON.stringify({
      concessionId: payload.id,
      approved: payload.approved,
      comments: payload.reviewerNotes,
    }),
  });
}

export async function reviewLateFeeWaiver(
  token: string,
  payload: { id: string; approved: boolean; reviewerNotes?: string },
): Promise<PendingFeeApproval> {
  // Backend lateFeeWaiverService.review expects { waiverId, approved, comments }.
  return request<PendingFeeApproval>(
    "/api/fees/late-fee-waivers/review",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        waiverId: payload.id,
        approved: payload.approved,
        comments: payload.reviewerNotes,
      }),
    },
  );
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

export async function listServiceItems(
  token: string,
  activeOnly = false,
): Promise<ServiceItem[]> {
  const qs = `?activeOnly=${activeOnly ? "true" : "false"}`;
  return request<ServiceItem[]>(`/api/fees/service-items${qs}`, token);
}

export async function upsertServiceItem(
  token: string,
  payload: {
    id?: string;
    name: string;
    code?: string;
    description?: string;
    amount: number;
    requiresApproval: boolean;
    feeHeadId?: string;
  },
): Promise<ServiceItem> {
  return request<ServiceItem>("/api/fees/service-items", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function setServiceItemActive(
  token: string,
  id: string,
  isActive: boolean,
): Promise<ServiceItem> {
  return request<ServiceItem>(
    `/api/fees/service-items/${encodeURIComponent(id)}/active`,
    token,
    { method: "POST", body: JSON.stringify({ isActive }) },
  );
}

// Record a counter (cash/cheque/etc.) payment that settles a standalone
// service or ad-hoc charge in full.
export async function recordChargePayment(
  token: string,
  chargeId: string,
  payload: { method?: string; transactionId?: string; notes?: string },
): Promise<unknown> {
  return request(
    `/api/fees/charges/${encodeURIComponent(chargeId)}/record-payment`,
    token,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function listServiceRequests(
  token: string,
  status?: "pending" | "approved" | "rejected",
): Promise<ServiceRequest[]> {
  const qs = status ? `?status=${status}` : "";
  return request<ServiceRequest[]>(`/api/fees/service-requests${qs}`, token);
}

export async function reviewServiceRequest(
  token: string,
  payload: {
    requestId: string;
    approved: boolean;
    amount?: number;
    comments?: string;
  },
): Promise<{ message: string; data: ServiceRequest }> {
  const response = await fetch(`${API_BASE_URL}/api/fees/service-requests/review`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const body = (await parseErrorBody(response)) as
    | { success: boolean; message?: string; data?: ServiceRequest }
    | undefined;
  if (!response.ok || !body?.success) {
    throw new PrincipalApiError(
      body?.message || "Failed to review service request",
      response.status,
      body,
    );
  }
  return { message: body.message ?? "Reviewed", data: body.data as ServiceRequest };
}

// ─── Fee Heads ────────────────────────────────────────────────────────────────

export async function listFeeHeads(token: string): Promise<FeeHead[]> {
  return request<FeeHead[]>("/api/fees/fee-heads", token);
}

export async function upsertFeeHead(
  token: string,
  payload: { code: string; name: string; category: string; isActive?: boolean },
): Promise<FeeHead> {
  return request<FeeHead>("/api/fees/fee-heads", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function archiveFeeHead(token: string, id: string): Promise<void> {
  await request<unknown>(
    `/api/fees/fee-heads/${encodeURIComponent(id)}`,
    token,
    {
      method: "DELETE",
    },
  );
}

// ─── Late Fee Rules ───────────────────────────────────────────────────────────

export async function listLateFeeRules(
  token: string,
  academicYear?: string,
): Promise<LateFeeRule[]> {
  const qs = academicYear
    ? `?academicYear=${encodeURIComponent(academicYear)}`
    : "";
  return request<LateFeeRule[]>(`/api/fees/late-fees/rules${qs}`, token);
}

export async function createLateFeeRule(
  token: string,
  payload: {
    name: string;
    academicYear: string;
    graceDays: number;
    frequency: string;
    fixedAmount?: number;
    percentage?: number;
    maxAmount?: number;
  },
): Promise<LateFeeRule> {
  return request<LateFeeRule>("/api/fees/late-fees/rules", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function applyLateFees(
  token: string,
  payload: { academicYear: string; asOf?: string },
): Promise<{ applied: number }> {
  return request<{ applied: number }>("/api/fees/late-fees/apply", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Fee Assignments ──────────────────────────────────────────────────────────

export async function assignFeeCharge(
  token: string,
  payload: {
    accountId: string;
    type: string;
    name: string;
    amountInPaise: number;
    dueDate?: string;
    feeHeadId?: string;
  },
): Promise<unknown> {
  return request<unknown>("/api/fees/assignments", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Manual Payment ───────────────────────────────────────────────────────────
// amount is in RUPEES (legacy Float), NOT paise

export async function recordManualPayment(
  token: string,
  payload: {
    applicationId?: string;
    installmentId?: string;
    amount: number; // RUPEES — NOT paise
    method: string;
    transactionId?: string;
    receiptNumber?: string;
    notes?: string;
  },
): Promise<unknown> {
  return request<unknown>("/api/fees/record-payment", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Concession Request ───────────────────────────────────────────────────────

export async function requestConcession(
  token: string,
  payload: {
    accountId: string;
    type: string;
    amount?: number; // RUPEES
    percentage?: number;
    reason: string;
  },
): Promise<PendingFeeApproval> {
  return request<PendingFeeApproval>("/api/fees/concessions/request", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Fees Module: Dashboard, Accounts, Cashier ───────────────────────────────

export type FeesDashboardSummary = {
  totalAccounts: number;
  totalCharged: number;
  totalPaid: number;
  totalDue: number;
  totalConcession: number;
  overdueCharges: number;
  todayCollection: number;
  todayTransactionCount: number;
  monthCollection: number;
  monthTransactionCount: number;
  pendingApprovals: number;
};

export type FeeAccountListItem = {
  id: string;
  applicationId: string | null;
  grNumber: string | null;
  studentName: string;
  contactNumber: string | null;
  className: string | null;
  section: string | null;
  academicYear: string;
  status: string;
  totalCharged: number;
  totalConcession: number;
  totalPaid: number;
  totalDue: number;
  updatedAt: string;
};

export type FeeAccountListResponse = {
  data: FeeAccountListItem[];
  total: number;
  pages: number;
  currentPage: number;
};

export type FeeAccountDetail = {
  id: string;
  applicationId: string | null;
  grNumber: string | null;
  studentName: string;
  contactNumber: string | null;
  fatherName: string | null;
  motherName: string | null;
  address: string | null;
  className: string | null;
  section: string | null;
  academicYear: string;
  status: string;
  totalCharged: number;
  totalConcession: number;
  totalPaid: number;
  totalDue: number;
  charges: Array<{
    id: string;
    name: string;
    source: string;
    amount: number;
    paid: number;
    due: number;
    dueDate: string | null;
    status: string;
    feeHeadId: string | null;
    paymentInstallmentId: string | null;
  }>;
  ledgerEntries: Array<{
    id: string;
    entryType: string;
    debit: number;
    credit: number;
    referenceType: string | null;
    referenceId: string | null;
    description: string | null;
    postedAt: string;
  }>;
  approvalRequests: Array<{
    id: string;
    type: string;
    status: string;
    reason: string;
    comments: string | null;
    createdAt: string;
    reviewedAt: string | null;
    documents: Array<{ id: string; name: string; url: string }>;
  }>;
  concessions: Array<{
    id: string;
    type: string;
    amount: number;
    percentage: number | null;
    reason: string;
    status: string;
    approvedAt: string | null;
  }>;
  installments: Array<{
    id: string;
    name: string;
    dueDate: string;
    amount: number;
    isPaid: boolean;
    paidAmount: number | null;
    paidDate: string | null;
    receiptNumber: string | null;
    isCustom: boolean;
    transactions: Array<{
      id: string;
      amount: number;
      method: string;
      paidAt: string;
      receiptNumber: string | null;
    }>;
  }>;
  paymentPlan: {
    id: string;
    isCustomPlan: boolean;
    status: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
  } | null;
};

export type CashierSessionDto = {
  id: string;
  cashierId: string;
  cashierName: string | null;
  status: "open" | "closed" | "reconciled";
  openedAt: string;
  closedAt: string | null;
  closedByName: string | null;
  openingFloat: number;
  declaredClose: number | null;
  expectedClose: number | null;
  variance: number | null;
  notes: string | null;
};

export type CashbookEntry = {
  id: string;
  amount: number;
  method: string;
  paidAt: string;
  receiptNumber: string | null;
  transactionId: string | null;
  notes: string | null;
  recordedByName: string | null;
  applicationId: string | null;
  studentName: string | null;
  installmentName: string | null;
};

export type CashbookDto = {
  session: CashierSessionDto;
  summary: Array<{ method: string; count: number; total: number }>;
  transactions: CashbookEntry[];
};

export async function getFeesDashboardSummary(
  token: string,
  academicYear?: string,
): Promise<FeesDashboardSummary> {
  const qs = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : "";
  return request<FeesDashboardSummary>(`/api/fees/dashboard/summary${qs}`, token);
}

export async function listStudentFeeAccounts(
  token: string,
  options?: {
    academicYear?: string;
    classId?: string;
    status?: string;
    dueFilter?: "any" | "due" | "overdue" | "clear";
    search?: string;
    page?: number;
    limit?: number;
  },
): Promise<FeeAccountListResponse> {
  const query = new URLSearchParams();
  if (options?.academicYear) query.set("academicYear", options.academicYear);
  if (options?.classId) query.set("classId", options.classId);
  if (options?.status) query.set("status", options.status);
  if (options?.dueFilter) query.set("dueFilter", options.dueFilter);
  if (options?.search) query.set("search", options.search);
  if (options?.page) query.set("page", String(options.page));
  if (options?.limit) query.set("limit", String(options.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await fetch(`${API_BASE_URL}/api/fees/accounts${suffix}`, {
    headers: buildAuthHeaders(token),
    cache: "no-store",
  });
  const body = (await parseErrorBody(response)) as
    | { success: boolean; total?: number; pages?: number; currentPage?: number; data?: FeeAccountListItem[]; message?: string }
    | undefined;
  if (!response.ok || !body?.success) {
    throw new PrincipalApiError(body?.message || "Failed to load fee accounts", response.status, body);
  }
  return {
    data: body.data ?? [],
    total: body.total ?? 0,
    pages: body.pages ?? 1,
    currentPage: body.currentPage ?? 1,
  };
}

export async function getFeeAccountDetail(
  token: string,
  accountId: string,
): Promise<FeeAccountDetail> {
  return request<FeeAccountDetail>(
    `/api/fees/accounts/${encodeURIComponent(accountId)}`,
    token,
  );
}

export async function bulkAssignCharge(
  token: string,
  payload: {
    accountIds?: string[];
    classId?: string;
    academicYear?: string;
    type: "transport" | "hostel" | "exam" | "activity" | "misc";
    name: string;
    amount: number;
    dueDate?: string;
    feeHeadId?: string;
  },
): Promise<{ totalCount: number; succeeded: number; failed: number; results: Array<{ accountId: string; chargeId?: string; error?: string }> }> {
  return request("/api/fees/charges/bulk-assign", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function openCashierSession(
  token: string,
  payload: { openingFloat: number; notes?: string },
): Promise<CashierSessionDto> {
  return request<CashierSessionDto>("/api/fees/cashier/sessions/open", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function closeCashierSession(
  token: string,
  sessionId: string,
  payload: { declaredClose: number; notes?: string },
): Promise<CashierSessionDto> {
  return request<CashierSessionDto>(
    `/api/fees/cashier/sessions/${encodeURIComponent(sessionId)}/close`,
    token,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function getCurrentCashierSession(
  token: string,
): Promise<CashierSessionDto | null> {
  return request<CashierSessionDto | null>("/api/fees/cashier/sessions/current", token);
}

export async function listCashierSessions(
  token: string,
  options?: { status?: "open" | "closed" | "reconciled"; cashierId?: string; page?: number; limit?: number },
): Promise<{ data: CashierSessionDto[]; total: number }> {
  const query = new URLSearchParams();
  if (options?.status) query.set("status", options.status);
  if (options?.cashierId) query.set("cashierId", options.cashierId);
  if (options?.page) query.set("page", String(options.page));
  if (options?.limit) query.set("limit", String(options.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await fetch(`${API_BASE_URL}/api/fees/cashier/sessions${suffix}`, {
    headers: buildAuthHeaders(token),
    cache: "no-store",
  });
  const body = (await parseErrorBody(response)) as
    | { success: boolean; total?: number; data?: CashierSessionDto[]; message?: string }
    | undefined;
  if (!response.ok || !body?.success) {
    throw new PrincipalApiError(body?.message || "Failed to load sessions", response.status, body);
  }
  return { data: body.data ?? [], total: body.total ?? 0 };
}

export async function getCashbook(
  token: string,
  sessionId: string,
): Promise<CashbookDto> {
  return request<CashbookDto>(
    `/api/fees/cashier/sessions/${encodeURIComponent(sessionId)}/cashbook`,
    token,
  );
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

export type FeeRefundMethod =
  | "online_gateway"
  | "cash"
  | "cheque"
  | "bank_transfer"
  | "other";

export type FeeRefundStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "failed"
  | "cancelled";

export type FeeRefund = {
  id: string;
  amount: number; // RUPEES
  reason: string;
  method: FeeRefundMethod;
  bankDetails: string | null;
  status: FeeRefundStatus;
  refundedAt: string | null;
  refundReferenceId: string | null;
  executionError: string | null;
  createdAt: string;
  updatedAt: string;
  accountId: string;
  originalTransactionId: string | null;
  approvalRequestId: string | null;
  requestedBy: { id: string; name: string; role: string } | null;
  approvedBy: { id: string; name: string; role: string } | null;
  executedBy: { id: string; name: string; role: string } | null;
};

export async function requestRefund(
  token: string,
  payload: {
    accountId: string;
    amount: number; // RUPEES
    method: FeeRefundMethod;
    reason: string;
    bankDetails?: string;
    originalTransactionId?: string;
  },
): Promise<FeeRefund> {
  return request<FeeRefund>("/api/fees/refunds/request", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function reviewRefund(
  token: string,
  payload: { refundId: string; approved: boolean; comments?: string },
): Promise<FeeRefund> {
  return request<FeeRefund>("/api/fees/refunds/review", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function executeRefund(
  token: string,
  refundId: string,
  payload?: { refundReferenceId?: string },
): Promise<FeeRefund> {
  return request<FeeRefund>(
    `/api/fees/refunds/${encodeURIComponent(refundId)}/execute`,
    token,
    { method: "POST", body: JSON.stringify(payload ?? {}) },
  );
}

export async function listRefunds(
  token: string,
  options?: { accountId?: string; status?: FeeRefundStatus; page?: number; limit?: number },
): Promise<{ data: FeeRefund[]; total: number; currentPage: number }> {
  const query = new URLSearchParams();
  if (options?.accountId) query.set("accountId", options.accountId);
  if (options?.status) query.set("status", options.status);
  if (options?.page) query.set("page", String(options.page));
  if (options?.limit) query.set("limit", String(options.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await fetch(`${API_BASE_URL}/api/fees/refunds${suffix}`, {
    headers: buildAuthHeaders(token),
    cache: "no-store",
  });
  const body = (await parseErrorBody(response)) as
    | { success: boolean; total?: number; currentPage?: number; data?: FeeRefund[]; message?: string }
    | undefined;
  if (!response.ok || !body?.success) {
    throw new PrincipalApiError(body?.message || "Failed to load refunds", response.status, body);
  }
  return { data: body.data ?? [], total: body.total ?? 0, currentPage: body.currentPage ?? 1 };
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export type ReminderChannel = "whatsapp" | "sms" | "email";

export type ReminderTemplate = {
  id: string;
  name: string;
  channel: ReminderChannel;
  subject: string | null;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReminderRule = {
  id: string;
  name: string;
  academicYear: string;
  daysBeforeDue: number | null;
  daysAfterDue: number | null;
  minAmount: number | null;
  classId: string | null;
  isActive: boolean;
  templateId: string;
  template: { id: string; name: string; channel: ReminderChannel } | null;
  createdAt: string;
  updatedAt: string;
};

export type ReminderRecipient = {
  accountId: string;
  applicationId: string | null;
  studentName: string;
  contact: string | null;
  parentName: string | null;
  className: string | null;
  amountDue: number;
  earliestDueDate: string | null;
};

export type ReminderPreview = {
  rule: { id: string; name: string; channel: ReminderChannel };
  recipientCount: number;
  recipients: ReminderRecipient[];
};

export type ReminderLogEntry = {
  id: string;
  accountId: string;
  channel: ReminderChannel;
  status: "queued" | "sent" | "failed";
  recipient: string;
  message: string;
  dueAmount: number;
  dueDate: string | null;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
};

export async function listReminderTemplates(token: string): Promise<ReminderTemplate[]> {
  return request<ReminderTemplate[]>("/api/fees/reminders/templates", token);
}

export async function createReminderTemplate(
  token: string,
  payload: {
    name: string;
    channel: ReminderChannel;
    subject?: string;
    body: string;
    isActive?: boolean;
  },
): Promise<ReminderTemplate> {
  return request<ReminderTemplate>("/api/fees/reminders/templates", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteReminderTemplate(token: string, id: string): Promise<void> {
  await request<unknown>(
    `/api/fees/reminders/templates/${encodeURIComponent(id)}`,
    token,
    { method: "DELETE" },
  );
}

export async function listReminderRules(
  token: string,
  filters?: { academicYear?: string; isActive?: boolean },
): Promise<ReminderRule[]> {
  const query = new URLSearchParams();
  if (filters?.academicYear) query.set("academicYear", filters.academicYear);
  if (filters?.isActive !== undefined)
    query.set("isActive", String(filters.isActive));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<ReminderRule[]>(`/api/fees/reminders/rules${suffix}`, token);
}

export async function createReminderRule(
  token: string,
  payload: {
    name: string;
    academicYear: string;
    templateId: string;
    daysBeforeDue?: number;
    daysAfterDue?: number;
    minAmount?: number;
    classId?: string;
    isActive?: boolean;
  },
): Promise<ReminderRule> {
  return request<ReminderRule>("/api/fees/reminders/rules", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteReminderRule(token: string, id: string): Promise<void> {
  await request<unknown>(
    `/api/fees/reminders/rules/${encodeURIComponent(id)}`,
    token,
    { method: "DELETE" },
  );
}

export async function previewReminderRule(
  token: string,
  ruleId: string,
): Promise<ReminderPreview> {
  return request<ReminderPreview>(
    `/api/fees/reminders/rules/${encodeURIComponent(ruleId)}/preview`,
    token,
  );
}

export async function dispatchReminders(
  token: string,
  payload: { ruleId: string; dryRun?: boolean },
): Promise<{
  queued: number;
  sent: number;
  failed: number;
  skipped?: number;
  dryRun: boolean;
}> {
  return request("/api/fees/reminders/dispatch", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listReminderLog(
  token: string,
  filters?: { channel?: ReminderChannel; status?: string; limit?: number },
): Promise<ReminderLogEntry[]> {
  const query = new URLSearchParams();
  if (filters?.channel) query.set("channel", filters.channel);
  if (filters?.status) query.set("status", filters.status);
  if (filters?.limit) query.set("limit", String(filters.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<ReminderLogEntry[]>(`/api/fees/reminders/log${suffix}`, token);
}

// ─── Restructure plan ─────────────────────────────────────────────────────────

export type RestructureInstallment = {
  name: string;
  dueDate: string;
  amount: number; // RUPEES
};

export async function restructureRemainingInstallments(
  token: string,
  payload: {
    applicationId: string;
    installments: RestructureInstallment[];
    reason?: string;
  },
): Promise<unknown> {
  return request<unknown>("/api/fees/restructure-installments", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Receipt PDF ──────────────────────────────────────────────────────────────

export async function downloadTransactionReceiptPdf(
  token: string,
  transactionId: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/fees/transaction-receipt/${encodeURIComponent(transactionId)}/pdf`,
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
    throw new PrincipalApiError(message, response.status);
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

// ─── Reconciliation ───────────────────────────────────────────────────────────

export type ReconciliationStatus = "pending" | "matched" | "unmatched" | "mismatch";

export type ReconciliationItem = {
  id: string;
  batchId: string;
  externalPaymentId: string | null;
  utrNumber: string | null;
  amountInPaise: string | number;
  paidAt: string | null;
  payerName: string | null;
  raw: unknown;
  status: ReconciliationStatus;
  mismatchReason: string | null;
  feeTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReconciliationBatch = {
  id: string;
  source: string;
  statementDate: string | null;
  status: ReconciliationStatus;
  totalAmountInPaise: string | number;
  matchedAmountInPaise: string | number;
  itemCount: number;
  matchedCount: number;
  uploadedById: string | null;
  createdAt: string;
  updatedAt: string;
  items?: ReconciliationItem[];
};

export type ReconciliationItemInput = {
  externalPaymentId?: string;
  utrNumber?: string;
  amount: number; // RUPEES
  paidAt?: string;
  payerName?: string;
  raw?: unknown;
};

export async function listReconciliationBatches(
  token: string,
): Promise<ReconciliationBatch[]> {
  return request<ReconciliationBatch[]>("/api/fees/reconciliation/batches", token);
}

export async function getReconciliationBatch(
  token: string,
  batchId: string,
): Promise<ReconciliationBatch> {
  return request<ReconciliationBatch>(
    `/api/fees/reconciliation/batches/${encodeURIComponent(batchId)}`,
    token,
  );
}

export async function createReconciliationBatch(
  token: string,
  payload: {
    source: string;
    statementDate?: string;
    items: ReconciliationItemInput[];
  },
): Promise<ReconciliationBatch> {
  return request<ReconciliationBatch>("/api/fees/reconciliation/batches", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function manuallyMatchReconciliationItem(
  token: string,
  batchId: string,
  itemId: string,
  feeTransactionId: string,
): Promise<ReconciliationItem> {
  return request<ReconciliationItem>(
    `/api/fees/reconciliation/batches/${encodeURIComponent(batchId)}/items/${encodeURIComponent(itemId)}/match`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ feeTransactionId }),
    },
  );
}

export async function markReconciliationItemMismatch(
  token: string,
  batchId: string,
  itemId: string,
  reason?: string,
): Promise<ReconciliationItem> {
  return request<ReconciliationItem>(
    `/api/fees/reconciliation/batches/${encodeURIComponent(batchId)}/items/${encodeURIComponent(itemId)}/mark-mismatch`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export type DefaulterRow = {
  accountId: string;
  applicationId: string | null;
  grNumber: string | null;
  studentName: string;
  contact: string | null;
  className: string | null;
  section: string | null;
  totalDue: number;
  overdueCharges: number;
  oldestDueDate: string | null;
  daysOverdue: number;
};

export type ClassWiseRow = {
  classId: string | null;
  charged: number;
  paid: number;
  due: number;
  students: number;
};

export type HeadWiseRow = {
  feeHeadId: string | null;
  charged: number;
  paid: number;
  due: number;
};

export type CashbookRow = {
  day: string;
  method: string;
  amount: number;
  count: number;
};

export type AgingBuckets = Record<"0-30" | "31-60" | "61-90" | "90+", number>;

export async function getFeeReport<T = unknown>(
  token: string,
  report:
    | "class-wise-collection"
    | "head-wise-collection"
    | "daily-cashbook"
    | "pending-dues"
    | "aging"
    | "concessions"
    | "defaulters",
  params?: { academicYear?: string; fromDate?: string; toDate?: string; asOf?: string; minOverdueDays?: number },
): Promise<T> {
  const query = new URLSearchParams();
  if (params?.academicYear) query.set("academicYear", params.academicYear);
  if (params?.fromDate) query.set("fromDate", params.fromDate);
  if (params?.toDate) query.set("toDate", params.toDate);
  if (params?.asOf) query.set("asOf", params.asOf);
  if (params?.minOverdueDays != null)
    query.set("minOverdueDays", String(params.minOverdueDays));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<T>(`/api/fees/reports/${report}${suffix}`, token);
}

// ─── Tally Export (returns XML) ───────────────────────────────────────────────

export async function exportTallyDaybook(
  token: string,
  params: { from: string; to: string },
): Promise<string> {
  const qs = `?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}`;
  const res = await fetch(
    `${API_BASE_URL}/api/fees/exports/tally-daybook${qs}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new PrincipalApiError(`Tally export failed`, res.status);
  return res.text();
}

// ─── School Payout Account (Razorpay Route / Cashfree Easy Split) ─────────────

export type PayoutGateway = "razorpay" | "cashfree";

export type PayoutAccountStatus =
  | "not_onboarded"
  | "created"
  | "verification_pending"
  | "active"
  | "rejected"
  | "suspended";

export type PayoutGatewayLink = {
  gateway: PayoutGateway;
  status: PayoutAccountStatus;
  statusDetail: string | null;
  gatewayAccountId: string | null;
  verifiedAt: string | null;
  lastSyncedAt: string | null;
};

export type PayoutAccount = {
  id: string;
  accountHolderName: string;
  accountNumberMasked: string;
  ifsc: string;
  accountType: string;
  legalBusinessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  businessType: string | null;
  pan: string | null;
  gstin: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  isActive: boolean;
  updatedAt: string;
  gatewayLinks: PayoutGatewayLink[];
};

export type PayoutAccountInput = {
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  accountType: string;
  legalBusinessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  businessType?: string;
  pan?: string;
  gstin?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export type PayoutTransfer = {
  id: string;
  gateway: PayoutGateway;
  gatewayTransferId: string | null;
  amount: number;
  status: string;
  sourceType: string;
  sourceId: string;
  createdAt: string;
};

export async function getPayoutAccount(token: string): Promise<PayoutAccount | null> {
  return request<PayoutAccount | null>("/api/fees/payout/account", token);
}

export async function savePayoutAccount(
  token: string,
  payload: PayoutAccountInput,
): Promise<PayoutAccount> {
  return request<PayoutAccount>("/api/fees/payout/account", token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function onboardPayoutGateway(
  token: string,
  gateway: PayoutGateway,
): Promise<PayoutGatewayLink> {
  return request<PayoutGatewayLink>(
    `/api/fees/payout/${gateway}/onboard`,
    token,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function refreshPayoutGateway(
  token: string,
  gateway: PayoutGateway,
): Promise<PayoutGatewayLink> {
  return request<PayoutGatewayLink>(
    `/api/fees/payout/${gateway}/refresh`,
    token,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function listPayoutTransfers(
  token: string,
  options?: { gateway?: PayoutGateway; page?: number; limit?: number },
): Promise<{ data: PayoutTransfer[]; total: number }> {
  const query = new URLSearchParams();
  if (options?.gateway) query.set("gateway", options.gateway);
  if (options?.page) query.set("page", String(options.page));
  if (options?.limit) query.set("limit", String(options.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/api/fees/payout/transfers${suffix}`, {
    headers: buildAuthHeaders(token),
    cache: "no-store",
  });
  const body = (await parseErrorBody(response)) as
    | { success: boolean; total?: number; data?: PayoutTransfer[]; message?: string }
    | undefined;
  if (!response.ok || !body?.success) {
    throw new PrincipalApiError(
      body?.message || "Failed to load settlements",
      response.status,
      body,
    );
  }
  return { data: body.data ?? [], total: body.total ?? 0 };
}

// ─── Data Integrity Audit ─────────────────────────────────────────────────────

export type IntegrityFinding = {
  id: string;
  accountId: string;
  checkType: string;
  field: string;
  storedValue: string;
  expectedValue: string;
  detail: string | null;
  status: "open" | "acknowledged" | "resolved";
  detectedAt: string;
  resolvedAt: string | null;
};

export type IntegrityRun = {
  id: string;
  accountsChecked: number;
  findingsCount: number;
  durationMs: number;
  triggeredBy: string;
  createdAt: string;
};

export async function getIntegrityFindings(
  token: string,
  status?: "open" | "acknowledged" | "resolved",
): Promise<{ findings: IntegrityFinding[]; runs: IntegrityRun[] }> {
  const qs = status ? `?status=${status}` : "";
  const response = await fetch(`${API_BASE_URL}/api/fees/integrity/findings${qs}`, {
    headers: buildAuthHeaders(token),
    cache: "no-store",
  });
  const body = (await parseErrorBody(response)) as
    | { success: boolean; data?: IntegrityFinding[]; runs?: IntegrityRun[]; message?: string }
    | undefined;
  if (!response.ok || !body?.success) {
    throw new PrincipalApiError(
      body?.message || "Failed to load integrity findings",
      response.status,
      body,
    );
  }
  return { findings: body.data ?? [], runs: body.runs ?? [] };
}

export async function runIntegrityAudit(
  token: string,
): Promise<{ accountsChecked: number; findingsCount: number; durationMs: number }> {
  return request("/api/fees/integrity/run", token, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function updateIntegrityFinding(
  token: string,
  id: string,
  status: "acknowledged" | "resolved",
): Promise<IntegrityFinding> {
  return request<IntegrityFinding>(
    `/api/fees/integrity/findings/${encodeURIComponent(id)}`,
    token,
    { method: "POST", body: JSON.stringify({ status }) },
  );
}

// ─── Families (sibling households) ────────────────────────────────────────────

export type Family = {
  id: string;
  name: string;
  primaryContact: string;
  primaryEmail: string | null;
  siblingConcessionPercent: number;
  memberCount: number;
  combinedDue: number;
  createdAt: string;
};

export type FamilyMember = {
  applicationId: string;
  internalId: string;
  studentName: string;
  className: string | null;
  isPrimary: boolean;
  account: {
    id: string;
    totalCharged: number;
    totalConcession: number;
    totalPaid: number;
    totalDue: number;
    hasSiblingConcession: boolean;
  } | null;
};

export type FamilyDetail = {
  id: string;
  name: string;
  primaryContact: string;
  primaryEmail: string | null;
  address: string | null;
  siblingConcessionPercent: number;
  members: FamilyMember[];
  combined: {
    charged: number;
    concession: number;
    paid: number;
    due: number;
  };
};

export type FamilySuggestionGroup = {
  contact: string;
  suggestedName: string;
  members: Array<{
    applicationId: string;
    studentName: string;
    className: string | null;
    alreadyLinked: boolean;
  }>;
};

export async function listFamilies(token: string): Promise<Family[]> {
  return request<Family[]>("/api/fees/families", token);
}

export async function getFamily(
  token: string,
  id: string,
): Promise<FamilyDetail> {
  return request<FamilyDetail>(
    `/api/fees/families/${encodeURIComponent(id)}`,
    token,
  );
}

export async function createFamily(
  token: string,
  payload: {
    name: string;
    primaryContact: string;
    primaryEmail?: string;
    address?: string;
    siblingConcessionPercent?: number;
  },
): Promise<Family> {
  return request<Family>("/api/fees/families", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFamily(
  token: string,
  id: string,
  payload: {
    name?: string;
    primaryContact?: string;
    primaryEmail?: string;
    address?: string;
    siblingConcessionPercent?: number;
  },
): Promise<FamilyDetail> {
  return request<FamilyDetail>(
    `/api/fees/families/${encodeURIComponent(id)}`,
    token,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function getFamilySuggestions(
  token: string,
): Promise<FamilySuggestionGroup[]> {
  return request<FamilySuggestionGroup[]>(
    "/api/fees/families/suggestions",
    token,
  );
}

export async function linkFamilyMember(
  token: string,
  familyId: string,
  applicationId: string,
): Promise<FamilyDetail> {
  return request<FamilyDetail>(
    `/api/fees/families/${encodeURIComponent(familyId)}/members`,
    token,
    { method: "POST", body: JSON.stringify({ applicationId }) },
  );
}

export async function unlinkFamilyMember(
  token: string,
  familyId: string,
  applicationId: string,
): Promise<FamilyDetail> {
  return request<FamilyDetail>(
    `/api/fees/families/${encodeURIComponent(familyId)}/members/unlink`,
    token,
    { method: "POST", body: JSON.stringify({ applicationId }) },
  );
}

// Applies the family's sibling concession to every non-primary member.
// Mirrors reviewServiceRequest's raw-fetch style because the caller needs
// the `message` field the backend returns alongside `data`.
export async function applySiblingConcession(
  token: string,
  familyId: string,
): Promise<{ message: string; applied: number }> {
  const response = await fetch(
    `${API_BASE_URL}/api/fees/families/${encodeURIComponent(familyId)}/apply-sibling-concession`,
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({}),
      cache: "no-store",
    },
  );
  const body = (await parseErrorBody(response)) as
    | {
        success: boolean;
        message?: string;
        data?: { applied: number; message: string };
      }
    | undefined;
  if (!response.ok || !body?.success) {
    throw new PrincipalApiError(
      body?.message || "Failed to apply sibling concession",
      response.status,
      body,
    );
  }
  return {
    message: body.data?.message ?? body.message ?? "Sibling concession applied",
    applied: body.data?.applied ?? 0,
  };
}

// ─── Transport (routes, stops, assignments, monthly billing) ──────────────────

export type TransportStop = {
  id: string;
  name: string;
  distanceKm: number | null;
  monthlyFee: number; // RUPEES
  isActive: boolean;
};

export type TransportRoute = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  vehicleNumber: string | null;
  driverName: string | null;
  driverContact: string | null;
  isActive: boolean;
  stopCount: number;
  stops: TransportStop[];
};

export type TransportAssignment = {
  id: string;
  status: "active" | "stopped";
  startMonth: string;
  endMonth: string | null;
  applicationId: string;
  studentName: string;
  className: string | null;
  stopId: string;
  stopName: string;
  routeName: string;
  monthlyFee: number; // RUPEES
};

export type TransportBillingResult = {
  month: string;
  monthLabel: string;
  eligible: number;
  generated: number;
  skipped: number;
  totalBilled: number; // RUPEES
};

export async function listTransportRoutes(
  token: string,
): Promise<TransportRoute[]> {
  return request<TransportRoute[]>("/api/fees/transport/routes", token);
}

export async function createTransportRoute(
  token: string,
  payload: {
    name: string;
    code?: string;
    description?: string;
    vehicleNumber?: string;
    driverName?: string;
    driverContact?: string;
  },
): Promise<TransportRoute> {
  return request<TransportRoute>("/api/fees/transport/routes", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTransportRoute(
  token: string,
  id: string,
  payload: {
    name?: string;
    description?: string;
    vehicleNumber?: string;
    driverName?: string;
    driverContact?: string;
    isActive?: boolean;
  },
): Promise<TransportRoute> {
  return request<TransportRoute>(
    `/api/fees/transport/routes/${encodeURIComponent(id)}`,
    token,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function createTransportStop(
  token: string,
  payload: {
    routeId: string;
    name: string;
    distanceKm?: number;
    monthlyFee: number;
  },
): Promise<TransportStop> {
  return request<TransportStop>("/api/fees/transport/stops", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTransportStop(
  token: string,
  id: string,
  payload: {
    name?: string;
    distanceKm?: number;
    monthlyFee?: number;
    isActive?: boolean;
  },
): Promise<TransportStop> {
  return request<TransportStop>(
    `/api/fees/transport/stops/${encodeURIComponent(id)}`,
    token,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function listTransportAssignments(
  token: string,
  status?: "active" | "stopped",
): Promise<TransportAssignment[]> {
  const qs = status ? `?status=${status}` : "";
  return request<TransportAssignment[]>(
    `/api/fees/transport/assignments${qs}`,
    token,
  );
}

// Mirrors reviewServiceRequest's raw-fetch style because the caller needs
// the `message` field the backend returns alongside `data`.
export async function assignTransport(
  token: string,
  payload: { applicationId: string; stopId: string; startMonth: string },
): Promise<{ message: string; data: unknown }> {
  const response = await fetch(
    `${API_BASE_URL}/api/fees/transport/assignments`,
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
  const body = (await parseErrorBody(response)) as
    | { success: boolean; message?: string; data?: unknown }
    | undefined;
  if (!response.ok || !body?.success) {
    throw new PrincipalApiError(
      body?.message || "Failed to assign transport",
      response.status,
      body,
    );
  }
  return { message: body.message ?? "Student assigned", data: body.data };
}

// Raw-fetch style so the backend `message` is preserved.
export async function endTransportAssignment(
  token: string,
  id: string,
  endMonth: string,
): Promise<{ message: string; data: unknown }> {
  const response = await fetch(
    `${API_BASE_URL}/api/fees/transport/assignments/${encodeURIComponent(id)}/end`,
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ endMonth }),
      cache: "no-store",
    },
  );
  const body = (await parseErrorBody(response)) as
    | { success: boolean; message?: string; data?: unknown }
    | undefined;
  if (!response.ok || !body?.success) {
    throw new PrincipalApiError(
      body?.message || "Failed to end assignment",
      response.status,
      body,
    );
  }
  return { message: body.message ?? "Assignment ended", data: body.data };
}

// Raw-fetch style so the backend `message` is preserved alongside `data`.
export async function generateTransportBilling(
  token: string,
  month: string,
): Promise<{ message: string; data: TransportBillingResult }> {
  const response = await fetch(
    `${API_BASE_URL}/api/fees/transport/billing/generate`,
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ month }),
      cache: "no-store",
    },
  );
  const body = (await parseErrorBody(response)) as
    | { success: boolean; message?: string; data?: TransportBillingResult }
    | undefined;
  if (!response.ok || !body?.success || !body.data) {
    throw new PrincipalApiError(
      body?.message || "Failed to generate transport billing",
      response.status,
      body,
    );
  }
  return { message: body.message ?? "Transport billing generated", data: body.data };
}

// ── Tax & GST ────────────────────────────────────────────────────────────────

export interface TaxCertificate {
  studentName: string;
  applicationId: string;
  academicYear: string;
  totalPaidInPaise: number;
  breakdown: Array<{ chargeName: string; amountInPaise: number; paidInPaise: number }>;
  generatedAt: string;
}

export interface GstReportLine {
  feeHeadId: string | null;
  headName: string;
  gstRatePercent: number;
  baseAmountInPaise: number;
  taxAmountInPaise: number;
  totalAmountInPaise: number;
}

export interface GstReport {
  academicYear: string;
  totalGstCollectedInPaise: number;
  breakdown: GstReportLine[];
}

export async function getTaxCertificate(
  token: string,
  applicationId: string,
  year: string,
): Promise<TaxCertificate> {
  const response = await fetch(
    `${API_BASE_URL}/api/fees/tax-certificate/${encodeURIComponent(applicationId)}?year=${encodeURIComponent(year)}`,
    { headers: buildAuthHeaders(token), cache: "no-store" },
  );
  const body = (await parseErrorBody(response)) as
    | { success: boolean; message?: string; data?: TaxCertificate }
    | undefined;
  if (!response.ok || !body?.success || !body.data) {
    throw new PrincipalApiError(
      body?.message || "Failed to fetch tax certificate",
      response.status,
      body,
    );
  }
  return body.data;
}

export async function getGstReport(
  token: string,
  year: string,
): Promise<GstReport> {
  const response = await fetch(
    `${API_BASE_URL}/api/fees/gst-report?year=${encodeURIComponent(year)}`,
    { headers: buildAuthHeaders(token), cache: "no-store" },
  );
  const body = (await parseErrorBody(response)) as
    | { success: boolean; message?: string; data?: GstReport }
    | undefined;
  if (!response.ok || !body?.success || !body.data) {
    throw new PrincipalApiError(
      body?.message || "Failed to fetch GST report",
      response.status,
      body,
    );
  }
  return body.data;
}

export async function applyProRata(
  token: string,
  body: { accountId: string; joinDate: string; termStart: string; termEnd: string },
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/fees/pro-rata/apply`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const parsed = (await parseErrorBody(response)) as
    | { success: boolean; message?: string }
    | undefined;
  if (!response.ok || !parsed?.success) {
    throw new PrincipalApiError(
      parsed?.message || "Failed to apply pro-rata",
      response.status,
      parsed,
    );
  }
}

export async function bulkCarryForwardArrears(
  token: string,
  body: { fromYear: string; toYear: string },
): Promise<{ processed: number }> {
  const response = await fetch(
    `${API_BASE_URL}/api/fees/arrears/bulk-carry-forward`,
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  const parsed = (await parseErrorBody(response)) as
    | { success: boolean; message?: string; data?: { processed: number } }
    | undefined;
  if (!response.ok || !parsed?.success || !parsed.data) {
    throw new PrincipalApiError(
      parsed?.message || "Failed to carry forward arrears",
      response.status,
      parsed,
    );
  }
  return parsed.data;
}
