import { CheckCircle2, FileText, Info } from "lucide-react";

const REQUIRED_DOCUMENTS = [
  {
    name: "Birth Certificate",
    description: "Government-issued birth certificate of the student.",
  },
  {
    name: "Passport-size Photograph",
    description: "Recent colour photo of the student (white background).",
  },
  {
    name: "Aadhaar Card Copy",
    description: "Clear scan or photo of the student's Aadhaar card.",
  },
  {
    name: "Transfer Certificate (TC)",
    description:
      "Required only if the student is transferring from another school.",
  },
  {
    name: "Previous Mark Sheet / Report Card",
    description:
      "Most recent report card from the student's current school (if any).",
  },
  {
    name: "Address Proof",
    description:
      "Any government-issued document showing your residential address.",
  },
];

export function DocumentsStep() {
  return (
    <div className="space-y-5">
      <div className="callout callout-info flex items-start gap-3" role="note">
        <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">
            Documents are uploaded after payment
          </p>
          <p className="mt-0.5 text-xs opacity-90">
            You can finish the application and pay first. Once your payment is
            verified, you'll receive a secure link to upload these documents
            from your application status page.
          </p>
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3">Documents to keep ready</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {REQUIRED_DOCUMENTS.map((doc) => (
            <li
              key={doc.name}
              className="flex items-start gap-3 rounded-md border border-surface-border bg-surface-card px-4 py-3.5"
            >
              <FileText
                size={18}
                className="mt-0.5 shrink-0 text-brand-royal"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">
                  {doc.name}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {doc.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="callout callout-success flex items-start gap-3">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-xs">
          Tip: keep digital copies (PDF or clear photos under 5 MB each) on your
          phone or computer so you can upload quickly when prompted.
        </p>
      </div>
    </div>
  );
}
