import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { StepProps } from "../types";

export function AdditionalInfoStep({ register }: StepProps) {
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
          maxLength={14}
          {...register("adharNumber")}
        />
        <p className="mt-1 text-xs text-text-secondary">
          12-digit Aadhaar number (optional)
        </p>
      </div>
    </div>
  );
}
