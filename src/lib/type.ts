export type ApiEnvelope<T> = {
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

export type PrincipalApplicationListResponse = {
  success: true;
  total: number;
  data: PrincipalApplication[];
};
