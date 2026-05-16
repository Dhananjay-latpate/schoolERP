"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PrincipalApiError,
  getFeesDashboardSummary,
  type FeesDashboardSummary,
} from "@/lib/principalApi";
import { clearPrincipalSession, getPrincipalToken } from "@/lib/principalSession";

export function useFeesSession() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [summary, setSummary] = useState<FeesDashboardSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    const existing = getPrincipalToken();
    if (!existing) {
      setIsChecking(false);
      router.replace("/principal/login?next=%2Fprincipal%2Ffees");
      return;
    }
    setToken(existing);
    setIsChecking(false);
  }, [router]);

  const refreshSummary = useCallback(async () => {
    if (!token) return;
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const data = await getFeesDashboardSummary(token);
      setSummary(data);
    } catch (err) {
      if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) {
        clearPrincipalSession();
        router.replace("/principal/login?next=%2Fprincipal%2Ffees");
        return;
      }
      setSummaryError(
        err instanceof PrincipalApiError ? err.message : "Could not load fee summary",
      );
    } finally {
      setIsLoadingSummary(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (token) void refreshSummary();
  }, [token, refreshSummary]);

  const signOut = useCallback(() => {
    clearPrincipalSession();
    router.replace("/principal/login");
  }, [router]);

  return {
    token,
    isChecking,
    summary,
    isLoadingSummary,
    summaryError,
    refreshSummary,
    signOut,
  };
}
