"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card } from "@/components/ui/Card";
import { ParentApiError, parentLogin } from "@/lib/parentFeesApi";
import { setParentSession } from "@/lib/parentSession";

export default function ParentLoginPage() {
  const router = useRouter();
  const [applicationId, setApplicationId] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!applicationId.trim() || !phone.trim()) {
      setError("Both application ID and phone are required.");
      return;
    }
    setLoading(true);
    try {
      const result = await parentLogin({
        applicationId: applicationId.trim(),
        phone: phone.trim(),
      });
      setParentSession(result.token);
      router.replace("/parent/fees");
    } catch (err) {
      setError(err instanceof ParentApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-bg px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="rounded-md bg-brand-royal px-2 py-1 text-sm font-bold text-white">
              R
            </span>
            <span className="text-base font-semibold text-text-primary">
              Resillix Parent Portal
            </span>
          </Link>
        </div>
        <Card className="p-6">
          <h1 className="text-lg font-semibold text-text-primary">Sign in</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Use your application ID and the phone number you provided at admission.
          </p>
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="appId">Application ID</Label>
              <Input
                id="appId"
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                placeholder="e.g., APP1234567890"
                disabled={loading}
                className="mt-1"
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Full number or last 4 digits"
                disabled={loading}
                className="mt-1"
                required
              />
              <p className="mt-1 text-xs text-text-muted">
                Last 4 digits of the registered emergency contact also work.
              </p>
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full btn-pay">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-text-muted">
          Don't have an application?{" "}
          <Link href="/admissions/apply" className="text-brand-royal hover:underline">
            Start admission
          </Link>
        </p>
      </div>
    </main>
  );
}
