"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function NewApplicationButton() {
  const router = useRouter();

  const handleClick = () => {
    // Append a unique query param so the form remounts and resets even if
    // the user is already on /admissions/apply.
    const fresh = Date.now().toString();
    router.push(`/admissions/apply?fresh=${fresh}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary shadow-xs transition-all duration-150 hover:border-brand-royal hover:bg-brand-sky-light hover:text-brand-royal focus:outline-none focus:ring-2 focus:ring-brand-royal/40"
      aria-label="Start a new admission application"
    >
      <Plus size={12} aria-hidden="true" />
      New Application
    </button>
  );
}
