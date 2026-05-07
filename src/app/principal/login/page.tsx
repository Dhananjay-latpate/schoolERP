"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getPrincipalToken, setPrincipalSession } from "@/lib/principalSession";

const DEFAULT_REDIRECT = "/principal";
const UI = {
  cardMax: "max-w-4xl",
  heroPad: "p-6 sm:p-8",
  heading: "text-2xl sm:text-3xl font-bold",
  subHeading: "text-xl sm:text-2xl font-bold",
  primaryBtn: "h-10 px-4 text-sm",
  secondaryBtn: "h-10 px-4 text-sm",
};

export default function PrincipalLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const next = searchParams.get("next");
    if (!next || !next.startsWith("/principal")) return DEFAULT_REDIRECT;
    return next;
  }, [searchParams]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Bearer token is required.");
      return;
    }
    setPrincipalSession(trimmed);
    router.replace(redirectTo);
  };

  const onUseExistingSession = () => {
    const existing = getPrincipalToken();
    if (!existing) {
      setError("No saved principal session found.");
      return;
    }
    router.replace(redirectTo);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <Card className={`card-accent mx-auto w-full ${UI.cardMax} p-0`}>
        <div className="grid overflow-hidden md:grid-cols-[1.15fr_1fr]">
          <div className={`brand-gradient ${UI.heroPad} text-white`}>
            <div className="inline-flex rounded-full bg-white/20 p-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
              Principal Workspace
            </p>
            <h1 className={`mt-2 ${UI.heading}`}>
              Admissions Operations Login
            </h1>
            <p className="mt-3 text-sm text-blue-100">
              Access the principal command center for admission review, bulk decisions,
              and audit-enabled workflows.
            </p>
            <div className="mt-6 rounded-md border border-white/20 bg-white/10 p-3 text-xs text-blue-100">
              For security, use a valid principal bearer token. Session is stored only
              in your browser and guarded by route middleware.
            </div>
          </div>

          <div className={UI.heroPad}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
              Secure Sign In
            </p>
            <h2 className={`mt-1 ${UI.subHeading} text-text-primary`}>
              Enter Principal Token
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Continue to the admissions dashboard with role-protected access.
            </p>

            {error ? (
              <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="principal-token">Bearer Token</Label>
                <Input
                  id="principal-token"
                  type="password"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Paste principal JWT token"
                  autoComplete="off"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" className={UI.primaryBtn}>
                  Start Principal Session
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className={UI.secondaryBtn}
                  onClick={onUseExistingSession}
                >
                  Use Existing Session
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Card>
    </main>
  );
}
