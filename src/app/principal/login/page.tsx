"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AuthApiError, login } from "@/lib/authApi";
import { setPrincipalSession } from "@/lib/principalSession";

const DEFAULT_REDIRECT = "/principal";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLockRef = useRef(false);

  const redirectTo = useMemo(() => {
    const next = searchParams.get("next");
    if (!next || !next.startsWith("/principal")) return DEFAULT_REDIRECT;
    return next;
  }, [searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        setError("Please enter your email and password.");
        return;
      }

      const { user, accessToken } = await login(trimmedEmail, password);

      if (user.role !== "PRINCIPAL") {
        setError("Access denied. This portal is for principals only.");
        return;
      }

      setPrincipalSession(accessToken);
      router.replace(redirectTo);
    } catch (err) {
      if (err instanceof AuthApiError) {
        if (err.status === 0) {
          setError("We couldn't reach the server. Check your connection.");
        } else if (err.status === 429) {
          setError("Too many attempts. Please wait a few minutes and try again.");
        } else if (err.status === 401) {
          setError("Invalid email or password.");
        } else {
          setError(err.message || "Sign in failed. Please try again.");
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const submittable = email.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <Card className="card-accent mx-auto w-full max-w-4xl p-0">
        <div className="grid overflow-hidden md:grid-cols-[1.15fr_1fr]">
          <div className="brand-gradient p-6 text-white sm:p-8">
            <div className="inline-flex rounded-full bg-white/20 p-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
              Principal Workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Admissions Operations Login
            </h1>
            <p className="mt-3 text-sm text-white/70">
              Access the principal command center for admission review, bulk
              decisions, and audit-enabled workflows.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
              Secure Sign In
            </p>
            <h2 className="mt-1 text-xl font-bold text-text-primary sm:text-2xl">
              Principal Login
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Sign in with your principal account credentials.
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
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="principal@school.edu"
                    autoComplete="email"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!submittable}
                className="h-10 w-full px-4 text-sm"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </main>
  );
}

export default function PrincipalLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
