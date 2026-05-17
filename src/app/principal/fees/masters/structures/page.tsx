"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  PrincipalApiError,
  listFeeStructures,
  type PrincipalFeeStructure,
} from "@/lib/principalApi";
import { FeesSidebar } from "../../_components/Sidebar";
import { useFeesSession } from "../../_components/useFeesSession";

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function FeeStructuresPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [structures, setStructures] = useState<PrincipalFeeStructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await listFeeStructures(token);
      setStructures(data);
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load structures");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-bg">
        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
      </main>
    );
  }
  if (!token) return null;

  return (
    <div className="flex">
      <FeesSidebar summary={summary} isLoading={isLoadingSummary} onSignOut={signOut} />
      <main className="flex-1 lg:ml-60">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
              Masters
            </p>
            <h1 className="mt-1 text-xl font-semibold text-text-primary">Fee Structures</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Per-class, per-academic-year fee compositions. Used by the admissions form and
              for bulk plan creation.
            </p>
          </div>

          {error && (
            <Card className="border-brand-rose/25 bg-brand-rose-light p-3 text-sm text-status-error">{error}</Card>
          )}

          {isLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
            </Card>
          ) : structures.length === 0 ? (
            <Card className="p-8 text-center text-sm text-text-muted">
              No fee structures defined yet. Add them from the Admissions → Setup wizard.
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {structures.map((structure) => (
                <Card key={structure.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {structure.class.name}
                        {structure.class.section ? ` · ${structure.class.section}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">{structure.academicYear}</p>
                    </div>
                    <Badge variant="info">{formatINR(structure.totalAmount)}</Badge>
                  </div>
                  <div className="mt-3 space-y-1">
                    {structure.feeComponents.slice(0, 4).map((component) => (
                      <div
                        key={component.id}
                        className="flex items-center justify-between text-xs text-text-secondary"
                      >
                        <span>
                          {component.name}
                          {component.isMandatory ? "" : " (optional)"}
                        </span>
                        <span>{formatINR(component.amount)}</span>
                      </div>
                    ))}
                    {structure.feeComponents.length > 4 && (
                      <p className="text-xs text-text-muted">
                        + {structure.feeComponents.length - 4} more
                      </p>
                    )}
                  </div>
                  <div className="mt-3 border-t border-surface-border pt-2 text-xs text-text-muted">
                    {structure.installmentOptions.length} installment plan
                    {structure.installmentOptions.length === 1 ? "" : "s"} configured
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
