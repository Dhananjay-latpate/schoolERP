"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Save,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type DefaultValues, type FieldErrors } from "react-hook-form";
import { z } from "zod";

import {
  submitAdmission,
  createCustomPlan,
  getActiveAdmissionSessionPublic,
  getAdmissionSetupStatus,
  type AdmissionDraftSnapshot,
  type AdmissionRecord,
  type AdmissionSetupStatus,
} from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import { AdmissionsClosedNotice } from "./AdmissionsClosedNotice";
import { FormStepper } from "./FormStepper";
import { PaymentPanel } from "./PaymentPanel";
import { AcademicStep } from "./steps/AcademicStep";
import { AdditionalInfoStep } from "./steps/AdditionalInfoStep";
import { DocumentsStep } from "./steps/DocumentsStep";
import { FeeStep } from "./steps/FeeStep";
import { ParentInfoStep } from "./steps/ParentInfoStep";
import { ReviewStep } from "./steps/ReviewStep";
import { StudentInfoStep } from "./steps/StudentInfoStep";
import type { AdmissionFormValues } from "./types";

// Allow letters, spaces, hyphens, apostrophes, and the period (for initials).
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.\-]*$/;
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;
const AADHAAR_PATTERN = /^\d{12}$/;

// Map raw API error strings into human, action-oriented messages so parents
// don't see "Network request failed" / "500 Internal Server Error" / "Class
// is required" without context.
function humanizeSubmitError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  if (!raw) {
    return "Something went wrong while submitting. Please try again.";
  }
  const lower = raw.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed")
  ) {
    return "Couldn't reach the admissions service. Check your internet connection and try again.";
  }
  if (lower.includes("fee structure")) {
    return "Fees aren't fully configured for this class yet. Please contact the school admissions office.";
  }
  if (lower.includes("class") && lower.includes("not available")) {
    return "The selected class is not available for the current admission session. Please pick a different class on the Academic Details step.";
  }
  if (lower.includes("not commenced") || lower.includes("not yet open")) {
    return "Admissions are not open yet. Please come back when the school announces the start date.";
  }
  if (lower.startsWith("error submitting application")) {
    return "The admissions service couldn't process this application. Please try again in a minute, or contact the school if it persists.";
  }
  return raw;
}

function humanizeDraftError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  if (!raw) return "Failed to save draft. Please try again.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed")
  ) {
    return "Couldn't save your draft — we lost the connection. Please try again.";
  }
  return `Couldn't save your draft. ${raw}`;
}

function isAgeWithin(value: string, minYears: number, maxYears: number) {
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  if (dob.getTime() > today.getTime()) return false;
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= minYears && age <= maxYears;
}

const requiredName = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(50, `${label} must be 50 characters or fewer`)
    .regex(
      NAME_PATTERN,
      `${label} can only contain letters, spaces, hyphens, apostrophes, and periods`,
    );

const optionalText = (max: number, label?: string) =>
  z
    .string()
    .trim()
    .max(max, label ? `${label} is too long` : "Too long")
    .optional()
    .default("");

const schema = z
  .object({
    firstName: requiredName("First name"),
    middleName: z
      .string()
      .trim()
      .max(50, "Middle name must be 50 characters or fewer")
      .refine(
        (v) => v.length === 0 || NAME_PATTERN.test(v),
        "Middle name can only contain letters, spaces, hyphens, apostrophes, and periods",
      )
      .optional()
      .default(""),
    lastName: requiredName("Last name"),
    gender: z.enum(["male", "female", "other"], {
      errorMap: () => ({ message: "Please select a gender" }),
    }),
    dateOfBirth: z
      .string()
      .min(1, "Date of birth is required")
      .refine(
        (v) => isAgeWithin(v, 3, 25),
        "Date of birth must be a real date for a student aged 3 to 25 years",
      ),
    classAdmitted: z.string().trim().min(1, "Please select a class"),
    fatherName: requiredName("Father's name"),
    motherName: requiredName("Mother's name"),
    address: z
      .string()
      .trim()
      .min(8, "Address must be at least 8 characters")
      .max(300, "Address must be 300 characters or fewer"),
    emergencyContact: z
      .string()
      .trim()
      .regex(
        INDIAN_MOBILE_PATTERN,
        "Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)",
      ),
    placeOfBirth: optionalText(80, "Place of birth"),
    nationality: optionalText(40, "Nationality"),
    religion: optionalText(40, "Religion"),
    caste: optionalText(40, "Caste"),
    subCaste: optionalText(40, "Sub-caste"),
    adharNumber: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s+/g, ""))
      .refine(
        (v) => v.length === 0 || AADHAAR_PATTERN.test(v),
        "Aadhaar number must be exactly 12 digits",
      )
      .optional()
      .default(""),
    motherTongue: optionalText(40, "Mother tongue"),
    paymentMethod: z.enum(
      ["full_payment", "installment", "custom_payment"],
      { errorMap: () => ({ message: "Please choose a payment method" }) },
    ),
    customPaymentAmount: z
      .number({ invalid_type_error: "Enter a valid amount" })
      .positive("Amount must be greater than zero")
      .optional(),
    customPaymentReason: z.string().optional(),
    installmentOptionId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === "custom_payment") {
      if (!data.customPaymentAmount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customPaymentAmount"],
          message: "Requested amount is required",
        });
      }
      if (
        !data.customPaymentReason ||
        data.customPaymentReason.trim().length < 10
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customPaymentReason"],
          message: "Please provide a reason (at least 10 characters)",
        });
      }
    }
    if (data.paymentMethod === "installment" && !data.installmentOptionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installmentOptionId"],
        message: "Please pick an installment plan",
      });
    }
  });

