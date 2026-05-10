"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { StepProps } from "../types";

// Restrict DOB picker to a realistic student age range (3–25 years old).
function dobBounds() {
  const today = new Date();
  const max = new Date(today);
  max.setFullYear(max.getFullYear() - 3);
  const min = new Date(today);
  min.setFullYear(min.getFullYear() - 25);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { min: fmt(min), max: fmt(max) };
}

export function StudentInfoStep({ register, errors }: StepProps) {
  const { min: dobMin, max: dobMax } = useMemo(dobBounds, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="firstName">First Name *</Label>
        <Input
          id="firstName"
          placeholder="Aarav"
          autoComplete="given-name"
          aria-required="true"
          aria-invalid={errors.firstName ? "true" : "false"}
          aria-describedby={errors.firstName ? "firstName-error" : undefined}
          {...register("firstName")}
          className={errors.firstName ? "input-error" : ""}
        />
        {errors.firstName && (
          <p id="firstName-error" className="mt-1 text-xs text-[#e11d48]" role="alert">
            {errors.firstName.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="middleName">Middle Name</Label>
        <Input
          id="middleName"
          placeholder="Kumar"
          autoComplete="additional-name"
          aria-invalid={errors.middleName ? "true" : "false"}
          {...register("middleName")}
          className={errors.middleName ? "input-error" : ""}
        />
        {errors.middleName && (
          <p className="mt-1 text-xs text-[#e11d48]" role="alert">
            {errors.middleName.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="lastName">Last Name *</Label>
        <Input
          id="lastName"
          placeholder="Sharma"
          autoComplete="family-name"
          aria-required="true"
          aria-invalid={errors.lastName ? "true" : "false"}
          aria-describedby={errors.lastName ? "lastName-error" : undefined}
          {...register("lastName")}
          className={errors.lastName ? "input-error" : ""}
        />
        {errors.lastName && (
          <p id="lastName-error" className="mt-1 text-xs text-[#e11d48]" role="alert">
            {errors.lastName.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="gender">Gender *</Label>
        <Select
          id="gender"
          aria-required="true"
          aria-invalid={errors.gender ? "true" : "false"}
          aria-describedby={errors.gender ? "gender-error" : undefined}
          {...register("gender")}
          className={errors.gender ? "input-error" : ""}
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </Select>
        {errors.gender && (
          <p id="gender-error" className="mt-1 text-xs text-[#e11d48]" role="alert">
            {errors.gender.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="dateOfBirth">Date of Birth *</Label>
        <Input
          id="dateOfBirth"
          type="date"
          min={dobMin}
          max={dobMax}
          autoComplete="bday"
          aria-required="true"
          aria-invalid={errors.dateOfBirth ? "true" : "false"}
          aria-describedby="dateOfBirth-help"
          {...register("dateOfBirth")}
          className={errors.dateOfBirth ? "input-error" : ""}
        />
        <p id="dateOfBirth-help" className="mt-1 text-xs text-text-muted">
          Student must be between 3 and 25 years old.
        </p>
        {errors.dateOfBirth && (
          <p className="mt-1 text-xs text-[#e11d48]" role="alert">
            {errors.dateOfBirth.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="placeOfBirth">Place of Birth</Label>
        <Input
          id="placeOfBirth"
          placeholder="Pune"
          autoComplete="address-level2"
          {...register("placeOfBirth")}
        />
      </div>
      <div>
        <Label htmlFor="nationality">Nationality</Label>
        <Input
          id="nationality"
          placeholder="Indian"
          autoComplete="country-name"
          {...register("nationality")}
        />
      </div>
      <div>
        <Label htmlFor="motherTongue">Mother Tongue</Label>
        <Input
          id="motherTongue"
          placeholder="Marathi"
          {...register("motherTongue")}
        />
      </div>
    </div>
  );
}
