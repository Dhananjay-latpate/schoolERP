"use client";

import { Fragment } from "react";

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
  return (
    <nav aria-label="Form progress">
      <ol className="flex w-full items-start">
        {STEP_LABELS.map((label, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          const isLast = index === STEP_LABELS.length - 1;
          const isClickable = isDone && typeof onStepClick === "function";

          return (
            <Fragment key={label}>
              <li className="flex flex-col items-center">
                {isClickable ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(index)}
                    aria-label={`Go back to ${label} step`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a4dad] text-sm font-bold text-white transition-all duration-300 hover:scale-105 hover:bg-[#143d8c] focus:outline-none focus:ring-2 focus:ring-[#1a4dad]/50 focus:ring-offset-2 select-none"
                  >
                    ✓
                  </button>
                ) : (
                  <div
                    aria-current={isActive ? "step" : undefined}
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 select-none",
                      isActive
                        ? "bg-[#1a4dad] text-white shadow-md shadow-blue-300/50"
                        : isDone
                          ? "bg-[#1a4dad] text-white"
                          : "border-2 border-gray-300 bg-white text-gray-400",
                    ].join(" ")}
                  >
                    {isDone ? "✓" : index + 1}
                  </div>
                )}
                {isClickable ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(index)}
                    tabIndex={-1}
                    className="mt-2 cursor-pointer bg-transparent text-center text-[11px] font-medium leading-tight text-[#1a4dad] hover:underline"
                  >
                    {label}
                  </button>
                ) : (
                  <span
                    className={[
                      "mt-2 text-center text-[11px] font-medium leading-tight",
                      isActive
                        ? "font-semibold text-[#1a4dad]"
                        : isDone
                          ? "text-[#1a4dad]"
                          : "text-gray-400",
                    ].join(" ")}
                  >
                    {label}
                  </span>
                )}
              </li>

              {!isLast && (
                <div className="mt-4.5 flex-1 px-1">
                  {isDone ? (
                    <div className="h-0.5 w-full bg-[#1a4dad]" />
                  ) : (
                    <div className="h-0 w-full border-t-2 border-dashed border-gray-300" />
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
