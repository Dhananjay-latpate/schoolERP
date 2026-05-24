"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck2,
  GraduationCap,
  Loader2,
  Pencil,
  Receipt,
  Save,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import {
  PrincipalApiError,
  getStudentProfile,
  updateStudent,
  type StudentProfile,
} from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const STATUS_BADGES: Record<string, "success" | "error" | "warning" | "info" | "default"> = {
  present: "success",
  absent: "error",
  late: "warning",
  excused: "info",
  half_day: "warning",
  on_leave: "info",
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
    <p className="mt-0.5 text-sm text-text-primary">{value ?? "—"}</p>
  </div>
);

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ section: "", phone: "", parentName: "", status: "active" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const existing = getPrincipalToken();
    if (!existing) {
      router.replace(`/principal/login?next=%2Fprincipal%2Fstudents%2F${studentId}`);
      return;
    }
    setToken(existing);
  }, [router, studentId]);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await getStudentProfile(token, studentId);
      setProfile(data);
      setForm({
        section: data.section,
        phone: data.guardian.phone ?? "",
        parentName: data.guardian.parentName ?? "",
        status: data.status,
      });
    } catch (err) {
      if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) {
        clearPrincipalSession();
        router.replace("/principal/login?next=%2Fprincipal%2Fstudents");
        return;
      }
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load student");
    } finally {
      setIsLoading(false);
    }
  }, [token, studentId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    setError("");
    try {
      await updateStudent(token, studentId, {
        section: form.section,
        phone: form.phone,
        parentName: form.parentName,
        status: form.status,
      });
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-bg">
        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link
            href="/principal/students"
            className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to directory
          </Link>
          <Card className="border-brand-rose/25 bg-brand-rose-light p-4 text-sm text-status-error">
            {error || "Student not found"}
          </Card>
        </div>
      </main>
    );
  }

  const att = profile.attendance.summary;

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/principal/students"
          className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to directory
        </Link>

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="inline-grid h-14 w-14 place-items-center rounded-full bg-brand-sky-light text-lg font-semibold text-brand-royal">
                {profile.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
                  <GraduationCap className="mr-1 inline h-3.5 w-3.5" />
                  Roll {profile.rollNumber}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-text-primary">{profile.name}</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  {profile.className ?? "Unassigned class"}
                  {profile.section ? ` · Section ${profile.section}` : ""}
                  {profile.grNumber ? ` · GR ${profile.grNumber}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={profile.status === "active" ? "success" : "default"}>
                {profile.status === "active" ? "Active" : profile.status}
              </Badge>
              {!editing && (
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>
          </div>
        </Card>

        {error && (
          <Card className="border-brand-rose/25 bg-brand-rose-light p-3 text-sm text-status-error">
            {error}
          </Card>
        )}

        {editing && (
          <Card className="p-5">
            <SectionHeader eyebrow="Edit" title="Update student record" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Section</Label>
                <Input
                  value={form.section}
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
              <div>
                <Label>Guardian name</Label>
                <Input
                  value={form.parentName}
                  onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Contact phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save changes
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={isSaving}>
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
            </div>
          </Card>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Fees charged" value={formatINR(profile.fee.totalCharged)} tone="brand" />
          <StatCard label="Fees paid" value={formatINR(profile.fee.totalPaid)} tone="emerald" />
          <StatCard
            label="Outstanding"
            value={formatINR(profile.fee.totalDue)}
            tone={profile.fee.totalDue > 0 ? "rose" : "emerald"}
          />
          <StatCard
            label="Days present"
            value={String(att.present ?? 0)}
            meta={`${att.total ?? 0} records`}
            icon={CalendarCheck2}
            tone="brand"
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <SectionHeader eyebrow="Profile" title="Demographics" />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Gender" value={profile.demographics?.gender} />
              <Field label="Date of birth" value={formatDate(profile.demographics?.dateOfBirth ?? null)} />
              <Field label="Nationality" value={profile.demographics?.nationality} />
              <Field label="Religion" value={profile.demographics?.religion} />
              <Field label="Mother tongue" value={profile.demographics?.motherTongue} />
              <Field label="Enrolled on" value={formatDate(profile.enrolledAt)} />
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader eyebrow="Guardian" title="Contact" />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Guardian" value={profile.guardian.parentName} />
              <Field label="Phone" value={profile.guardian.phone} />
              <Field label="Father" value={profile.guardian.fatherName} />
              <Field label="Mother" value={profile.guardian.motherName} />
              <Field label="Emergency" value={profile.guardian.emergencyContact} />
              <Field label="Address" value={profile.guardian.address} />
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeader
              eyebrow="Finance"
              title="Fee account"
              description="Charges, payments, and outstanding dues for this student."
            />
            {profile.fee.accountId && (
              <Link
                href={`/principal/fees/students/${profile.fee.accountId}`}
                className="inline-flex items-center text-sm font-semibold text-brand-royal hover:underline"
              >
                <Receipt className="mr-1 h-4 w-4" /> Open fee ledger →
              </Link>
            )}
          </div>
          {!profile.fee.accountId && (
            <p className="mt-3 text-sm text-text-secondary">
              No fee account is linked to this student yet.
            </p>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-surface-border px-5 py-3.5">
            <SectionHeader
              eyebrow="Attendance"
              title="Recent records"
              description="Most recent attendance entries for this student."
            />
          </div>
          {profile.attendance.recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-text-secondary">No attendance recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {profile.attendance.recent.map((r) => (
                  <tr key={r.id} className="border-b border-surface-divider last:border-0">
                    <td className="px-5 py-3 text-text-secondary">{formatDate(r.date)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS_BADGES[r.status] ?? "default"}>
                        {r.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{r.remarks ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </main>
  );
}
