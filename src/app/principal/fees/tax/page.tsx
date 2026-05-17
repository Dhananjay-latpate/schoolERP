"use client";

import { useCallback, useState } from "react";
import { Loader2, FileText, FileBarChart } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  PrincipalApiError,
  getTaxCertificate,
  getGstReport,
  type TaxCertificate,
  type GstReport,
} from "@/lib/principalApi";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";

type Tab = "gst" | "certificate";

const formatINR = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TaxGstPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();

  const [tab, setTab] = useState<Tab>("gst");

  // GST Report state
  const [gstYear, setGstYear] = useState("");
  const [gstLoading, setGstLoading] = useState(false);
  const [gstError, setGstError] = useState<string | null>(null);
  const [gstReport, setGstReport] = useState<GstReport | null>(null);

  // Tax Certificate state
  const [certApplicationId, setCertApplicationId] = useState("");
  const [certYear, setCertYear] = useState("");
  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<TaxCertificate | null>(null);

  const loadGstReport = useCallback(async () => {
    if (!token || !gstYear.trim()) return;
    setGstLoading(true);
    setGstError(null);
    try {
      const data = await getGstReport(token, gstYear.trim());
      setGstReport(data);
    } catch (err) {
      setGstError(err instanceof PrincipalApiError ? err.message : "Failed to load GST report");
    } finally {
      setGstLoading(false);
    }
  }, [token, gstYear]);

  const loadCertificate = useCallback(async () => {
    if (!token || !certApplicationId.trim() || !certYear.trim()) return;
    setCertLoading(true);
    setCertError(null);
    setCertificate(null);
    try {
      const data = await getTaxCertificate(token, certApplicationId.trim(), certYear.trim());
      setCertificate(data);
    } catch (err) {
      setCertError(err instanceof PrincipalApiError ? err.message : "Failed to load certificate");
    } finally {
      setCertLoading(false);
    }
  }, [token, certApplicationId, certYear]);

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
              Fees &amp; Accounts
            </p>
            <h1 className="mt-1 text-xl font-semibold text-text-primary">Tax &amp; GST</h1>
            <p className="mt-1 text-sm text-text-secondary">
              GST collection reports and 80C tax certificates for families.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border-default">
            <button
              onClick={() => setTab("gst")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === "gst"
                  ? "border-brand-royal text-brand-royal"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <FileBarChart className="h-4 w-4" />
              GST Report
            </button>
            <button
              onClick={() => setTab("certificate")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === "certificate"
                  ? "border-brand-royal text-brand-royal"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <FileText className="h-4 w-4" />
              80C Certificate
            </button>
          </div>

          {/* GST Report Tab */}
          {tab === "gst" && (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[160px]">
                    <Label htmlFor="gst-year">Academic year</Label>
                    <Input
                      id="gst-year"
                      placeholder="e.g., 2026-27"
                      value={gstYear}
                      onChange={(e) => setGstYear(e.target.value)}
                    />
                  </div>
                  <Button onClick={loadGstReport} disabled={gstLoading || !gstYear.trim()}>
                    {gstLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
                  </Button>
                </div>
              </Card>

              {gstError && (
                <p className="text-sm text-status-error">{gstError}</p>
              )}

              {gstReport && (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-text-primary">
                      GST Report — {gstReport.academicYear}
                    </h2>
                    <span className="text-sm font-semibold text-text-primary">
                      Total GST: {formatINR(gstReport.totalGstCollectedInPaise)}
                    </span>
                  </div>

                  {gstReport.breakdown.length === 0 ? (
                    <p className="text-sm text-text-secondary">No GST transactions found for this year.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border-default text-left text-text-secondary">
                            <th className="pb-2 pr-4 font-medium">Fee Head</th>
                            <th className="pb-2 pr-4 font-medium text-right">GST Rate</th>
                            <th className="pb-2 pr-4 font-medium text-right">Taxable Base</th>
                            <th className="pb-2 pr-4 font-medium text-right">GST Amount</th>
                            <th className="pb-2 font-medium text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gstReport.breakdown.map((row, i) => (
                            <tr key={i} className="border-b border-border-subtle last:border-0">
                              <td className="py-2 pr-4 text-text-primary">{row.headName}</td>
                              <td className="py-2 pr-4 text-right text-text-secondary">{row.gstRatePercent}%</td>
                              <td className="py-2 pr-4 text-right">{formatINR(row.baseAmountInPaise)}</td>
                              <td className="py-2 pr-4 text-right text-status-success">{formatINR(row.taxAmountInPaise)}</td>
                              <td className="py-2 text-right font-medium">{formatINR(row.totalAmountInPaise)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border-default font-semibold">
                            <td className="pt-2 pr-4 text-text-primary" colSpan={3}>Total</td>
                            <td className="pt-2 pr-4 text-right text-status-success">
                              {formatINR(gstReport.breakdown.reduce((s, r) => s + r.taxAmountInPaise, 0))}
                            </td>
                            <td className="pt-2 text-right">
                              {formatINR(gstReport.breakdown.reduce((s, r) => s + r.totalAmountInPaise, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* 80C Certificate Tab */}
          {tab === "certificate" && (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[160px]">
                    <Label htmlFor="cert-id">Application ID</Label>
                    <Input
                      id="cert-id"
                      placeholder="e.g., APP-2024-0001"
                      value={certApplicationId}
                      onChange={(e) => setCertApplicationId(e.target.value)}
                    />
                  </div>
                  <div className="w-36">
                    <Label htmlFor="cert-year">Academic year</Label>
                    <Input
                      id="cert-year"
                      placeholder="e.g., 2026-27"
                      value={certYear}
                      onChange={(e) => setCertYear(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={loadCertificate}
                    disabled={certLoading || !certApplicationId.trim() || !certYear.trim()}
                  >
                    {certLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
                  </Button>
                </div>
              </Card>

              {certError && (
                <p className="text-sm text-status-error">{certError}</p>
              )}

              {certificate && (
                <Card className="p-6 space-y-4 print:shadow-none">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-text-primary">
                        Fee Payment Certificate (80C)
                      </h2>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Generated: {new Date(certificate.generatedAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => window.print()}
                      className="print:hidden"
                    >
                      Print
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm border border-border-default rounded p-3">
                    <div>
                      <span className="text-text-secondary">Student Name</span>
                      <p className="font-medium text-text-primary">{certificate.studentName}</p>
                    </div>
                    <div>
                      <span className="text-text-secondary">Application ID</span>
                      <p className="font-medium text-text-primary">{certificate.applicationId}</p>
                    </div>
                    <div>
                      <span className="text-text-secondary">Academic Year</span>
                      <p className="font-medium text-text-primary">{certificate.academicYear}</p>
                    </div>
                    <div>
                      <span className="text-text-secondary">Total Fees Paid</span>
                      <p className="font-semibold text-text-primary">{formatINR(certificate.totalPaidInPaise)}</p>
                    </div>
                  </div>

                  {certificate.breakdown.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border-default text-left text-text-secondary">
                            <th className="pb-2 pr-4 font-medium">Fee Head</th>
                            <th className="pb-2 pr-4 font-medium text-right">Charged</th>
                            <th className="pb-2 font-medium text-right">Paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {certificate.breakdown.map((row, i) => (
                            <tr key={i} className="border-b border-border-subtle last:border-0">
                              <td className="py-2 pr-4 text-text-primary">{row.chargeName}</td>
                              <td className="py-2 pr-4 text-right">{formatINR(row.amountInPaise)}</td>
                              <td className="py-2 text-right">{formatINR(row.paidInPaise)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border-default font-semibold">
                            <td className="pt-2 pr-4 text-text-primary">Total</td>
                            <td className="pt-2 pr-4 text-right">
                              {formatINR(certificate.breakdown.reduce((s, r) => s + r.amountInPaise, 0))}
                            </td>
                            <td className="pt-2 text-right">
                              {formatINR(certificate.totalPaidInPaise)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
