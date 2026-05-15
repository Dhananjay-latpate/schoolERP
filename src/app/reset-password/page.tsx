"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AuthApiError, resetPassword } from "@/lib/authApi";

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;

type Strength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
};

function scorePassword(p: string): Strength {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  const labels: Strength["label"][] = [
    "Very weak",
    "Weak",
    "Okay",
    "Good",
    "Strong",
  ];
  const colors = [
    "bg-rose-400",
    "bg-rose-300",
    "bg-amber-300",
    "bg-emerald-300",
    "bg-emerald-500",
  ];
  return {
    score: Math.min(score, 4) as Strength["score"],
    label: labels[Math.min(score, 4)],
    color: colors[Math.min(score, 4)],
  };
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef(false);

  const strength = useMemo(() => scorePassword(password), [password]);
  const passwordOk = STRONG_PASSWORD.test(password);
  const matches = password.length > 0 && password === confirm;
  const submittable = passwordOk && matches && !!token && !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockRef.current) return;
    lockRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace("/login?reset=success"), 1500);
    } catch (err) {
      if (err instanceof AuthApiError) {
        setError(err.message || "Reset failed.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
      lockRef.current = false;
    }
  };

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-8 sm:px-6">
        <Card className="card-accent w-full p-6 sm:p-8">
          <div className="inline-flex rounded-full bg-rose-50 p-2 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-text-primary">
            Reset link is missing
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            This page needs a valid reset token. Please use the link from your
            email, or request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm font-medium text-brand-royal hover:underline"
          >
            Request a new reset link
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-8 sm:px-6">
      <Card className="card-accent w-full p-6 sm:p-8">
        <div className="inline-flex rounded-full bg-brand-royal/10 p-2 text-brand-royal">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-text-primary">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Use a unique password you don't use anywhere else.
        </p>

        {done ? (
          <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Password updated.</p>
                <p className="mt-1">Redirecting to sign in…</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="reset-password">New password</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  id="reset-password"
                  type={show ? "text" : "password"}
                  name="newPassword"
                  autoComplete="new-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="At least 12 characters"
                  className="pl-9 pr-10"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-text-secondary hover:bg-surface-muted"
                  tabIndex={-1}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 ? (
                <div className="mt-1 space-y-1">
                  <div className="flex h-1.5 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 rounded ${i < strength.score ? strength.color : "bg-surface-divider"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary">
                    Strength:{" "}
                    <span className="font-medium text-text-primary">
                      {strength.label}
                    </span>
                  </p>
                </div>
              ) : null}
              <ul className="mt-1 space-y-0.5 text-xs text-text-secondary">
                <li className={password.length >= 12 ? "text-emerald-700" : ""}>
                  • At least 12 characters
                </li>
                <li
                  className={
                    /[a-z]/.test(password) && /[A-Z]/.test(password)
                      ? "text-emerald-700"
                      : ""
                  }
                >
                  • Upper and lower case letters
                </li>
                <li className={/\d/.test(password) ? "text-emerald-700" : ""}>
                  • At least one number
                </li>
                <li className={/[^A-Za-z0-9]/.test(password) ? "text-emerald-700" : ""}>
                  • At least one special character
                </li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm">Confirm new password</Label>
              <Input
                id="reset-confirm"
                type={show ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                required
                maxLength={128}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Re-enter password"
                disabled={submitting}
              />
              {confirm.length > 0 && !matches ? (
                <p className="text-xs text-rose-700">Passwords don't match.</p>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={!submittable}
              className="h-10 w-full"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                </span>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