const STEPS = [
  "Student Information",
  "Parent Information",
  "Academic Details",
  "Additional Details",
  "Documents",
  "Review",
  "Fees & Payment",
] as const;

const STEP_DESCRIPTIONS = [
  "Enter the student's personal and identification details.",
  "Provide parent or guardian names and contact information.",
  "Select the class for admission. Fees are confirmed in the final step.",
  "Optional details such as religion, caste, and Aadhaar number.",
  "What you'll need ready — uploads happen after payment.",
  "Review all information carefully before moving to fees.",
  "Choose how you'd like to pay — full payment, standard installments, or request a custom arrangement.",
];

const STEP_PAGE_TITLES = [
  "Student Information",
  "Parent Information",
  "Academic Details",
  "Additional Details",
  "Required Documents",
  "Review Application",
  "Fees & Payment",
];

const STEP_FIELDS: Record<number, Array<keyof AdmissionFormValues>> = {
  0: ["firstName", "middleName", "lastName", "gender", "dateOfBirth"],
  1: ["fatherName", "motherName", "address", "emergencyContact"],
  2: ["classAdmitted"],
  3: ["adharNumber"],
  4: [],
  5: [],
  6: ["paymentMethod", "installmentOptionId", "customPaymentAmount", "customPaymentReason"],
};

const FIELD_TO_STEP: Partial<Record<keyof AdmissionFormValues, number>> = {
  firstName: 0,
  middleName: 0,
  lastName: 0,
  gender: 0,
  dateOfBirth: 0,
  fatherName: 1,
  motherName: 1,
  address: 1,
  emergencyContact: 1,
  classAdmitted: 2,
  placeOfBirth: 0,
  nationality: 0,
  religion: 3,
  caste: 3,
  subCaste: 3,
  adharNumber: 3,
  motherTongue: 0,
  paymentMethod: 6,
  customPaymentAmount: 6,
  customPaymentReason: 6,
  installmentOptionId: 6,
};

type Phase = "form" | "payment" | "done";

interface DraftNotification {
  applicationId: string;
}

// sessionStorage key for handing a fetched draft from the Resume page/modal
// to this form. Cleared by the "+ New Application" button.
export const RESUME_DRAFT_KEY = "admission:resume-draft";

function snapshotToFormValues(
  snapshot: AdmissionDraftSnapshot,
): Partial<AdmissionFormValues> {
  const gender =
    snapshot.gender === "male" ||
    snapshot.gender === "female" ||
    snapshot.gender === "other"
      ? snapshot.gender
      : undefined;
  return {
    firstName: snapshot.firstName,
    middleName: snapshot.middleName,
    lastName: snapshot.lastName,
    gender,
    dateOfBirth: snapshot.dateOfBirth,
    classAdmitted: snapshot.classAdmitted,
    fatherName: snapshot.fatherName,
    motherName: snapshot.motherName,
    address: snapshot.address,
    emergencyContact: snapshot.emergencyContact,
    placeOfBirth: snapshot.placeOfBirth,
    nationality: snapshot.nationality,
    religion: snapshot.religion,
    caste: snapshot.caste,
    subCaste: snapshot.subCaste,
    adharNumber: snapshot.adharNumber,
    motherTongue: snapshot.motherTongue,
  };
}

