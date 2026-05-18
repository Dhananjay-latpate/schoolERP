"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarPlus,
  CheckCircle2,
  CopyPlus,
  Loader2,
  Lock,
  PlayCircle,
  Pencil,
  RotateCcw,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  archiveAdmissionSession,
  closeAdmissionSession,
  commenceAdmissionSession,
  createAdmissionSession,
  initializeAdmissionSession,
  listAdmissionSessions,
  restoreAdmissionSession,
  updateAdmissionSession,
  type PrincipalAdmissionSession,
  type PrincipalClass,
  type PrincipalFeeStructure,
} from "@/lib/principalApi";
import {
  buildSessionCodeOptions,
  computeSessionReadiness,
  ConfirmDialog,
  formatDateTime,
  Modal,
  SESSION_STATUS_META,
} from "./setupShared";

interface SessionsPanelProps {
  token: string;
  sessions: PrincipalAdmissionSession[];
  classes: PrincipalClass[];
  feeStructures: PrincipalFeeStructure[];
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  addToast: (type: "success" | "error", message: string) => void;
  onMutated: () => Promise<void> | void;
}

type DialogState =
  | { kind: "edit"; session: PrincipalAdmissionSession }
  | { kind: "commence"; session: PrincipalAdmissionSession }
  | { kind: "close"; session: PrincipalAdmissionSession }
  | { kind: "copy"; session: PrincipalAdmissionSession }
  | { kind: "archive"; session: PrincipalAdmissionSession }
  | { kind: "restore"; session: PrincipalAdmissionSession }
  | null;

