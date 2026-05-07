"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAdmissionById, type AdmissionRecord } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

function statusVariant(
  status: string,
): "default" | "success" | "warning" | "error" {
  if (["approved", "admission_confirmed", "payment_completed"].includes(status))
    return "success";
  if (["rejected"].includes(status)) return "error";
  if (["under_review", "payment_pending", "submitted"].includes(status))
    return "warning";
  return "default";
}

export default function AdmissionStatusPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<AdmissionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await getAdmissionById(params.id);
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch application",
        );
      } finally {
        setLoading(false);
      }
    }

    if (params.id) load();
  }, [params.id]);

  if (loading) {
    return (
      <Card className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-text-secondary">
          Loading application status...
        </p>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-rose-600">
          {error || "Application not found"}
        </p>
        <Link
          href="/admissions/apply"
          className="mt-3 inline-block text-sm font-semibold text-brand-royal"
        >
          Start a new application
        </Link>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
            Application Tracker
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">
            {data.firstName} {data.lastName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Application ID: {data.applicationId}
          </p>
        </div>
        <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-surface-border bg-surface-muted p-3">
          <p className="text-xs uppercase text-text-muted">Class Applied</p>
          <p className="text-sm font-semibold text-text-primary">
            {data.classAdmitted}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-muted p-3">
          <p className="text-xs uppercase text-text-muted">Emergency Contact</p>
          <p className="text-sm font-semibold text-text-primary">
            {data.emergencyContact}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-muted p-3 sm:col-span-2">
          <p className="text-xs uppercase text-text-muted">Address</p>
          <p className="text-sm font-semibold text-text-primary">
            {data.address}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-brand-sky/20 bg-brand-sky/10 p-4 text-sm text-text-secondary">
        Keep this page bookmarked to track updates from school administration.
      </div>
    </Card>
  );
}