const DEFAULT_VALUES: DefaultValues<AdmissionFormValues> = {
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "male",
  dateOfBirth: "",
  classAdmitted: "",
  fatherName: "",
  motherName: "",
  address: "",
  emergencyContact: "",
  placeOfBirth: "",
  nationality: "Indian",
  religion: "",
  caste: "",
  subCaste: "",
  adharNumber: "",
  motherTongue: "",
  paymentMethod: undefined,
  customPaymentAmount: undefined,
  customPaymentReason: "",
  installmentOptionId: "",
};

export function AdmissionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The "+ New Application" link adds ?fresh=<timestamp>; we use that to
  // remount the form and clear all state.
  const freshKey = searchParams.get("fresh") ?? "";
  const submitLockRef = useRef(false);
  const draftLockRef = useRef(false);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("form");
  const [submittedApp, setSubmittedApp] = useState<AdmissionRecord | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftNotification, setDraftNotification] =
    useState<DraftNotification | null>(null);
  const [activeSessionCode, setActiveSessionCode] = useState<string | null>(
    null,
  );
  const [setupStatus, setSetupStatus] = useState<AdmissionSetupStatus | null>(
    null,
  );
  const [setupLoading, setSetupLoading] = useState(true);

  useEffect(() => {
    getActiveAdmissionSessionPublic()
      .then((s) => setActiveSessionCode(s?.sessionCode ?? null))
      .catch(() => setActiveSessionCode(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSetupLoading(true);
    getAdmissionSetupStatus()
      .then((status) => {
        if (cancelled) return;
        setSetupStatus(status);
      })
      .catch(() => {
        if (cancelled) return;
        // If the status endpoint is unreachable we fail-closed — never show
        // the form when we can't confirm the school has set up admissions.
        setSetupStatus({
          isOpen: false,
          reason: "no_session",
          sessionCode: null,
          totalClasses: 0,
          classesWithFeeStructures: 0,
          message:
            "We couldn't reach the admissions service. Please refresh in a moment.",
        });
      })
      .finally(() => {
        if (cancelled) return;
        setSetupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AdmissionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  // Reset everything when the freshKey changes (i.e. user clicked
  // "+ New Application"). The header link appends ?fresh=<ts>.
  useEffect(() => {
    if (!freshKey) return;
    setStep(0);
    setPhase("form");
    setSubmittedApp(null);
    setErrorMessage(null);
    setDraftNotification(null);
    reset(DEFAULT_VALUES);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(RESUME_DRAFT_KEY);
    }
  }, [freshKey, reset]);

  // Hydrate from a resumed draft (placed in sessionStorage by the Resume
  // page/modal). We replay all field values into the form and remember the
  // applicationId so subsequent draft saves update the same row.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (freshKey) return;
    const raw = window.sessionStorage.getItem(RESUME_DRAFT_KEY);
    if (!raw) return;
    try {
      const snapshot = JSON.parse(raw) as AdmissionDraftSnapshot;
      if (!snapshot?.applicationId) return;
      reset({ ...DEFAULT_VALUES, ...snapshotToFormValues(snapshot) });
      setSubmittedApp({
        applicationId: snapshot.applicationId,
        status: snapshot.status,
        firstName: snapshot.firstName,
        lastName: snapshot.lastName,
        gender: (snapshot.gender as AdmissionRecord["gender"]) ?? "male",
        fatherName: snapshot.fatherName,
        motherName: snapshot.motherName,
        address: snapshot.address,
        emergencyContact: snapshot.emergencyContact,
      });
      setStep(0);
    } catch {
      window.sessionStorage.removeItem(RESUME_DRAFT_KEY);
    }
  }, [freshKey, reset]);

  // Keep the document title in sync with the current step for clearer
  // browser history entries / tab labels.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (phase === "payment") {
      document.title = "Payment — Resillix Admissions";
      return;
    }
    if (phase === "done") {
      document.title = "Submitted — Resillix Admissions";
      return;
    }
    document.title = `${STEP_PAGE_TITLES[step]} — Resillix Admissions`;
  }, [step, phase]);

  // Auto-dismiss draft notification after 6 s
  useEffect(() => {
    if (!draftNotification) return;
    const t = setTimeout(() => setDraftNotification(null), 6000);
    return () => clearTimeout(t);
  }, [draftNotification]);

  const goNext = async () => {
    const fields = STEP_FIELDS[step] ?? [];
    if (fields.length > 0) {
      const valid = await trigger(fields, { shouldFocus: true });
      if (!valid) return;
    }
    setErrorMessage(null);
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setErrorMessage(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const goToStep = (target: number) => {
    if (target < 0 || target >= STEPS.length) return;
    if (target >= step) return; // only backward navigation via stepper
    setErrorMessage(null);
    setStep(target);
  };

  const onSubmit = handleSubmit(
    async (values) => {
      if (submitLockRef.current) return;
      submitLockRef.current = true;

      // If the parent is bouncing back to the form after already finalising,
      // route by the actual application status (the source of truth):
      //   - payment_pending → resume payment (full / installment)
      //   - submitted       → custom plan awaiting principal → status page
      //   - anything else   → status page
      if (submittedApp && submittedApp.status !== "draft") {
        if (submittedApp.status === "payment_pending") {
          setPhase("payment");
        } else {
          router.push(`/admissions/${submittedApp.applicationId}`);
        }
        submitLockRef.current = false;
        return;
      }
      setErrorMessage(null);
      setIsSubmitting(true);
      try {
        const response = await submitAdmission({
          applicationId: submittedApp?.applicationId,
          ...values,
          status: "submitted",
        });
        setSubmittedApp(response);

        if (values.paymentMethod === "custom_payment") {
          // Custom hardship: register the plan request on the fees module
          // (the application itself is already in `submitted` waiting for
          // principal review — the server handled that transition).
          await createCustomPlan(
            response.applicationId,
            values.customPaymentAmount!,
            values.customPaymentReason!,
          );
          router.push(`/admissions/${response.applicationId}`);
          return;
        }

        // Full payment / installment: server returns `payment_pending` —
        // mount the PaymentPanel so the parent can pay immediately.
        setPhase("payment");
      } catch (error) {
        setErrorMessage(humanizeSubmitError(error));
      } finally {
        setIsSubmitting(false);
        submitLockRef.current = false;
      }
    },
    (invalidErrors: FieldErrors<AdmissionFormValues>) => {
      const invalidEntries = Object.entries(invalidErrors) as Array<
        [keyof AdmissionFormValues, unknown]
      >;

      if (invalidEntries.length === 0) {
        setErrorMessage("Please review the form and try again.");
        return;
      }

      const [firstInvalidField] = invalidEntries[0];
      const invalidStep = FIELD_TO_STEP[firstInvalidField];
      if (invalidStep !== undefined && invalidStep !== step) {
        setStep(invalidStep);
      }

      const fieldError = invalidErrors[firstInvalidField];
      const message =
        fieldError && typeof fieldError === "object" && "message" in fieldError
          ? String(fieldError.message)
          : "Please complete all required fields before submitting.";

      setErrorMessage(message);
    },
  );

  const saveDraft = async () => {
    if (draftLockRef.current) return;

    const values = getValues();
    const selectedClass = values.classAdmitted?.trim();
    if (!selectedClass) {
      setErrorMessage(
        "Please select a class on the Academic Details step before saving as draft.",
      );
      const academicStep = FIELD_TO_STEP.classAdmitted;
      if (academicStep !== undefined && academicStep !== step) {
        setStep(academicStep);
      }
      return;
    }

    draftLockRef.current = true;
    setErrorMessage(null);
    setIsSavingDraft(true);
    try {
      const payload = {
        applicationId: submittedApp?.applicationId,
        ...values,
        status: "draft" as const,
      };
      if (!payload.dateOfBirth)
        delete (payload as Record<string, unknown>).dateOfBirth;
      const response = await submitAdmission(payload);
      setSubmittedApp(response);
      setDraftNotification({ applicationId: response.applicationId });
    } catch (error) {
      setErrorMessage(humanizeDraftError(error));
    } finally {
      setIsSavingDraft(false);
      draftLockRef.current = false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StudentInfoStep register={register} errors={errors} />;
      case 1:
        return <ParentInfoStep register={register} errors={errors} />;
      case 2:
        return (
          <AcademicStep register={register} errors={errors} watch={watch} />
        );
      case 3:
        return <AdditionalInfoStep register={register} errors={errors} />;
      case 4:
        return <DocumentsStep />;
      case 5:
        return <ReviewStep values={getValues()} />;
      case 6:
      default:
        return (
          <FeeStep
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        );
    }
  };

  const isAlreadySubmitted = !!submittedApp && submittedApp.status !== "draft";

  // ── Closed / Loading Phase ─────────────────────────────────
  // Show the closed notice while we're confirming setup status, and stay on
  // it whenever the school hasn't fully configured admissions. This is the
  // single gate keeping parents off a half-configured form.
  if (setupLoading) {
    return <AdmissionsClosedNotice status={null} loading />;
  }
  if (!setupStatus?.isOpen) {
    return <AdmissionsClosedNotice status={setupStatus} />;
  }

  // ── Payment Phase ──────────────────────────────────────────
  if (phase === "payment" && submittedApp) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <PaymentPanel
          application={submittedApp}
          onSuccess={() =>
            router.push(`/admissions/${submittedApp.applicationId}`)
          }
          onBack={() => {
            setStep(STEPS.length - 1);
            setPhase("form");
          }}
        />
      </div>
    );
  }

  // ── Form Phase ─────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl">
      {/* Top-level page heading for screen readers + landmark navigation.
          Visually presented as the uppercase "Admission Application
          2025-26" line so we don't change the design. */}
      <h1 className="sr-only">
        Admission Application{activeSessionCode ? ` ${activeSessionCode}` : ""}
      </h1>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          <Card className="overflow-hidden">
            <div className="border-b border-surface-border bg-surface-muted px-6 pt-6 pb-5">
              <p
                aria-hidden="true"
                className="mb-5 text-center text-[11px] font-bold uppercase tracking-widest text-text-secondary"
              >
                Admission Application
                {activeSessionCode ? ` ${activeSessionCode}` : ""}
              </p>
              <FormStepper currentStep={step} onStepClick={goToStep} />
            </div>

            <div className="border-b border-surface-border px-6 py-4">
              <h2 className="text-lg font-bold text-text-primary">
                {STEPS[step]}
              </h2>
              <p className="mt-0.5 text-sm text-text-secondary">
                {STEP_DESCRIPTIONS[step]}
              </p>
            </div>

            <div className="p-6 sm:p-7">
              {/* Draft saved notification */}
              <AnimatePresence>
                {draftNotification && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                      role="status"
                      aria-live="polite"
                    >
                      <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-emerald-800">
                          Draft saved successfully
                        </p>
                        <p className="mt-0.5 text-xs text-emerald-700">
                          Application ID:{" "}
                          <span className="font-mono font-bold">
                            {draftNotification.applicationId}
                          </span>{" "}
                          — You can continue filling the form.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDraftNotification(null)}
                        className="shrink-0 rounded-md p-0.5 text-emerald-600 transition-colors hover:bg-emerald-100"
                        aria-label="Dismiss notification"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error banner */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
                      role="alert"
                      aria-live="assertive"
                    >
                      <AlertCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-rose-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-rose-800">
                          Something went wrong
                        </p>
                        <p className="mt-0.5 text-xs text-rose-700">
                          {errorMessage}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setErrorMessage(null)}
                        className="shrink-0 rounded-md p-0.5 text-rose-600 transition-colors hover:bg-rose-100"
                        aria-label="Dismiss error"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isAlreadySubmitted && step === STEPS.length - 1 && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Application already submitted
                    </p>
                    <p className="mt-0.5 text-xs text-amber-700">
                      Application ID:{" "}
                      <span className="font-mono font-bold">
                        {submittedApp?.applicationId}
                      </span>
                      . Click &ldquo;Proceed to Payment&rdquo; to complete your
                      payment.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={onSubmit} noValidate className="space-y-6">
                {renderStep()}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-border pt-5">
                  {step >= 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={saveDraft}
                      disabled={isSavingDraft || isSubmitting}
                      className="gap-1.5"
                    >
                      {isSavingDraft ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save size={15} />
                          Save Draft
                        </>
                      )}
                    </Button>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={goBack}
                      disabled={step === 0 || isSubmitting}
                    >
                      <ChevronLeft size={16} />
                      Back
                    </Button>

                    {step < STEPS.length - 1 ? (
                      <Button type="button" onClick={goNext}>
                        Next
                        <ChevronRight size={16} />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isSubmitting || isSavingDraft}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                            Submitting…
                          </>
                        ) : isAlreadySubmitted ? (
                          <>
                            <CreditCard size={15} />
                            Proceed to Payment
                          </>
                        ) : (
                          <>
                            <CreditCard size={15} />
                            Submit & Continue to Payment
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
