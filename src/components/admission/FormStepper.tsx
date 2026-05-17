"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";

const STEP_LABELS = [
  "Student",
  "Parents",
  "Academic",
  "Additional",
  "Documents",
  "Review",
  "Fees",
];

interface FormStepperProps {
  currentStep: number;
  onStepClick?: (index: number) => void;
}

export function FormStepper({ currentStep, onStepClick }: FormStepperProps) {
  const total = STEP_LABELS.length;

  return (
    <nav aria-label="Form progress">
      {/* Compact progress caption — primary cue on small screens */}
      <p className="mb-3 text-center text-xs font-medium text-text-muted sm:hidden">
        Step {currentStep + 1} of {total}
      </p>

      <ol className="flex w-full items-start">
        {STEP_LABELS.map((label, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          const isLast = index === total - 1;
          const isClickable = isDone && typeof onStepClick === "function";

          const nodeBase =
            "flex h-8 w-8 items-center justify-center rounded-full text-[0.8125rem] font-semibold transition-all duration-200 select-none";
          const nodeTone = isActive
            ? "bg-brand-royal text-white ring-4 ring-brand-royal/15"
            : isDone
              ? "bg-brand-royal text-white"
              : "border border-surface-border bg-surface-card text-text-muted";

          return (
            <Fragment key={label}>
              <li className="flex shrink-0 flex-col items-center">
                {isClickable ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(index)}
                    aria-label={`Go back to ${label} step`}
                    className={`${nodeBase} ${nodeTone} cursor-pointer hover:brightness-95`}
                  >
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                ) : (
                  <div
                    aria-current={isActive ? "step" : undefined}
                    className={`${nodeBase} ${nodeTone}`}
                  >
                    {index + 1}
                  </div>
                )}

                {isClickable ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(index)}
                    tabIndex={-1}
                    className="mt-2 hidden bg-transparent text-center text-[0.6875rem] font-medium leading-tight text-text-secondary hover:text-text-primary sm:block"
                  >
                    {label}
                  </button>
                ) : (
                  <span
                    className={[
                      "mt-2 hidden text-center text-[0.6875rem] leading-tight sm:block",
                      isActive
                        ? "font-semibold text-text-primary"
                        : "font-medium text-text-muted",
                    ].join(" ")}
                  >
                    {label}
                  </span>
                )}
              </li>

              {!isLast && (
                <div
                  className="mt-4 h-px flex-1"
                  style={{
                    background: isDone
                      ? "var(--color-brand-royal)"
                      : "var(--color-surface-divider)",
                  }}
                  aria-hidden="true"
                />
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
