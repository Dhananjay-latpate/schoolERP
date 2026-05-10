import type { Metadata } from "next";
import { Suspense } from "react";
import { AdmissionForm } from "@/components/admission/AdmissionForm";

export const metadata: Metadata = {
  title: "Apply for Admission",
  description:
    "Start your child's admission application — fill in student details, choose a class, and pay securely.",
};

export default function AdmissionApplyPage() {
  return (
    <Suspense fallback={null}>
      <AdmissionForm />
    </Suspense>
  );
}
