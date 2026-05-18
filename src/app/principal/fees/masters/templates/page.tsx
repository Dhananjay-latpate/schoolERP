"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  PrincipalApiError,
  listInstallmentTemplates,
} from "@/lib/principalApi";
import type { FeeInstallmentTemplate } from "@/types/fees";
import { FeesSidebar } from "../../_components/Sidebar";
import { useFeesSession } from "../../_components/useFeesSession";

export default function InstallmentTemplatesPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [templates, setTemplates] = useState<FeeInstallmentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await listInstallmentTemplates(token);
      setTemplates(data);
    } catch (err) {
      setError(err instanceof PrincipalApiError ? err.message : "Failed to load templates");
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
            <h1 className="mt-1 text-xl font-semibold text-text-primary">
              Installment Templates
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Reusable installment schedules expressed as percentage + offset days from
              enrollment. Used when assembling fee structures.
            </p>
          </div>

          {error && (
            <Card className="border-brand-rose/25 bg-brand-rose-light p-3 text-sm text-status-error">{error}</Card>
          )}

          {isLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
            </Card>
          ) : templates.length === 0 ? (
            <Card className="p-8 text-center text-sm text-text-muted">
              No templates yet. They will appear here when the admissions setup wizard
              creates them.
            </Card>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{template.name}</p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {template.academicYear} · {template.lines.length} installments
                      </p>
                    </div>
                    <Badge variant="default">
                      {template.lines.reduce((sum, l) => sum + l.percentage, 0).toFixed(0)}%
                      total
                    </Badge>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-text-muted">
                          <th className="py-1">#</th>
                          <th className="py-1">Name</th>
                          <th className="py-1 text-right">%</th>
                          <th className="py-1 text-right">Offset (days)</th>
                          <th className="py-1">Fallback date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {template.lines
                          .slice()
                          .sort((a, b) => a.sequence - b.sequence)
                          .map((line) => (
                            <tr key={line.sequence} className="border-t border-surface-divider">
                              <td className="py-1.5">{line.sequence}</td>
                              <td className="py-1.5 text-text-primary">
                                {line.name ?? `Installment ${line.sequence}`}
                              </td>
                              <td className="py-1.5 text-right">{line.percentage}%</td>
                              <td className="py-1.5 text-right">
                                {line.dueOffsetDays ?? "—"}
                              </td>
                              <td className="py-1.5 text-text-muted">{line.dueDate ?? "—"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
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
