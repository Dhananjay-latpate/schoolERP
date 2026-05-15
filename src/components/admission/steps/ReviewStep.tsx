import type { AdmissionFormValues } from "../types";

type ReviewStepProps = {
  values: AdmissionFormValues;
};

const labelMap: Array<{ key: keyof AdmissionFormValues; label: string }> = [
  { key: "firstName", label: "First Name" },
  { key: "middleName", label: "Middle Name" },
  { key: "lastName", label: "Last Name" },
  { key: "gender", label: "Gender" },
  { key: "dateOfBirth", label: "Date of Birth" },
  { key: "classAdmitted", label: "Class" },
  { key: "fatherName", label: "Father Name" },
  { key: "motherName", label: "Mother Name" },
  { key: "emergencyContact", label: "Emergency Contact" },
  { key: "address", label: "Address" },
  { key: "paymentMethod", label: "Payment Method" },
];

export function ReviewStep({ values }: ReviewStepProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        Review your details before submitting. You can still go back and edit
        any step.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {labelMap.map((item) => {
          const value = values[item.key];
          return (
            <div
              key={item.key}
              className="rounded-lg border border-surface-border bg-surface-card p-3"
            >
              <p className="text-xs uppercase tracking-wide text-text-muted">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {String(value || "-")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
