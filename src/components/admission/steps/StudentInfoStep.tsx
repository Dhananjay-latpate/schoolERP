import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { StepProps } from "../types";

export function StudentInfoStep({ register, errors }: StepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="firstName">First Name *</Label>
        <Input
          id="firstName"
          placeholder="Aarav"
          {...register("firstName")}
          className={errors.firstName ? "input-error" : ""}
        />
        {errors.firstName && (
          <p className="mt-1 text-xs text-[#e11d48]">
            {errors.firstName.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="middleName">Middle Name</Label>
        <Input
          id="middleName"
          placeholder="Kumar"
          {...register("middleName")}
        />
      </div>
      <div>
        <Label htmlFor="lastName">Last Name *</Label>
        <Input
          id="lastName"
          placeholder="Sharma"
          {...register("lastName")}
          className={errors.lastName ? "input-error" : ""}
        />
        {errors.lastName && (
          <p className="mt-1 text-xs text-[#e11d48]">
            {errors.lastName.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="gender">Gender *</Label>
        <Select
          id="gender"
          {...register("gender")}
          className={errors.gender ? "input-error" : ""}
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </Select>
        {errors.gender && (
          <p className="mt-1 text-xs text-[#e11d48]">{errors.gender.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="dateOfBirth">Date of Birth *</Label>
        <Input
          id="dateOfBirth"
          type="date"
          {...register("dateOfBirth")}
          className={errors.dateOfBirth ? "input-error" : ""}
        />
        {errors.dateOfBirth && (
          <p className="mt-1 text-xs text-[#e11d48]">
            {errors.dateOfBirth.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="placeOfBirth">Place of Birth</Label>
        <Input
          id="placeOfBirth"
          placeholder="Pune"
          {...register("placeOfBirth")}
        />
      </div>
      <div>
        <Label htmlFor="nationality">Nationality</Label>
        <Input
          id="nationality"
          placeholder="Indian"
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
