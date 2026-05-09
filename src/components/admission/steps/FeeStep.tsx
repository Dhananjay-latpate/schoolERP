"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Heart, Wallet } from "lucide-react";
import {
  getFeeStructure,
  getPublicClasses,
  type FeeStructure,
  type PublicClass,
} from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { StepProps } from "../types";

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatOffsetLabel(offsetDays: number): string {
  if (offsetDays === 0) return "On enrollment day";
  if (offsetDays === 1) return "1 day after enrollment";
  if (offsetDays % 30 === 0 && offsetDays > 0) {
    const months = offsetDays / 30;
    return `${months} month${months === 1 ? "" : "s"} after enrollment`;
  }
  return `${offsetDays} days after enrollment`;
}

// Only treat a string as a printable due date when it's a valid ISO
// YYYY-MM-DD. Legacy fee structures sometimes carry malformed strings like
// "2025-26-06-10" which we'd otherwise display verbatim — never user-facing.
function tryFormatLegacyDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function FeeStep({ register, errors, watch }: StepProps) {
  const selectedClass = watch?.("classAdmitted") ?? "";
  const paymentMethod = watch?.("paymentMethod") ?? "";

  const [classes, setClasses] = useState<PublicClass[]>([]);
  const [feeStructure, setFeeStructure] = useState<FeeStructure | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [selectedInstallmentOptionId, setSelectedInstallmentOptionId] =
    useState<string | null>(null);

  useEffect(() => {
    getPublicClasses()
      .then(setClasses)
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setFeeStructure(null);
      setFeeError(null);
      return;
    }
    const matched = classes.find((c) => c.name === selectedClass);
    if (!matched) return;

    setFeeLoading(true);
    setFeeError(null);
    setFeeStructure(null);
    getFeeStructure(matched.name, matched.academicYear)
      .then((data) => setFeeStructure(data))
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Failed to load fee structure.";
        setFeeError(msg);
      })
      .finally(() => setFeeLoading(false));
  }, [selectedClass, classes]);

  useEffect(() => {
    setSelectedInstallmentOptionId(null);
  }, [feeStructure]);

  useEffect(() => {
    if (paymentMethod !== "installment") {
      setSelectedInstallmentOptionId(null);
    }
  }, [paymentMethod]);

  const selectedOption = useMemo(
    () =>
      feeStructure?.installmentOptions.find(
        (o) => o.id === selectedInstallmentOptionId,
      ) ?? null,
    [feeStructure, selectedInstallmentOptionId],
  );

  if (!selectedClass) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800">No class selected</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Go back to Academic Details and pick a class to view the fee
              structure.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Fee structure summary */}
      <div className="fee-card">
        {feeLoading ? (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-royal border-t-transparent" />
            Loading fee structure for {selectedClass}…
          </div>
        ) : feeError ? (
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Fee structure not available</p>
            <p className="mt-0.5 text-xs text-amber-700">
              {feeError} — Fee details will be confirmed by the school after
              your application is reviewed.
            </p>
          </div>
        ) : feeStructure ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-royal">
                Fee Structure — {feeStructure.academicYear}
              </p>
              <span className="badge-base badge-blue">{selectedClass}</span>
            </div>
            {feeStructure.feeComponents.map((c) => (
              <div key={c.name} className="fee-row">
                <span className="text-text-secondary">{c.name}</span>
                <span className="font-medium text-text-primary">
                  {formatINR(c.amount)}
                </span>
              </div>
            ))}
            <div className="fee-total">
              <span>Total Annual Fee</span>
              <span>{formatINR(feeStructure.totalAmount)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-text-muted">
            Fee details unavailable for this class.
          </p>
        )}
      </div>

      {/* Payment method selection */}
      <div>
        <Label htmlFor="paymentMethod">How would you like to pay?</Label>
        <Select id="paymentMethod" {...register("paymentMethod")}>
          <option value="full_payment">Pay full amount now</option>
          <option
            value="installment"
            disabled={
              !!(feeStructure && feeStructure.installmentOptions.length === 0)
            }
          >
            {feeStructure && feeStructure.installmentOptions.length > 0
              ? `Pay in standard installments (${feeStructure.installmentOptions.length} plan${
                  feeStructure.installmentOptions.length > 1 ? "s" : ""
                } available)`
              : "Pay in standard installments (not available)"}
          </option>
          <option value="custom_payment">
            Request a custom payment arrangement (hardship)
          </option>
        </Select>
      </div>

      {/* Installment plan picker */}
      {paymentMethod === "installment" &&
        feeStructure &&
        feeStructure.installmentOptions.length > 0 && (
          <div>
            <Label htmlFor="installmentPlan">Choose Installment Plan</Label>
            <Select
              id="installmentPlan"
              value={selectedInstallmentOptionId ?? ""}
              onChange={(e) =>
                setSelectedInstallmentOptionId(e.target.value || null)
              }
            >
              <option value="">Select a plan</option>
              {feeStructure.installmentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name} ({opt.numberOfInstallments} installment
                  {opt.numberOfInstallments > 1 ? "s" : ""})
                </option>
              ))}
            </Select>
            {selectedOption && (
              <div className="mt-3 rounded-xl border border-surface-border bg-white px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-royal">
                  {selectedOption.name} — Schedule
                </p>
                {selectedOption.installments.map((inst) => {
                  const legacyDate = tryFormatLegacyDate(inst.dueDate);
                  const offsetLabel =
                    typeof inst.dueOffsetDays === "number"
                      ? formatOffsetLabel(inst.dueOffsetDays)
                      : legacyDate
                        ? `Due ${legacyDate}`
                        : "Schedule confirmed at enrollment";
                  return (
                    <div key={inst.id} className="fee-row text-xs">
                      <span className="text-text-secondary">
                        {inst.name} — {offsetLabel}
                      </span>
                      <span className="font-medium text-text-primary">
                        {formatINR(inst.amount)}
                      </span>
                    </div>
                  );
                })}
                <p className="mt-2 text-[11px] text-text-muted">
                  Actual due dates are set when your application is submitted.
                </p>
              </div>
            )}
          </div>
        )}

      {/* Custom hardship request */}
      {paymentMethod === "custom_payment" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <Heart size={18} className="mt-0.5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Request a custom payment arrangement
              </p>
              <p className="mt-0.5 text-xs text-blue-800">
                If your family is unable to pay even the standard installment
                plan, you can propose a custom amount and explain your
                situation. The principal will review your request — and may
                adjust the amount before approving — so you can still secure
                admission.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="customPaymentAmount">
              Amount you can afford to pay (₹)
            </Label>
            <Input
              id="customPaymentAmount"
              type="number"
              placeholder="e.g. 25000"
              {...register("customPaymentAmount", { valueAsNumber: true })}
            />
            {errors.customPaymentAmount && (
              <p className="mt-1 text-xs text-status-error">
                {errors.customPaymentAmount.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="customPaymentReason">
              Briefly explain your situation
            </Label>
            <textarea
              id="customPaymentReason"
              rows={4}
              placeholder="Share why you need a custom arrangement — the principal will read this before deciding."
              className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-royal/40"
              {...register("customPaymentReason")}
            />
            {errors.customPaymentReason && (
              <p className="mt-1 text-xs text-status-error">
                {errors.customPaymentReason.message}
              </p>
            )}
          </div>
        </div>
      )}

      {paymentMethod === "full_payment" && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <Wallet size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-900">
              Pay full amount on submission
            </p>
            <p className="mt-0.5 text-xs text-emerald-800">
              You'll be taken to a secure payment screen after submitting. Once
              the payment is verified, your admission moves into review.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
