import type { AdmissionFormValues } from "../types";

type ReviewStepProps = {
  values: AdmissionFormValues;
};

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

const PAYMENT_LABELS: Record<string, string> = {
  full_payment: "Pay Full Amount Now",
  installment: "Pay in Standard Installments",
  custom_payment: "Custom Payment Arrangement (Hardship)",
};

function formatDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatAadhaar(value?: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 12) return value;
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
}

type ReviewSection = {
  title: string;
  items: Array<{ label: string; value: string | undefined }>;
};

function buildSections(values: AdmissionFormValues): ReviewSection[] {
  const fullName = [values.firstName, values.middleName, values.lastName]
    .filter(Boolean)
    .join(" ");

  return [
    {
      title: "Student Information",
      items: [
        { label: "Full Name", value: fullName },
        { label: "Gender", value: GENDER_LABELS[values.gender] ?? values.gender },
        { label: "Date of Birth", value: formatDate(values.dateOfBirth) },
        { label: "Place of Birth", value: values.placeOfBirth },
        { label: "Nationality", value: values.nationality },
        { label: "Mother Tongue", value: values.motherTongue },
      ],
    },
    {
      title: "Parent / Guardian",
      items: [
        { label: "Father's Name", value: values.fatherName },
        { label: "Mother's Name", value: values.motherName },
        { label: "Emergency Contact", value: values.emergencyContact },
        { label: "Residential Address", value: values.address },
      ],
    },
    {
      title: "Academic & Identification",
      items: [
        { label: "Applying for Class", value: values.classAdmitted },
        { label: "Aadhaar Number", value: formatAadhaar(values.adharNumber) },
        { label: "Religion", value: values.religion },
        { label: "Caste", value: values.caste },
        { label: "Sub Caste", value: values.subCaste },
      ],
    },
    {
      title: "Payment Preference",
      items: [
        {
          label: "Payment Method",
          value: values.paymentMethod
            ? PAYMENT_LABELS[values.paymentMethod] ?? values.paymentMethod
            : undefined,
        },
        ...(values.paymentMethod === "custom_payment"
          ? [
              {
                label: "Requested Amount (₹)",
                value:
                  typeof values.customPaymentAmount === "number"
                    ? values.customPaymentAmount.toLocaleString("en-IN")
                    : undefined,
              },
              { label: "Reason", value: values.customPaymentReason },
            ]
          : []),
      ],
    },
  ];
}

export function ReviewStep({ values }: ReviewStepProps) {
  const sections = buildSections(values);

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Review your details before continuing to fees and payment. You can go
        back to any earlier step from the progress bar above.
      </p>

      {sections.map((section) => {
        const visibleItems = section.items.filter(
          (item) => item.value && String(item.value).trim().length > 0,
        );
        if (visibleItems.length === 0) return null;

        return (
          <div key={section.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-secondary">
              {section.title}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-surface-border bg-white p-3"
                >
                  <p className="text-xs uppercase tracking-wide text-text-muted">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-text-primary break-words">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
