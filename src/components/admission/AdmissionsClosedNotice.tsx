"use client";

import { Calendar, ClipboardList, Loader2, Lock, Sparkles } from "lucide-react";
import type { AdmissionSetupStatus } from "@/lib/api";
import { Card } from "@/components/ui/Card";

interface AdmissionsClosedNoticeProps {
  status: AdmissionSetupStatus | null;
  loading?: boolean;
}

const REASON_DETAILS: Record<
  AdmissionSetupStatus["reason"],
  { title: string; icon: typeof Calendar; tone: "amber" | "blue" }
> = {
  ready: {
    title: "Admissions are open",
    icon: Sparkles,
    tone: "blue",
  },
  no_session: {
    title: "Admissions are not yet open",
    icon: Calendar,
    tone: "amber",
  },
  no_classes: {
    title: "Admissions are being prepared",
    icon: ClipboardList,
    tone: "amber",
  },
  missing_fee_structures: {
    title: "Admissions are being finalised",
    icon: Lock,
    tone: "amber",
  },
  before_open: {
    title: "Admissions haven't opened yet",
    icon: Calendar,
    tone: "amber",
  },
  after_close: {
    title: "Admissions have closed",
    icon: Lock,
    tone: "amber",
  },
};

const formatWindowDate = (iso?: string | null): string | null =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

export function AdmissionsClosedNotice({
  status,
  loading,
}: AdmissionsClosedNoticeProps) {
  if (loading || !status) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="h-6 w-6 animate-spin text-brand-royal"
            aria-hidden="true"
          />
          <p className="text-sm text-text-secondary">
            Checking admission status…
          </p>
        </div>
      </Card>
    );
  }

  const detail = REASON_DETAILS[status.reason] ?? REASON_DETAILS.no_session;
  const Icon = detail.icon;

  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <div
        className={`mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${
          detail.tone === "amber"
            ? "bg-brand-amber-light text-brand-amber"
            : "bg-brand-sky-light text-brand-royal"
        }`}
      >
        <Icon size={28} aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold text-text-primary">{detail.title}</h2>
      <p className="mt-2 text-sm text-text-secondary">{status.message}</p>

      {status.sessionCode && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary">
          <Calendar size={12} aria-hidden="true" />
          Academic Year {status.sessionCode}
        </p>
      )}

      {status.reason === "missing_fee_structures" && status.totalClasses > 0 && (
        <p className="mt-4 text-xs text-text-muted">
          {status.classesWithFeeStructures} of {status.totalClasses} classes
          ready
        </p>
      )}

      {status.reason === "before_open" && formatWindowDate(status.opensAt) && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-amber-light px-3 py-1 text-xs font-semibold text-brand-amber">
          <Calendar size={12} aria-hidden="true" />
          Opens {formatWindowDate(status.opensAt)}
        </p>
      )}

      {status.reason === "after_close" && formatWindowDate(status.closesAt) && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-amber-light px-3 py-1 text-xs font-semibold text-brand-amber">
          <Lock size={12} aria-hidden="true" />
          Closed {formatWindowDate(status.closesAt)}
        </p>
      )}

      <div className="mt-6 rounded-xl border border-surface-border bg-surface-muted/60 px-4 py-3 text-left">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
          What's next?
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          Please come back once the school announces that admissions are open.
          If you've already started an application earlier, you can still log in
          to your application status page using your application ID and mobile
          number.
        </p>
      </div>
    </Card>
  );
}