export function SessionsPanel({
  token,
  sessions,
  classes,
  feeStructures,
  selectedSessionId,
  onSelectSession,
  addToast,
  onMutated,
}: SessionsPanelProps) {
  const [newCode, setNewCode] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);

  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived] = useState<PrincipalAdmissionSession[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [editNotes, setEditNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const usedCodes = useMemo(
    () => new Set(sessions.map((s) => s.sessionCode)),
    [sessions],
  );
  const codeOptions = useMemo(
    () => buildSessionCodeOptions().filter((code) => !usedCodes.has(code)),
    [usedCodes],
  );

  useEffect(() => {
    if (!newCode && codeOptions.length > 0) setNewCode(codeOptions[0]);
  }, [codeOptions, newCode]);

  const loadArchived = useCallback(async () => {
    setLoadingArchived(true);
    try {
      const all = await listAdmissionSessions(token, true);
      setArchived(all.filter((s) => Boolean(s.archivedAt)));
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to load archived sessions.",
      );
    } finally {
      setLoadingArchived(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    if (showArchived) void loadArchived();
  }, [showArchived, loadArchived, sessions]);

  const refreshAll = useCallback(async () => {
    await onMutated();
    if (showArchived) await loadArchived();
  }, [onMutated, showArchived, loadArchived]);

  const handleCreate = async () => {
    const code = newCode.trim();
    if (!code) {
      addToast("error", "Pick an academic year for the new session.");
      return;
    }
    setCreating(true);
    try {
      const created = await createAdmissionSession(token, {
        sessionCode: code,
        notes: newNotes.trim() || undefined,
      });
      addToast("success", `Admission session ${created.sessionCode} created.`);
      setNewNotes("");
      setNewCode("");
      onSelectSession(created.id);
      await refreshAll();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to create session.",
      );
    } finally {
      setCreating(false);
    }
  };

  const closeDialog = () => {
    if (busy) return;
    setDialog(null);
  };

  const handleSaveNotes = async () => {
    if (dialog?.kind !== "edit") return;
    setBusy(true);
    try {
      await updateAdmissionSession(token, dialog.session.id, {
        notes: editNotes.trim(),
      });
      addToast("success", "Session notes updated.");
      setDialog(null);
      await refreshAll();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to update session.",
      );
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setBusy(true);
    try {
      await action();
      addToast("success", successMessage);
      setDialog(null);
      await refreshAll();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Action failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const renderSessionCard = (
    session: PrincipalAdmissionSession,
    isArchivedCard: boolean,
  ) => {
    const meta = SESSION_STATUS_META[session.status];
    const readiness = computeSessionReadiness(
      session.sessionCode,
      classes,
      feeStructures,
    );
    const isSelected = !isArchivedCard && session.id === selectedSessionId;

    return (
      <div
        key={session.id}
        className={`rounded-xl border p-4 transition ${
          isSelected
            ? "border-brand-royal/50 bg-brand-royal/5 ring-1 ring-brand-royal/20"
            : "border-surface-border bg-white hover:border-brand-royal/30"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {session.sessionCode}
              </h3>
              <Badge variant={meta.variant}>{meta.label}</Badge>
              {session.isActive && (
                <Badge variant="success" className="inline-flex items-center gap-1">
                  <Star size={11} /> Active
                </Badge>
              )}
              {isArchivedCard && <Badge variant="warning">Archived</Badge>}
            </div>
            <p className="mt-1 text-xs text-slate-500">{meta.hint}</p>
          </div>
          {!isArchivedCard && (
            <Button
              variant={isSelected ? "primary" : "secondary"}
              size="sm"
              onClick={() => onSelectSession(session.id)}
            >
              {isSelected ? "Configuring" : "Configure"}
            </Button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Classes" value={readiness.classCount} />
          <Stat
            label="With fees"
            value={`${readiness.classesWithFees}/${readiness.classCount}`}
          />
          <Stat label="Created" value={formatDateTime(session.createdAt)} />
          <Stat
            label="Opened"
            value={formatDateTime(session.commencedAt)}
          />
        </div>

        {session.notes && (
          <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {session.notes}
          </p>
        )}

        {!isArchivedCard && session.status !== "commenced" && (
          <p className="mt-3 text-xs font-medium">
            {readiness.canCommence ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 size={13} /> Ready to open admissions.
              </span>
            ) : (
              <span className="text-amber-700">
                {readiness.classCount === 0
                  ? "Add classes before this session can open."
                  : `${readiness.classesMissingFees.length} class(es) still need a fee structure.`}
              </span>
            )}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2 border-t border-surface-border pt-3">
          {isArchivedCard ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDialog({ kind: "restore", session })}
            >
              <RotateCcw size={13} className="mr-1" /> Restore
            </Button>
          ) : (
            <>
              {session.status === "commenced" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDialog({ kind: "close", session })}
                >
                  <Lock size={13} className="mr-1" /> Close Admissions
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!readiness.canCommence}
                  title={
                    readiness.canCommence
                      ? undefined
                      : "Add classes and fee structures first."
                  }
                  onClick={() => setDialog({ kind: "commence", session })}
                >
                  <PlayCircle size={13} className="mr-1" /> Open Admissions
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialog({ kind: "copy", session })}
              >
                <CopyPlus size={13} className="mr-1" /> Copy Previous Year
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditNotes(session.notes ?? "");
                  setDialog({ kind: "edit", session });
                }}
              >
                <Pencil size={13} className="mr-1" /> Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600"
                disabled={session.isActive}
                title={
                  session.isActive
                    ? "Close the live session before archiving."
                    : undefined
                }
                onClick={() => setDialog({ kind: "archive", session })}
              >
                <Archive size={13} className="mr-1" /> Archive
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Create session */}
      <Card className="border border-surface-border p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <CalendarPlus size={16} className="text-brand-royal" />
          <h2 className="text-base font-bold text-slate-900">
            Create Admission Session
          </h2>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          An admission session is the academic year you open applications for.
          Everything else — classes and fees — is configured inside it.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <div>
            <Label>Academic Year</Label>
            <Select
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            >
              {codeOptions.length === 0 && (
                <option value="">All years already exist</option>
              )}
              {codeOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Anything to remember about this intake…"
              className="min-h-[40px]"
              rows={1}
            />
          </div>
          <div className="flex items-end">
            <Button
              block
              disabled={creating || !newCode}
              onClick={() => void handleCreate()}
            >
              {creating ? "Creating…" : "Create Session"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Active sessions */}
      <Card className="border border-surface-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">
            Admission Sessions ({sessions.length})
          </h2>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Show archived
          </label>
        </div>

        {sessions.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="No admission sessions yet"
            description="Create your first session above to begin setting up admissions."
            className="py-8"
          />
        ) : (
          <div className="mt-4 space-y-3">
            {sessions.map((session) => renderSessionCard(session, false))}
          </div>
        )}

        {showArchived && (
          <div className="mt-5 border-t border-surface-border pt-4">
            <p className="text-sm font-semibold text-slate-700">
              Archived sessions
            </p>
            {loadingArchived ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </p>
            ) : archived.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No archived sessions.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {archived.map((session) => renderSessionCard(session, true))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Dialogs */}
      {dialog?.kind === "edit" && (
        <Modal
          title={`Edit ${dialog.session.sessionCode}`}
          description="The session code can't change. Update its notes below."
          onClose={closeDialog}
          footer={
            <>
              <Button variant="secondary" disabled={busy} onClick={closeDialog}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => void handleSaveNotes()}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </>
          }
        >
          <Label>Notes</Label>
          <Textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Notes about this admission session…"
          />
        </Modal>
      )}

      {dialog?.kind === "commence" && (
        <ConfirmDialog
          title="Open admissions?"
          confirmLabel="Open Admissions"
          busy={busy}
          message={
            <>
              Parents will be able to submit applications for{" "}
              <strong>{dialog.session.sessionCode}</strong> immediately. Any
              other live session will be deactivated.
            </>
          }
          onCancel={closeDialog}
          onConfirm={() =>
            void runAction(
              () => commenceAdmissionSession(token, dialog.session.id),
              "Admissions are now open to parents.",
            )
          }
        />
      )}

      {dialog?.kind === "close" && (
        <ConfirmDialog
          title="Close admissions?"
          confirmLabel="Close Admissions"
          tone="danger"
          busy={busy}
          message={
            <>
              The application form for{" "}
              <strong>{dialog.session.sessionCode}</strong> will stop accepting
              new submissions. Existing applications are unaffected.
            </>
          }
          onCancel={closeDialog}
          onConfirm={() =>
            void runAction(
              () => closeAdmissionSession(token, dialog.session.id),
              "Admission session closed.",
            )
          }
        />
      )}

      {dialog?.kind === "copy" && (
        <ConfirmDialog
          title="Copy setup from previous year?"
          confirmLabel="Copy Setup"
          busy={busy}
          message={
            <>
              Classes and fee structures from the most recent earlier session
              will be copied into{" "}
              <strong>{dialog.session.sessionCode}</strong>. Existing records
              are kept — nothing is overwritten.
            </>
          }
          onCancel={closeDialog}
          onConfirm={() =>
            void runAction(
              () =>
                initializeAdmissionSession(token, dialog.session.id, {
                  copyClasses: true,
                  copyFeeStructures: true,
                }),
              "Setup copied from the previous year.",
            )
          }
        />
      )}

      {dialog?.kind === "archive" && (
        <ConfirmDialog
          title="Archive this session?"
          confirmLabel="Archive Session"
          tone="danger"
          busy={busy}
          message={
            <>
              <strong>{dialog.session.sessionCode}</strong> will be hidden from
              Setup. Its classes, fees and applications are preserved and it can
              be restored later.
            </>
          }
          onCancel={closeDialog}
          onConfirm={() =>
            void runAction(
              () => archiveAdmissionSession(token, dialog.session.id),
              "Admission session archived.",
            )
          }
        />
      )}

      {dialog?.kind === "restore" && (
        <ConfirmDialog
          title="Restore this session?"
          confirmLabel="Restore Session"
          busy={busy}
          message={
            <>
              <strong>{dialog.session.sessionCode}</strong> will reappear in
              Setup with its previous status.
            </>
          }
          onCancel={closeDialog}
          onConfirm={() =>
            void runAction(
              () => restoreAdmissionSession(token, dialog.session.id),
              "Admission session restored.",
            )
          }
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
