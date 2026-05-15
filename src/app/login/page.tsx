"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AuthApiError, login } from "@/lib/authApi";
import {
  defaultLandingForRole,
  setAuthSession,
} from "@/lib/authSession";
import { setPrincipalSession } from "@/lib/principalSession";

const SAFE_REDIRECT_PREFIXES = [
  "/principal",
  "/admissions",
  "/(protected)",
];

function isSafeRedirect(next: string | null | undefined): next is string {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false; // protocol-relative
  return SAFE_REDIRECT_PREFIXES.some((p) => next.startsWith(p));
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<HTMLInputElement | null>(null);
  const submitLockRef = useRef(false);

  const redirectTo = useMemo(() => {
    const next = searchParams.get("next");
    return isSafeRedirect(next) ? next : null;
  }, [searchParams]);

  useEffect(() => {
    // If they came here with ?reset=success, surface a brief notice.
    if (searchParams.get("reset") === "success") {
      setError(null);
    }
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
      setAuthSession(accessToken, user);

      // Principal/admin users also seed the principal session cookie so the
      // /principal/* pages (which read from a separate session store) work
      // without a second login.
      if (user.role === "PRINCIPAL" || user.role === "ADMIN") {
        setPrincipalSession(accessToken);
      }

      const dest = redirectTo ?? defaultLandingForRole(user.role);
      router.replace(dest);
    } catch (err) {
      if (err instanceof AuthApiError) {
        // Server returns one generic message for bad-credentials and lockout
        // both, which is what we want to show.
        if (err.status === 0) {
          setError("We couldn't reach the server. Check your connection.");
        } else if (err.status === 429) {
          setError(
            "Too many attempts. Please wait a few minutes and try again.",
          );
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

  // Caps Lock detection — keypress events expose the modifier state.
  const onPasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const submittable = email.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <Card className="card-accent mx-auto w-full max-w-4xl p-0">
        <div className="grid overflow-hidden md:grid-cols-[1.1fr_1fr]">
          {/* Brand panel */}
          <div className="brand-gradient p-6 text-white sm:p-8">
            <div className="inline-flex rounded-full bg-surface-card/20 p-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
              Resillix Workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Secure Sign In
            </h1>
            <p className="mt-3 text-sm text-white/70">
              Sign in to access admission reviews, fee approvals, and the
              principal command centre. Sessions are short-lived and
              cookie-protected.
            </p>

            <ul className="mt-6 space-y-2 text-xs text-white/70">
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>HTTP-only refresh cookies — never exposed to JavaScript.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Per-account lockout after repeated failed attempts.</span>
              </li>
              <li className="flex items-start gap-2">
                <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Rotating refresh tokens — reuse triggers full session revocation.</span>
              </li>
            </ul>
          </div>

          {/* Form panel */}
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
              Account Access
            </p>
            <h2 className="mt-1 text-xl font-bold text-text-primary sm:text-2xl">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Enter your school email and password to continue.
            </p>

            {error ? (
              <div
                role="alert"
                aria-live="assertive"
                className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            ) : null}

            <form
              onSubmit={onSubmit}
              className="mt-5 space-y-4"
              noValidate
              autoComplete="on"
              method="POST"
              action="#"
            >
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <Input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="username"
                    inputMode="email"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-brand-royal hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <Input
                    id="login-password"
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    spellCheck={false}
                    required
                    maxLength={128}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyUp={onPasswordKey}
                    onKeyDown={onPasswordKey}
                    onBlur={() => setCapsLockOn(false)}
                    placeholder="Enter your password"
                    className="pl-9 pr-10"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-text-secondary hover:bg-surface-muted"
                    tabIndex={-1}
                    disabled={submitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {capsLockOn ? (
                  <p
                    role="status"
                    className="flex items-center gap-1.5 text-xs text-amber-700"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Caps Lock is on
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                disabled={!submittable}
                className="h-10 w-full"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>

              <p className="text-center text-xs text-text-secondary">
                Protected by rate limits and per-account lockout. Repeated
                failed attempts will temporarily disable sign-in for this
                account.
              </p>
            </form>
          </div>
        </div>
      </Card>
    </main>
  );
}
