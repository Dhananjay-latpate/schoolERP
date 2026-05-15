"use client";

import { useState } from "react";
import { Save, X } from "lucide-react";

import { ResumeDraftFormCard } from "./ResumeDraftFormCard";

export function ResumeDraftTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-white px-4 py-3 text-sm">
        <div className="flex items-start gap-3">
          <Save className="mt-0.5 h-4 w-4 shrink-0 text-brand-royal" />
          <div>
            <p className="font-semibold text-text-primary">
              Already started an application?
            </p>
            <p className="text-xs text-text-secondary">
              Resume your saved draft with your application ID and mobile
              number.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 text-sm font-semibold text-brand-royal hover:underline"
        >
          Resume draft
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resume-modal-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
              <h2
                id="resume-modal-title"
                className="font-semibold text-text-primary"
              >
                Resume your saved draft
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <ResumeDraftFormCard onCancel={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
