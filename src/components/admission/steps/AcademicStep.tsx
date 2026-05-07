"use client";

import { useEffect, useState } from "react";
import {
  getPublicClasses,
  getFeeStructure,
  type PublicClass,
  type FeeStructure,
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

export function AcademicStep({ register, errors, watch }: StepProps) {
  const [availableClasses, setAvailableClasses] = useState<PublicClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  const [feeStructure, setFeeStructure] = useState<FeeStructure | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [selectedInstallmentOptionId, setSelectedInstallmentOptionId] =
    useState<string | null>(null);

  const selectedClass = watch?.("classAdmitted") ?? "";
  const paymentMethod = watch?.("paymentMethod") ?? "";

  // Fetch available classes on mount
  useEffect(() => {
    setClassesLoading(true);
    setClassesError(null);
    getPublicClasses()
      .then((classes) => setAvailableClasses(classes))
      .catch(() =>
        setClassesError("Unable to load classes. Please try again later."),
      )
      .finally(() => setClassesLoading(false));
  }, []);

  // Fetch fee structure whenever the selected class changes
  useEffect(() => {
    if (!selectedClass) {
      setFeeStructure(null);
      setFeeError(null);
      return;
    }
    const matched = availableClasses.find((c) => c.name === selectedClass);
    if (!matched) return;

    setFeeLoading(true);
    setFeeError(null);
    setFeeStructure(null);
    getFeeStructure(matched.name, matched.academicYear)
      .then((data) => {
        setFeeStructure(data);
        setFeeError(null);
      })
      .catch((err: unknown) => {
        setFeeStructure(null);
        const msg =
          err instanceof Error ? err.message : "Failed to load fee structure.";
        setFeeError(msg);
      })
      .finally(() => setFeeLoading(false));
  }, [selectedClass, availableClasses]);

  // Reset installment plan selection when fee structure changes
  useEffect(() => {
    setSelectedInstallmentOptionId(null);
  }, [feeStructure]);

  // Reset installment plan selection when user switches away from installment
  useEffect(() => {
    if (paymentMethod !== "installment") {
      setSelectedInstallmentOptionId(null);
    }
  }, [paymentMethod]);

  const selectedOption =
    feeStructure?.installmentOptions.find(
      (o) => o.id === selectedInstallmentOptionId,
    ) ?? null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="classAdmitted">Applying For Class</Label>
        <Select
          id="classAdmitted"
          {...register("classAdmitted")}
          className={errors.classAdmitted ? "input-error" : ""}
          disabled={classesLoading}
        >
          {classesLoading ? (
            <option value="">Loading classes…</option>
          ) : classesError ? (
            <option value="">Failed to load classes</option>
          ) : (
            <>
              <option value="">Select class</option>
              {availableClasses.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name}
                  {cls.section ? ` (${cls.section})` : ""}
                </option>
              ))}
            </>
          )}
        </Select>
        {classesError && (
          <p className="mt-1 text-xs text-status-error">{classesError}</p>
        )}
        {errors.classAdmitted && (
          <p className="mt-1 text-xs text-status-error">
            {errors.classAdmitted.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="paymentMethod">Preferred Payment Type</Label>
        <Select id="paymentMethod" {...register("paymentMethod")}>
          <option value="">Select payment type</option>
          <option value="full_payment">Full Payment</option>
          <option
            value="installment"
            disabled={
              !!(feeStructure && feeStructure.installmentOptions.length === 0)
            }
          >
            {feeStructure && feeStructure.installmentOptions.length > 0
              ? `Installments (${feeStructure.installmentOptions.length} plan${
                  feeStructure.installmentOptions.length > 1 ? "s" : ""
                } available)`
              : feeStructure
                ? "Installments (not available for this class)"
                : "Installments"}
          </option>
          <option value="custom_payment">
            Custom Payment (Request to Principal)
          </option>
        </Select>
      </div>

      {paymentMethod === "installment" &&
        feeStructure &&
        feeStructure.installmentOptions.length > 0 && (
          <div>
            <Label htmlFor="installmentPlan">Select Installment Plan</Label>
            <Select
              id="installmentPlan"
              value={selectedInstallmentOptionId ?? ""}
              onChange={(e) =>
                setSelectedInstallmentOptionId(e.target.value || null)
              }
            >
              <option value="">Choose a plan</option>
              {feeStructure.installmentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name} ({opt.numberOfInstallments} installment
                  {opt.numberOfInstallments > 1 ? "s" : ""})
                </option>
              ))}
            </Select>
          </div>
        )}

      {paymentMethod === "custom_payment" && (
        <>
          <div>
            <Label htmlFor="customPaymentAmount">Requested Amount (₹)</Label>
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

          <div className="sm:col-span-2">
            <Label htmlFor="customPaymentReason">
              Reason for Custom Payment
            </Label>
            <textarea
              id="customPaymentReason"
              rows={3}
              placeholder="Explain why you are requesting a custom payment amount…"
              className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-royal/40"
              {...register("customPaymentReason")}
            />
            {errors.customPaymentReason && (
              <p className="mt-1 text-xs text-status-error">
                {errors.customPaymentReason.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"
              />
            </svg>
            <div>
              <p className="font-semibold text-blue-800">
                How custom payment works
              </p>
              <p className="mt-0.5 text-xs text-blue-700">
                Your request will be sent to the principal for review. Once
                approved, you will receive a payment link for the agreed amount.
                If rejected, you can resubmit or switch to a standard
                installment plan.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Fee breakdown panel */}
      <div className="sm:col-span-2">
        {feeLoading && (
          <div className="fee-card flex items-center gap-2 text-sm text-text-muted">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-royal border-t-transparent" />
            Loading fee structure…
          </div>
        )}

        {!feeLoading && feeError && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            <div>
              <p className="font-semibold text-amber-800">
                Fee structure not available
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                {feeError} — Fee details will be confirmed by the school after
                your application is reviewed.
              </p>
            </div>
          </div>
        )}

        {!feeLoading && feeStructure && (
          <div className="fee-card">
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
            {feeStructure.installmentOptions.length > 0 &&
              !selectedOption &&
              paymentMethod !== "installment" && (
                <p className="mt-2 text-xs text-text-muted">
                  Installment plans available:{" "}
                  {feeStructure.installmentOptions
                    .map((o) => o.name)
                    .join(", ")}
                </p>
              )}
            {paymentMethod === "installment" &&
              !selectedOption &&
              feeStructure.installmentOptions.length > 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  Select an installment plan above to view the schedule.
                </p>
              )}
            {selectedOption && (
              <div className="mt-3 border-t border-surface-divider pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-royal">
                  {selectedOption.name} — Payment Schedule
                </p>
                {selectedOption.installments.map((inst) => (
                  <div key={inst.id} className="fee-row text-xs">
                    <span className="text-text-secondary">
                      {inst.name}
                      {inst.dueDate ? ` — due ${inst.dueDate}` : ""}
                    </span>
                    <span className="font-medium text-text-primary">
                      {formatINR(inst.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!feeLoading && !feeError && !feeStructure && selectedClass && (
          <div className="fee-card text-sm text-text-muted">
            Fee details will be confirmed upon application review.
          </div>
        )}

        {!feeLoading && !selectedClass && (
          <div className="rounded-lg border border-dashed border-surface-divider bg-surface-muted px-4 py-3 text-sm text-text-muted">
            Select a class above to view the fee structure.
          </div>
        )}
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="adharNumber">Aadhaar Number (optional)</Label>
        <Input
          id="adharNumber"
          placeholder="0000 0000 0000"
          {...register("adharNumber")}
        />
      </div>
    </div>
  );
}
