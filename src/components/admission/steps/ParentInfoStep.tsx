import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import type { StepProps } from "../types";

export function ParentInfoStep({ register, errors }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <Label htmlFor="fatherName">Father Name *</Label>
        <Input
          id="fatherName"
          placeholder="Rohit Sharma"
          autoComplete="off"
          aria-required="true"
          aria-invalid={errors.fatherName ? "true" : "false"}
          aria-describedby={errors.fatherName ? "fatherName-error" : undefined}
          {...register("fatherName")}
          className={errors.fatherName ? "input-error" : ""}
        />
        {errors.fatherName && (
          <p
            id="fatherName-error"
            className="form-error"
            role="alert"
          >
            {errors.fatherName.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="motherName">Mother Name *</Label>
        <Input
          id="motherName"
          placeholder="Priya Sharma"
          autoComplete="off"
          aria-required="true"
          aria-invalid={errors.motherName ? "true" : "false"}
          aria-describedby={errors.motherName ? "motherName-error" : undefined}
          {...register("motherName")}
          className={errors.motherName ? "input-error" : ""}
        />
        {errors.motherName && (
          <p
            id="motherName-error"
            className="form-error"
            role="alert"
          >
            {errors.motherName.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="emergencyContact">Emergency Contact *</Label>
        <Input
          id="emergencyContact"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="9876543210"
          autoComplete="tel-national"
          aria-required="true"
          aria-invalid={errors.emergencyContact ? "true" : "false"}
          aria-describedby="emergencyContact-help emergencyContact-error"
          {...register("emergencyContact")}
          className={errors.emergencyContact ? "input-error" : ""}
        />
        <p
          id="emergencyContact-help"
          className="mt-1 text-xs text-text-secondary"
        >
          10-digit Indian mobile number (digits only).
        </p>
        {errors.emergencyContact && (
          <p
            id="emergencyContact-error"
            className="form-error"
            role="alert"
          >
            {errors.emergencyContact.message}
          </p>
        )}
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="address">Residential Address *</Label>
        <Textarea
          id="address"
          placeholder="Flat / House No, Street, Area, City"
          autoComplete="street-address"
          aria-required="true"
          aria-invalid={errors.address ? "true" : "false"}
          aria-describedby={errors.address ? "address-error" : undefined}
          {...register("address")}
          className={errors.address ? "input-error" : ""}
        />
        {errors.address && (
          <p
            id="address-error"
            className="form-error"
            role="alert"
          >
            {errors.address.message}
          </p>
        )}
      </div>
    </div>
  );
}
