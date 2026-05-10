"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AuthApiError, forgotPassword } from "@/lib/authApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockRef.current) return;
    lockRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await forgotPassword(email.trim());
      setDone(true);
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 429) {
        setError("Too many requests. Please wait and try again later.");
      } else {
        // The server intentionally returns 200 for unknown emails — the only
        // way we get an error here is a real failure (validation, network).
        setError(
          err instanceof AuthApiError
            ? err.message
            : "Something went wrong. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
      lockRef.current = false;
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-8 sm:px-6">
      <Card className="card-accent w-full p-6 sm:p-8">
        <div className="inline-flex rounded-full bg-brand-royal/10 p-2 text-brand-royal">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-text-primary">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Enter the email address linked to your account. If we find a match,
          we'll email you a one-time link to choose a new password.
        </p>

        {done ? (
          <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Check your inbox.</p>
                <p className="mt-1 text-emerald-700">
                  If an account exists for that email, you'll receive a reset
                  link shortly. The link expires in 30 minutes.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-royal hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  id="forgot-email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  inputMode="email"
                  required
                  maxLength={320}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="you@school.edu"
                  className="pl-9"
                  disabled={submitting}
                />
              </div>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={!email.trim() || submitting}
              className="h-10 w-full"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                </span>
              ) : (
                "Send reset link"
              )}
            </Button>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-brand-royal hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </form>
        )}
      </Card>
    </main>
  );
}
