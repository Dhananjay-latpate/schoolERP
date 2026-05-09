"use client";

import { useEffect, useState } from "react";
import { getPublicClasses, type PublicClass } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { StepProps } from "../types";

export function AcademicStep({ register, errors }: StepProps) {
  const [availableClasses, setAvailableClasses] = useState<PublicClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

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

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
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
        <p className="mt-2 text-xs text-text-muted">
          Fees, payment options, and the payment plan will be presented in the
          final step. You'll have a chance to review everything before paying.
        </p>
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
