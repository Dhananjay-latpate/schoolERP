"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { resumeAdmissionDraft } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { RESUME_DRAFT_KEY } from "./AdmissionForm";

const APPLICATION_ID_PATTERN = /^[A-Za-z0-9-]{4,}$/;
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

type Props = {
  className?: string;
  redirectTo?: string;
  onCancel?: () => void;
};

function humanizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  if (!raw) return "Couldn't load that draft. Please try again.";
  return raw;
}

export function ResumeDraftFormCard({
  className,
  redirectTo = "/admissions/apply",
  onCancel,
}: Props) {
  const router = useRouter();
  const [applicationId, setApplicationId] = useState("");
  const [mobile, setMobile] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    applicationId?: string;
    mobile?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedId = applicationId.trim();
    const trimmedMobile = mobile.trim();
    const errors: typeof fieldErrors = {};
    if (!APPLICATION_ID_PATTERN.test(trimmedId)) {
      errors.applicationId = "Enter the application ID you received when you saved the draft.";
    }
    if (!INDIAN_MOBILE_PATTERN.test(trimmedMobile)) {
      errors.mobile = "Enter the 10-digit mobile number you used on the form.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const snapshot = await resumeAdmissionDraft(trimmedId, trimmedMobile);
      if (snapshot.status && snapshot.status !== "draft") {
        // Already submitted — it can't be edited from the form. Send the
        // parent to the application's status page, where they track principal
        // review and complete payment (e.g. after a custom plan is approved).
        router.push(`/admissions/${snapshot.applicationId}`);
        return;
      }
      window.sessionStorage.setItem(RESUME_DRAFT_KEY, JSON.stringify(snapshot));
      router.push(redirectTo);
    } catch (error) {
      setFormError(humanizeError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      noValidate
      aria-describedby={formError ? "resume-form-error" : undefined}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="resume-applicationId">Application ID *</Label>
          <Input
            id="resume-applicationId"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            placeholder="e.g. RPS-2026-0042"
            autoComplete="off"
            aria-invalid={fieldErrors.applicationId ? "true" : "false"}
            className={fieldErrors.applicationId ? "input-error" : ""}
            disabled={submitting}
          />
          {fieldErrors.applicationId && (
            <p className="mt-1 text-xs text-status-error" role="alert">
              {fieldErrors.applicationId}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="resume-mobile">Mobile number *</Label>
          <Input
            id="resume-mobile"
            type="tel"
            inputMode="numeric"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="10-digit number you entered on the form"
            autoComplete="tel-national"
            aria-invalid={fieldErrors.mobile ? "true" : "false"}
            className={fieldErrors.mobile ? "input-error" : ""}
            disabled={submitting}
          />
          {fieldErrors.mobile && (
            <p className="mt-1 text-xs text-status-error" role="alert">
              {fieldErrors.mobile}
            </p>
          )}
        </div>

        {formError && (
          <div
            id="resume-form-error"
            className="flex items-start gap-3 rounded-xl border border-status-error/30 bg-status-error/5 px-3 py-2 text-sm text-status-error"
            role="alert"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{formError}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Loading…" : "Resume application"}
          </Button>
        </div>
      </div>
    </form>
  );
}
