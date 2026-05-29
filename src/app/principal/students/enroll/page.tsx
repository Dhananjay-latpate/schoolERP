"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UserCheck, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero } from "@/components/shared/PageHero";
import {
  PrincipalApiError,
  listPendingEnrollment,
  enrollApplication,
  type PendingEnrollment,
} from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

export default function EnrollStudentsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [pending, setPending] = useState<PendingEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [active, setActive] = useState<PendingEnrollment | null>(null);
  const [form, setForm] = useState({ rollNumber: "", section: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    const existing = getPrincipalToken();
    if (!existing) {
      router.replace("/principal/login?next=%2Fprincipal%2Fstudents%2Fenroll");
      return;
    }
    setToken(existing);
  }, [router]);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await listPendingEnrollment(token);
      setPending(data);
    } catch (err) {
      if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) {
        clearPrincipalSession();
        router.replace("/principal/login?next=%2Fprincipal%2Fstudents%2Fenroll");
        return;
      }
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load applicants");
    } finally {
      setIsLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEnroll = (applicant: PendingEnrollment) => {
    setActive(applicant);
    setModalError("");
    setForm({
      rollNumber: applicant.suggestedRollNumber ?? "",
      section: applicant.classSection ?? "",
    });
  };

  const handleEnroll = async () => {
    if (!token || !active) return;
    setIsSaving(true);
    setModalError("");
    try {
      await enrollApplication(token, active.id, {
        rollNumber: form.rollNumber.trim() || undefined,
        section: form.section.trim() || undefined,
      });
      setNotice(`${active.studentName} enrolled successfully.`);
      setActive(null);
      await load();
    } catch (err) {
      setModalError(err instanceof PrincipalApiError ? err.message : "Failed to enroll applicant");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/principal/students"
          className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to directory
        </Link>

        <PageHero
          icon={UserPlus}
          eyebrow="Enrollment"
          title="Enroll approved applicants"
          description="Approved admission applications waiting to be turned into enrolled student records."
          badges={[{ label: `${pending.length} pending`, tone: "live" }]}
        />

        {notice && (
          <Card className="flex items-center gap-2 border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <UserCheck className="h-4 w-4" />
            {notice}
          </Card>
        )}
        {error && (
          <Card className="border-brand-rose/25 bg-brand-rose-light p-3 text-sm text-status-error">
            {error}
          </Card>
        )}

        <Card className="overflow-x-auto p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
            </div>
          ) : pending.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No applicants to enroll"
              description="Approved applications appear here once they're ready to join the roster."
              tone="success"
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Guardian</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pending.map((applicant) => (
                  <tr key={applicant.id} className="border-b border-surface-divider last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{applicant.studentName}</p>
                      <p className="text-xs text-text-muted">{applicant.gender}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <p className="font-mono text-xs">{applicant.applicationId}</p>
                      {applicant.grNumber && (
                        <Badge variant="info" className="mt-1">
                          GR {applicant.grNumber}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {applicant.className ? (
                        <>
                          {applicant.className}
                          {applicant.classSection ? ` · ${applicant.classSection}` : ""}
                        </>
                      ) : (
                        <span className="text-status-error">No class assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <p>{applicant.fatherName}</p>
                      <p className="text-xs text-text-muted">{applicant.emergencyContact}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => openEnroll(applicant)}>
                        <UserPlus className="mr-1 h-3.5 w-3.5" /> Enroll
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {active && (
        <div className="overlay-backdrop" onClick={() => !isSaving && setActive(null)}>
          <div
            className="modal-panel mx-auto mt-24 max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
                  Enroll student
                </p>
                <h2 className="mt-1 text-lg font-semibold text-text-primary">
                  {active.studentName}
                </h2>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {active.className ?? "No class"}
                  {active.classSection ? ` · ${active.classSection}` : ""}
                </p>
              </div>
              <button
                onClick={() => setActive(null)}
                className="rounded-md p-1 text-text-muted hover:bg-surface-muted"
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <Label>Roll number</Label>
                <Input
                  value={form.rollNumber}
                  placeholder="Auto-generated if left blank"
                  onChange={(e) => setForm((f) => ({ ...f, rollNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label>Section</Label>
                <Input
                  value={form.section}
                  placeholder="e.g. A"
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                />
              </div>
            </div>

            {modalError && <p className="mt-3 text-sm text-status-error">{modalError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setActive(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleEnroll} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-1.5 h-4 w-4" />
                )}
                Confirm enrollment
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
