"use client";

import { useEffect, useMemo, useState } from "react";
import { getPublicClasses, type PublicClass } from "@/lib/api";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { StepProps } from "../types";

const LOAD_TIMEOUT_MS = 12_000;

export function AcademicStep({ register, errors, watch, setValue }: StepProps) {
  const [availableClasses, setAvailableClasses] = useState<PublicClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  // Keep the previously-chosen class visible when the step is remounted
  // (user navigated away and back). Without an option matching the form's
  // current value, the browser drops the selection and the saved class
  // appears blank until classes finish loading.
  const currentClass = watch?.("classAdmitted") ?? "";

  useEffect(() => {
    let cancelled = false;
    setClassesLoading(true);
    setClassesError(null);

    const timeout = setTimeout(() => {
      if (cancelled) return;
      setClassesError(
        "Taking longer than expected. Please refresh the page if classes don't load.",
      );
      setClassesLoading(false);
    }, LOAD_TIMEOUT_MS);

    getPublicClasses()
      .then((classes) => {
        if (cancelled) return;
        setAvailableClasses(classes);
      })
      .catch(() => {
        if (cancelled) return;
        setClassesError(
          "Failed to load classes. Please refresh the page and try again.",
        );
      })
      .finally(() => {
        if (cancelled) return;
        clearTimeout(timeout);
        setClassesLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  // Deduplicate classes by name+section so the dropdown never shows the same
  // option twice (legacy duplicate rows in DB).
  const dedupedClasses = useMemo(() => {
    const seen = new Set<string>();
    const unique: PublicClass[] = [];
    for (const cls of availableClasses) {
      const key = `${cls.name.toLowerCase()}|${(cls.section ?? "").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(cls);
    }
    return unique;
  }, [availableClasses]);

  // Keep classLabel in sync with classAdmitted so ReviewStep can show the
  // full display label (e.g. "Class 1 — Section A") without changing the
  // stored value that the backend matches against.
  useEffect(() => {
    const matched = dedupedClasses.find(
      (c) => c.name.toLowerCase() === (currentClass ?? "").toLowerCase(),
    );
    if (matched && setValue) {
      const label = matched.section
        ? `${matched.name} — Section ${matched.section}`
        : matched.name;
      setValue("classLabel", label);
    }
  }, [currentClass, dedupedClasses, setValue]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="classAdmitted">Applying For Class *</Label>
        <Select
          id="classAdmitted"
          aria-required="true"
          aria-invalid={errors.classAdmitted ? "true" : "false"}
          aria-describedby="classAdmitted-help classAdmitted-error"
          {...register("classAdmitted")}
          className={errors.classAdmitted ? "input-error" : ""}
          disabled={classesLoading}
        >
          {classesLoading ? (
            currentClass ? (
              <option value={currentClass}>{currentClass}</option>
            ) : (
              <option value="">Loading classes…</option>
            )
          ) : classesError && dedupedClasses.length === 0 ? (
            <option value="">Failed to load classes</option>
          ) : (
            <>
              <option value="">Select class</option>
              {dedupedClasses.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name}
                  {cls.section ? ` — Section ${cls.section}` : ""}
                </option>
              ))}
            </>
          )}
        </Select>
        {classesError && (
          <p className="form-error" role="alert">
            {classesError}
          </p>
        )}
        {errors.classAdmitted && (
          <p
            id="classAdmitted-error"
            className="form-error"
            role="alert"
          >
            {errors.classAdmitted.message}
          </p>
        )}
        <p id="classAdmitted-help" className="mt-2 text-xs text-text-muted">
          Fees, payment options, and the payment plan will be presented in the
          final step. You'll have a chance to review everything before paying.
        </p>
      </div>
    </div>
  );
}
