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
import { useRouter } from "next/navigation";
import { useForm, type FieldErrors } from "react-hook-form";
import { z } from "zod";

import {
  submitAdmission,
  createCustomPlan,
  getActiveAdmissionSessionPublic,
  type AdmissionRecord,
} from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    middleName: z.string().optional(),
    lastName: z.string().min(1, "Last name is required"),
    gender: z.enum(["male", "female", "other"], {
      errorMap: () => ({ message: "Gender is required" }),
    }),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    classAdmitted: z.string().min(1, "Class is required"),
    fatherName: z.string().min(1, "Father name is required"),
    motherName: z.string().min(1, "Mother name is required"),
    address: z.string().min(1, "Address is required"),
    emergencyContact: z.string().min(10, "Emergency contact is required"),
    placeOfBirth: z.string().optional(),
    nationality: z.string().optional(),
    religion: z.string().optional(),
    caste: z.string().optional(),
    subCaste: z.string().optional(),
    adharNumber: z.string().optional(),
    motherTongue: z.string().optional(),
    paymentMethod: z
      .enum(["full_payment", "installment", "custom_payment"])
      .optional(),
    customPaymentAmount: z
      .number({ invalid_type_error: "Enter a valid amount" })
      .positive("Amount must be greater than zero")
      .optional(),
    customPaymentReason: z.string().optional(),
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
  "Upload required supporting documents.",
  "Review all information carefully before moving to fees.",
  "Choose how you'd like to pay — full payment, standard installments, or request a custom arrangement.",
];

const STEP_FIELDS: Record<number, Array<keyof AdmissionFormValues>> = {
  0: ["firstName", "lastName", "gender", "dateOfBirth"],
  1: ["fatherName", "motherName", "address", "emergencyContact"],
  2: ["classAdmitted"],
  3: [],
  4: [],
  5: [],
  6: ["paymentMethod"],
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
  placeOfBirth: 3,
  nationality: 3,
  religion: 3,
  caste: 3,
  subCaste: 3,
  adharNumber: 3,
  motherTongue: 3,
  paymentMethod: 6,
  customPaymentAmount: 6,
  customPaymentReason: 6,
};

type Phase = "form" | "payment" | "done";

interface DraftNotification {
  applicationId: string;
}

export function AdmissionForm() {
  const router = useRouter();
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

  useEffect(() => {
    getActiveAdmissionSessionPublic()
      .then((s) => setActiveSessionCode(s?.sessionCode ?? null))
      .catch(() => setActiveSessionCode(null));
  }, []);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    watch,
    formState: { errors },
  } = useForm<AdmissionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
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
      paymentMethod: "full_payment",
      customPaymentAmount: undefined,
      customPaymentReason: "",
    },
  });

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

  const onSubmit = handleSubmit(
    async (values) => {
      if (submitLockRef.current) return;
      submitLockRef.current = true;

      // Guard: application already submitted — re-enter payment flow instead of creating another
      if (submittedApp && submittedApp.status !== "draft") {
        if (values.paymentMethod === "custom_payment") {
          router.push(`/admissions/${submittedApp.applicationId}`);
          submitLockRef.current = false;
          return;
        }
        setPhase("payment");
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
          // Create the custom plan then redirect to status page
          await createCustomPlan(
            response.applicationId,
            values.customPaymentAmount!,
            values.customPaymentReason!,
          );
          router.push(`/admissions/${response.applicationId}`);
          return;
        }

        setPhase("payment");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while submitting. Please try again.",
        );
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
    draftLockRef.current = true;

    setErrorMessage(null);
    setIsSavingDraft(true);
    try {
      const values = getValues();
      // Strip empty date/class — backend cannot coerce empty string to Date or find a class by empty id
      const payload = {
        applicationId: submittedApp?.applicationId,
        ...values,
        status: "draft" as const,
      };
      if (!payload.dateOfBirth)
        delete (payload as Record<string, unknown>).dateOfBirth;
      if (!payload.classAdmitted)
        delete (payload as Record<string, unknown>).classAdmitted;
      const response = await submitAdmission(payload);
      setSubmittedApp(response);
      setDraftNotification({ applicationId: response.applicationId });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save draft. Please try again.",
      );
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
        return <FeeStep register={register} errors={errors} watch={watch} />;
    }
  };

  const isAlreadySubmitted = !!submittedApp && submittedApp.status !== "draft";

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
            // Return to review step but keep submittedApp — onSubmit guard prevents re-creation
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
      {/* Main form card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          <Card className="overflow-hidden">
            {/* Horizontal stepper header */}
            <div className="border-b border-surface-border bg-surface-muted px-6 pt-6 pb-5">
              <p className="mb-5 text-center text-[11px] font-bold uppercase tracking-widest text-text-secondary">
                Admission Application
                {activeSessionCode ? ` ${activeSessionCode}` : ""}
              </p>
              <FormStepper currentStep={step} />
            </div>

            {/* Step title */}
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
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
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
                    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
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

              {/* Already-submitted warning on review step */}
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

                {/* Navigation bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-border pt-5">
                  {/* Save Draft */}
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

                  {/* Back / Next / Submit */}
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
