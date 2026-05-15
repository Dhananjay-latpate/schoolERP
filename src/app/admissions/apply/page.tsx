import type { Metadata } from "next";
import { Suspense } from "react";
import { AdmissionForm } from "@/components/admission/AdmissionForm";
import { ResumeDraftTrigger } from "@/components/admission/ResumeDraftTrigger";

export const metadata: Metadata = {
  title: "Apply for Admission",
  description:
    "Start your child's admission application — fill in student details, choose a class, and pay securely.",
};

export default function AdmissionApplyPage() {
  return (
    <div className="space-y-4">
      <ResumeDraftTrigger />
      <Suspense fallback={null}>
        <AdmissionForm />
      </Suspense>
    </div>
  );
}
