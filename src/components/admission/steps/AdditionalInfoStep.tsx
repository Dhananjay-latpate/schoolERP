import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { StepProps } from "../types";

export function AdditionalInfoStep({ register, errors }: StepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="religion">Religion</Label>
        <Input id="religion" placeholder="Optional" {...register("religion")} />
      </div>
      <div>
        <Label htmlFor="caste">Caste</Label>
        <Input id="caste" placeholder="Optional" {...register("caste")} />
      </div>
      <div>
        <Label htmlFor="subCaste">Sub Caste</Label>
        <Input id="subCaste" placeholder="Optional" {...register("subCaste")} />
      </div>
      <div>
        <Label htmlFor="adharNumber">Aadhaar Number</Label>
        <Input
          id="adharNumber"
          placeholder="XXXX XXXX XXXX"
          inputMode="numeric"
          maxLength={14}
          aria-describedby="adharNumber-help adharNumber-error"
          aria-invalid={errors.adharNumber ? "true" : "false"}
          {...register("adharNumber")}
          className={errors.adharNumber ? "input-error" : ""}
        />
        <p id="adharNumber-help" className="mt-1 text-xs text-text-secondary">
          12-digit Aadhaar number (optional, digits only)
        </p>
        {errors.adharNumber && (
          <p
            id="adharNumber-error"
            className="mt-1 text-xs text-status-error"
            role="alert"
          >
            {errors.adharNumber.message}
          </p>
        )}
      </div>
    </div>
  );
}
