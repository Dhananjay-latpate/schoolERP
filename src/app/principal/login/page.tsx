"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";

// The principal portal previously had its own login page. To unify the
// experience we now redirect every visit to the single /login screen,
// preserving any ?next= parameter so the user lands back on the right
// principal page after authentication.
function PrincipalLoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get("next") ?? "/principal/admissions";
    const safeNext = next.startsWith("/principal") ? next : "/principal/admissions";
    router.replace(`/login?next=${encodeURIComponent(safeNext)}`);
  }, [router, searchParams]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4">
      <Card className="mx-auto w-full p-8 text-center">
        <Loader2
          className="mx-auto h-6 w-6 animate-spin text-brand-royal"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm text-text-secondary">
          Taking you to the unified sign-in page…
        </p>
      </Card>
    </main>
  );
}

export default function PrincipalLoginPage() {
  return (
    <Suspense fallback={null}>
      <PrincipalLoginRedirect />
    </Suspense>
  );
}
