"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type {
  AdmissionSessionStatus,
  PrincipalClass,
  PrincipalFeeStructure,
} from "@/lib/principalApi";

// ── Admission session code helpers ───────────────────────────────────────────
// A session code is "YYYY-YY" (e.g. 2026-27). The Indian academic year flips
// in June, matching the backend's inferCurrentAdmissionSessionCode helper.

export const SESSION_CODE_PATTERN = /^\d{4}-\d{2}$/;

export function formatSessionCode(startYear: number): string {
  const endShort = ((startYear + 1) % 100).toString().padStart(2, "0");
  return `${startYear}-${endShort}`;
}

export function currentSessionStartYear(date = new Date()): number {
  const month = date.getMonth() + 1;
  return month >= 6 ? date.getFullYear() : date.getFullYear() - 1;
}

export function inferNextSessionCode(): string {
  return formatSessionCode(currentSessionStartYear() + 1);
}

// A sliding window of session codes (1 past → 5 future) plus any extra codes
// already attached to existing records, so legacy years stay selectable.
export function buildSessionCodeOptions(
  extra: Array<string | null | undefined> = [],
): string[] {
  const start = currentSessionStartYear();
  const base: string[] = [];
  for (let offset = -1; offset <= 5; offset += 1) {
    base.push(formatSessionCode(start + offset));
  }
  const cleanedExtra = extra.filter((code): code is string => Boolean(code));
  return Array.from(new Set([...base, ...cleanedExtra])).sort();
}

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "violet";

export const SESSION_STATUS_META: Record<
  AdmissionSessionStatus,
  { label: string; variant: BadgeVariant; hint: string }
> = {
  draft: {
    label: "Draft",
    variant: "default",
    hint: "Created but not yet set up.",
  },
  ready: {
    label: "Ready",
    variant: "info",
    hint: "Classes and fees configured — not open to parents yet.",
  },
  commenced: {
    label: "Open",
    variant: "success",
    hint: "Live — parents can submit applications.",
  },
  closed: {
    label: "Closed",
    variant: "warning",
    hint: "No longer accepting applications.",
  },
};

// ── Setup readiness ───────────────────────────────────────────────────────────
// Mirrors the backend calculateReadiness logic so the UI can flag what is
// still blocking admissions for a session without an extra round-trip.

export interface SessionReadiness {
  classCount: number;
  classesWithFees: number;
  classesMissingFees: PrincipalClass[];
  canCommence: boolean;
}

export function computeSessionReadiness(
  sessionCode: string | null | undefined,
  classes: PrincipalClass[],
  feeStructures: PrincipalFeeStructure[],
): SessionReadiness {
  if (!sessionCode) {
    return {
      classCount: 0,
      classesWithFees: 0,
      classesMissingFees: [],
      canCommence: false,
    };
  }
  const sessionClasses = classes.filter((c) => c.academicYear === sessionCode);
  const feeClassIds = new Set(
    feeStructures
      .filter((f) => f.academicYear === sessionCode)
      .map((f) => f.classId),
  );
  const classesMissingFees = sessionClasses.filter(
    (c) => !feeClassIds.has(c.id),
  );
  return {
    classCount: sessionClasses.length,
    classesWithFees: feeClassIds.size,
    classesMissingFees,
    canCommence:
      sessionClasses.length > 0 && classesMissingFees.length === 0,
  };
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  wide,
}: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`my-auto w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl bg-white shadow-xl`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-surface-border px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={busy ? () => undefined : onCancel}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600">{message}</div>
    </Modal>
  );
}
