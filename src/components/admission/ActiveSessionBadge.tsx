"use client";

import { useEffect, useState } from "react";
import { getActiveAdmissionSessionPublic } from "@/lib/api";

export function ActiveSessionBadge() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    getActiveAdmissionSessionPublic()
      .then((s) => setCode(s?.sessionCode ?? null))
      .catch(() => setCode(null));
  }, []);

  if (!code) return null;
  return (
    <span className="hidden rounded-full bg-brand-emerald-light px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider text-brand-emerald sm:inline-flex">
      {code}
    </span>
  );
}
