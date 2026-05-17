"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, X, Send, Eye, Trash2, BellRing, FileText, History } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import {
  PrincipalApiError,
  createReminderRule,
  createReminderTemplate,
  deleteReminderRule,
  deleteReminderTemplate,
  dispatchReminders,
  listReminderLog,
  listReminderRules,
  listReminderTemplates,
  previewReminderRule,
  type ReminderChannel,
  type ReminderLogEntry,
  type ReminderPreview,
  type ReminderRule,
  type ReminderTemplate,
} from "@/lib/principalApi";
import { FeesSidebar } from "../_components/Sidebar";
import { useFeesSession } from "../_components/useFeesSession";
import { ToastContainer, nextToastId, type ToastItem } from "../_components/ToastContainer";

type Tab = "rules" | "templates" | "log";

const CHANNELS: { value: ReminderChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];

const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function RemindersPage() {
  const { token, isChecking, summary, isLoadingSummary, signOut } = useFeesSession();
  const [tab, setTab] = useState<Tab>("rules");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = nextToastId();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

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
        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        />
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-royal">
              Fees & Accounts
            </p>
            <h1 className="mt-1 text-xl font-semibold text-text-primary">Reminders</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Configure reminder templates, schedule rules by due-date offset, dispatch them
              to defaulters, and inspect the delivery log.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-surface-border">
            {(
              [
                { id: "rules" as Tab, label: "Rules", icon: BellRing },
                { id: "templates" as Tab, label: "Templates", icon: FileText },
                { id: "log" as Tab, label: "Delivery Log", icon: History },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-brand-royal text-brand-royal"
                      : "border-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          {tab === "templates" && <TemplatesView token={token} addToast={addToast} />}
          {tab === "rules" && <RulesView token={token} addToast={addToast} />}
          {tab === "log" && <LogView token={token} addToast={addToast} />}
        </div>
      </main>
    </div>
  );
}

// ── Templates ───────────────────────────────────────────────────────────────
function TemplatesView({
  token,
  addToast,
}: {
  token: string;
  addToast: (type: "success" | "error", message: string) => void;
}) {
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setTemplates(await listReminderTemplates(token));
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await deleteReminderTemplate(token, id);
      addToast("success", "Template deleted");
      await refresh();
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)} className="btn-pay">
          <Plus className="mr-1 h-4 w-4" /> New template
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center">
          <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
        </Card>
      ) : templates.length === 0 ? (
        <Card className="p-8 text-center text-sm text-text-muted">
          No templates yet. Templates render placeholders like{" "}
          <code className="rounded bg-slate-100 px-1">{"{{studentName}}"}</code>,{" "}
          <code className="rounded bg-slate-100 px-1">{"{{amount}}"}</code>,{" "}
          <code className="rounded bg-slate-100 px-1">{"{{dueDate}}"}</code>.
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="info">{t.channel}</Badge>
                    {!t.isActive && <Badge variant="default">Inactive</Badge>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(t.id)}
                  className="text-text-muted hover:text-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {t.subject && (
                <p className="mt-2 text-xs text-text-secondary">
                  <strong>Subject:</strong> {t.subject}
                </p>
              )}
              <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-50 p-2 text-xs text-text-secondary">
                {t.body}
              </pre>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <TemplateModal
          token={token}
          onClose={() => setShowModal(false)}
          onSaved={async () => {
            setShowModal(false);
            addToast("success", "Template created");
            await refresh();
          }}
          onError={(msg) => addToast("error", msg)}
        />
      )}
    </div>
  );
}

