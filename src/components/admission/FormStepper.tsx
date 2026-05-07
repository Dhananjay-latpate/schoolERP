"use client";

import { Fragment } from "react";

const STEP_LABELS = [
  "Student",
  "Parents",
  "Academic",
  "Additional",
  "Documents",
  "Review",
];

interface FormStepperProps {
  currentStep: number;
}

export function FormStepper({ currentStep }: FormStepperProps) {
  return (
    <nav aria-label="Form progress">
      <ol className="flex w-full items-start">
        {STEP_LABELS.map((label, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          const isLast = index === STEP_LABELS.length - 1;

          return (
            <Fragment key={label}>
              {/* Step node */}
              <li className="flex flex-col items-center">
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
              </li>

              {/* Connector between steps */}
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
