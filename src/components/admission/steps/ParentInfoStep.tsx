import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import type { StepProps } from "../types";

export function ParentInfoStep({ register, errors }: StepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="fatherName">Father Name *</Label>
        <Input
          id="fatherName"
          placeholder="Rohit Sharma"
          {...register("fatherName")}
          className={errors.fatherName ? "input-error" : ""}
        />
        {errors.fatherName && (
          <p className="mt-1 text-xs text-[#e11d48]">
            {errors.fatherName.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="motherName">Mother Name *</Label>
        <Input
          id="motherName"
          placeholder="Priya Sharma"
          {...register("motherName")}
          className={errors.motherName ? "input-error" : ""}
        />
        {errors.motherName && (
          <p className="mt-1 text-xs text-[#e11d48]">
            {errors.motherName.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="emergencyContact">Emergency Contact *</Label>
        <Input
          id="emergencyContact"
          placeholder="9876543210"
          {...register("emergencyContact")}
          className={errors.emergencyContact ? "input-error" : ""}
        />
        {errors.emergencyContact && (
          <p className="mt-1 text-xs text-[#e11d48]">
            {errors.emergencyContact.message}
          </p>
        )}
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="address">Residential Address *</Label>
        <Textarea
          id="address"
          placeholder="Flat / House No, Street, Area, City"
          {...register("address")}
          className={errors.address ? "input-error" : ""}
        />
        {errors.address && (
          <p className="mt-1 text-xs text-[#e11d48]">
            {errors.address.message}
          </p>
        )}
      </div>
    </div>
  );
}
