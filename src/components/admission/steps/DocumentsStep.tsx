import { Upload } from "lucide-react";

export function DocumentsStep() {
  return (
    <div className="rounded-2xl border border-dashed border-surface-divider bg-surface-muted/60 p-6 text-center">
      <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface-card text-brand-royal shadow-sm">
        <Upload size={20} />
      </div>
      <p className="text-sm font-semibold text-text-primary">Document Upload</p>
      <p className="mt-2 text-sm text-text-secondary">
        Backend supports document upload. UI dropzone integration can be
        connected next with multipart upload.
      </p>
      <p className="mt-2 text-xs text-text-muted">
        Suggested: Birth certificate, photo, transfer certificate, Aadhaar copy.
      </p>
    </div>
  );
}
