"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { verifyReceipt, type ReceiptVerification } from "@/lib/api";

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VerifyReceiptPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ReceiptVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("No verification code supplied.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    verifyReceipt(token)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not verify this receipt",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const isGenuine = result?.valid === true;

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface-bg">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-20 h-96 w-96 rounded-full bg-brand-sky/10 blur-[80px]" />
        <div className="absolute -right-40 top-60 h-80 w-80 rounded-full bg-brand-royal/10 blur-[70px]" />
      </div>

      <header className="border-b border-surface-border/60 bg-white/85 backdrop-blur-xl">
        <div
          className="h-0.5 w-full"
          style={{
            background:
              "linear-gradient(90deg, #1A4DAD 0%, #3B82F6 50%, #F59E0B 100%)",
          }}
        />
        <div className="mx-auto flex h-15 w-full max-w-3xl items-center gap-2 px-4 py-3 sm:px-6">
          <ShieldCheck className="h-5 w-5 text-brand-royal" aria-hidden="true" />
          <p className="text-sm font-bold tracking-tight text-text-primary">
            Receipt Verification
          </p>
        </div>
      </header>

      <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        {loading && (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2
                className="h-6 w-6 animate-spin text-brand-royal"
                aria-hidden="true"
              />
              <p className="text-sm text-text-secondary">
                Verifying receipt…
              </p>
            </div>
          </Card>
        )}

        {!loading && error && (
          <Card className="p-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <ShieldAlert size={28} aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold text-text-primary">
              Verification failed
            </h1>
            <p className="mt-2 text-sm text-text-secondary">{error}</p>
          </Card>
        )}

        {!loading && !error && !isGenuine && (
          <Card className="p-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <ShieldAlert size={28} aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold text-text-primary">
              This receipt could not be verified
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              No fee receipt matches this code. It may be invalid, edited, or
              counterfeit. Please contact the school office if you believe this
              is an error.
            </p>
          </Card>
        )}

        {!loading && !error && isGenuine && result && (
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-3 border-b border-surface-border bg-emerald-50 px-6 py-5">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <BadgeCheck size={26} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-base font-bold text-emerald-900">
                  Genuine receipt
                </h1>
                <p className="text-xs text-emerald-700">
                  This receipt is recorded in the school's fee system.
                </p>
              </div>
              <Badge variant="success" className="ml-auto">
                Verified
              </Badge>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Receipt No.
                </span>
                <span className="font-mono text-sm font-bold text-text-primary">
                  {result.receiptNo}
                </span>
              </div>

              <div className="rounded-xl bg-surface-muted/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Amount paid
                </p>
                <p className="mt-0.5 text-2xl font-bold text-brand-royal">
                  {formatINR(result.amount ?? 0)}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  for {result.paidFor ?? "fee payment"}
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <Detail label="Paid by">
                  {result.student?.name ?? "—"}
                </Detail>
                <Detail label="Application ID">
                  <span className="font-mono">
                    {result.student?.applicationId ?? "—"}
                  </span>
                </Detail>
                <Detail label="Academic year">
                  {result.student?.academicYear ?? "—"}
                </Detail>
                <Detail label="Class">
                  {result.student?.className ?? "—"}
                </Detail>
                <Detail label="Payment method">
                  {(result.method ?? "—").toUpperCase()}
                </Detail>
                <Detail label="Paid on">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays
                      size={13}
                      className="text-text-muted"
                      aria-hidden="true"
                    />
                    {formatDateTime(result.paidAt)}
                  </span>
                </Detail>
              </dl>

              <div className="border-t border-surface-border pt-3 text-xs text-text-muted">
                Issued {formatDateTime(result.issuedAt)}
                {result.school?.name ? ` · ${result.school.name}` : ""}
              </div>
            </div>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-text-muted">
          Verification is provided by the school's fee management system.
        </p>
      </section>
    </main>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-text-primary">{children}</dd>
    </div>
  );
}
