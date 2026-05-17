import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { ResumeDraftFormCard } from "@/components/admission/ResumeDraftFormCard";

export const metadata: Metadata = {
  title: "Resume Draft Application",
  description:
    "Continue your saved admission draft using your application ID and mobile number.",
};

export default function AdmissionResumePage() {
  return (
    <div className="mx-auto max-w-lg space-y-7">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Resume your draft
        </h1>
        <p className="text-sm text-text-secondary">
          Enter the application ID you received when you saved your draft and
          the mobile number you used on the form. We&apos;ll reopen the form so
          you can finish and submit.
        </p>
      </header>

      <Card className="p-7 sm:p-8">
        <ResumeDraftFormCard />
      </Card>
    </div>
  );
}
