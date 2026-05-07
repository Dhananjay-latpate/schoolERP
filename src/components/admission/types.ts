import type {
  FieldErrors,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";

export type AdmissionFormValues = {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: "male" | "female" | "other";
  dateOfBirth: string;
  classAdmitted: string;
  fatherName: string;
  motherName: string;
  address: string;
  emergencyContact: string;
  placeOfBirth?: string;
  nationality?: string;
  religion?: string;
  caste?: string;
  subCaste?: string;
  adharNumber?: string;
  motherTongue?: string;
  paymentMethod?: "full_payment" | "installment" | "custom_payment";
  customPaymentAmount?: number;
  customPaymentReason?: string;
};

export type StepProps = {
  register: UseFormRegister<AdmissionFormValues>;
  errors: FieldErrors<AdmissionFormValues>;
  watch?: UseFormWatch<AdmissionFormValues>;
};