function TemplateModal({
  token,
  onClose,
  onSaved,
  onError,
}: {
  token: string;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<ReminderChannel>("email");
  const [subject, setSubject] = useState("Fee due reminder");
  const [body, setBody] = useState(
    "Dear {{parentName}},\n\nThis is a reminder that ₹{{amount}} is due on {{dueDate}} for {{studentName}}.\n\n— School Office",
  );
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-text-primary">New reminder template</h2>
          <button type="button" onClick={onClose} className="text-text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim() || !body.trim()) {
              onError("Name and body are required");
              return;
            }
            setSaving(true);
            try {
              await createReminderTemplate(token, {
                name: name.trim(),
                channel,
                subject: channel === "email" ? subject.trim() || undefined : undefined,
                body: body.trim(),
              });
              onSaved();
            } catch (err) {
              onError(err instanceof PrincipalApiError ? err.message : "Failed to save");
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-4 p-5"
        >
          <div>
            <Label htmlFor="t-name">Name *</Label>
            <Input
              id="t-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 3-days-before due (Email)"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="t-channel">Channel *</Label>
            <Select
              id="t-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as ReminderChannel)}
              className="mt-1"
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          {channel === "email" && (
            <div>
              <Label htmlFor="t-subject">Subject</Label>
              <Input
                id="t-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="t-body">Body *</Label>
            <Textarea
              id="t-body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 font-mono text-xs"
              required
            />
            <p className="mt-1 text-xs text-text-muted">
              Placeholders: {"{{studentName}}"}, {"{{parentName}}"}, {"{{amount}}"},{" "}
              {"{{dueDate}}"}, {"{{className}}"}, {"{{applicationId}}"}.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save template
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Rules ───────────────────────────────────────────────────────────────────
function RulesView({
  token,
  addToast,
}: {
  token: string;
  addToast: (type: "success" | "error", message: string) => void;
}) {
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [previewing, setPreviewing] = useState<ReminderPreview | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [r, t] = await Promise.all([
        listReminderRules(token),
        listReminderTemplates(token),
      ]);
      setRules(r);
      setTemplates(t);
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handlePreview = async (id: string) => {
    setBusyId(id);
    try {
      setPreviewing(await previewReminderRule(token, id));
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Preview failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleDispatch = async (id: string) => {
    if (!confirm("Send reminders to all matching recipients?")) return;
    setBusyId(id);
    try {
      const result = await dispatchReminders(token, { ruleId: id });
      addToast(
        "success",
        `Dispatched: ${result.sent} sent, ${result.failed} failed` +
          (result.skipped ? `, ${result.skipped} skipped (already sent today)` : ""),
      );
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Dispatch failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    try {
      await deleteReminderRule(token, id);
      addToast("success", "Rule deleted");
      await refresh();
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowModal(true)}
          className="btn-pay"
          disabled={templates.length === 0}
        >
          <Plus className="mr-1 h-4 w-4" /> New rule
        </Button>
      </div>

      {templates.length === 0 && (
        <Card className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Create a reminder template first.
        </Card>
      )}

      {isLoading ? (
        <Card className="p-12 text-center">
          <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
        </Card>
      ) : rules.length === 0 ? (
        <Card className="p-8 text-center text-sm text-text-muted">
          No rules yet. Rules tell the dispatcher which charges to remind on, when, and via
          which template.
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">{rule.name}</p>
                    {rule.template && <Badge variant="info">{rule.template.channel}</Badge>}
                    {!rule.isActive && <Badge variant="default">Inactive</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    {rule.academicYear} · template: {rule.template?.name ?? "—"}
                    {rule.daysBeforeDue != null
                      ? ` · ${rule.daysBeforeDue} days before due`
                      : ""}
                    {rule.daysAfterDue != null
                      ? ` · ${rule.daysAfterDue} days after due`
                      : ""}
                    {rule.minAmount ? ` · min ${formatINR(rule.minAmount)}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => void handlePreview(rule.id)}
                    disabled={busyId === rule.id}
                  >
                    <Eye className="mr-1 h-4 w-4" /> Preview
                  </Button>
                  <Button
                    onClick={() => void handleDispatch(rule.id)}
                    disabled={busyId === rule.id}
                    className="btn-pay"
                  >
                    {busyId === rule.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-4 w-4" />
                    )}
                    Dispatch
                  </Button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(rule.id)}
                    className="text-text-muted hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <RuleModal
          token={token}
          templates={templates}
          onClose={() => setShowModal(false)}
          onSaved={async () => {
            setShowModal(false);
            addToast("success", "Rule created");
            await refresh();
          }}
          onError={(msg) => addToast("error", msg)}
        />
      )}

      {previewing && (
        <PreviewModal preview={previewing} onClose={() => setPreviewing(null)} />
      )}
    </div>
  );
}

function RuleModal({
  token,
  templates,
  onClose,
  onSaved,
  onError,
}: {
  token: string;
  templates: ReminderTemplate[];
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [offsetMode, setOffsetMode] = useState<"before" | "after">("before");
  const [offsetDays, setOffsetDays] = useState("3");
  const [minAmount, setMinAmount] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-text-primary">New reminder rule</h2>
          <button type="button" onClick={onClose} className="text-text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim() || !academicYear.trim() || !templateId) {
              onError("Name, academic year, and template are required");
              return;
            }
            const days = parseInt(offsetDays, 10);
            if (!Number.isFinite(days) || days < 0) {
              onError("Offset days must be a non-negative number");
              return;
            }
            setSaving(true);
            try {
              await createReminderRule(token, {
                name: name.trim(),
                academicYear: academicYear.trim(),
                templateId,
                daysBeforeDue: offsetMode === "before" ? days : undefined,
                daysAfterDue: offsetMode === "after" ? days : undefined,
                minAmount: parseFloat(minAmount) > 0 ? parseFloat(minAmount) : undefined,
              });
              onSaved();
            } catch (err) {
              onError(err instanceof PrincipalApiError ? err.message : "Failed to save");
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-4 p-5"
        >
          <div>
            <Label htmlFor="r-name">Name *</Label>
            <Input
              id="r-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 3-day pre-due email"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="r-year">Academic year *</Label>
            <Input
              id="r-year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2026-27"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="r-template">Template *</Label>
            <Select
              id="r-template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="mt-1"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.channel})
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="r-mode">When</Label>
              <Select
                id="r-mode"
                value={offsetMode}
                onChange={(e) => setOffsetMode(e.target.value as "before" | "after")}
                className="mt-1"
              >
                <option value="before">Days before due</option>
                <option value="after">Days after due</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="r-offset">Days</Label>
              <Input
                id="r-offset"
                type="number"
                min="0"
                value={offsetDays}
                onChange={(e) => setOffsetDays(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="r-min">Min amount due (₹)</Label>
            <Input
              id="r-min"
              type="number"
              min="0"
              step="0.01"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="Optional"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save rule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PreviewModal({ preview, onClose }: { preview: ReminderPreview; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-text-primary">Preview · {preview.rule.name}</h2>
            <p className="text-xs text-text-muted">
              {preview.recipientCount} recipients via {preview.rule.channel}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {preview.recipients.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              No recipients matched this rule today.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-2 py-2">Student</th>
                  <th className="px-2 py-2">Class</th>
                  <th className="px-2 py-2">Contact</th>
                  <th className="px-2 py-2 text-right">Due</th>
                  <th className="px-2 py-2">Earliest due</th>
                </tr>
              </thead>
              <tbody>
                {preview.recipients.map((r) => (
                  <tr key={r.accountId} className="border-b border-gray-100 last:border-0">
                    <td className="px-2 py-2">
                      <p className="font-medium text-text-primary">{r.studentName}</p>
                      <p className="text-xs text-text-muted">{r.applicationId ?? ""}</p>
                    </td>
                    <td className="px-2 py-2 text-text-secondary">{r.className ?? "—"}</td>
                    <td className="px-2 py-2 text-text-secondary">{r.contact ?? "—"}</td>
                    <td className="px-2 py-2 text-right text-rose-700">
                      {formatINR(r.amountDue)}
                    </td>
                    <td className="px-2 py-2 text-text-secondary">{r.earliestDueDate ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {preview.recipients.length > 0 && preview.recipients.length < preview.recipientCount && (
            <p className="mt-2 text-xs text-text-muted">
              Showing first {preview.recipients.length} of {preview.recipientCount} recipients.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Log ────────────────────────────────────────────────────────────────────
function LogView({
  token,
  addToast,
}: {
  token: string;
  addToast: (type: "success" | "error", message: string) => void;
}) {
  const [log, setLog] = useState<ReminderLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | "queued" | "sent" | "failed">("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setLog(await listReminderLog(token, statusFilter ? { status: statusFilter } : undefined));
    } catch (err) {
      addToast("error", err instanceof PrincipalApiError ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, addToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <Label htmlFor="log-status">Status</Label>
          <Select
            id="log-status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "" | "queued" | "sent" | "failed")
            }
            className="mt-1 h-9 w-40"
          >
            <option value="">All</option>
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </Select>
        </div>
        <Button variant="secondary" onClick={() => void refresh()} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center">
          <Loader2 className="mx-auto h-4 w-4 animate-spin text-text-muted" />
        </Card>
      ) : log.length === 0 ? (
        <Card className="p-8 text-center text-sm text-text-muted">
          No reminder deliveries yet.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3">Sent / queued</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(entry.sentAt ?? entry.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{entry.channel}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{entry.recipient}</td>
                  <td className="px-4 py-3 text-right text-rose-700">
                    {formatINR(entry.dueAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        entry.status === "sent"
                          ? "success"
                          : entry.status === "failed"
                            ? "error"
                            : "warning"
                      }
                    >
                      {entry.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-rose-600">{entry.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
