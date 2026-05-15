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

  useEffect(() => {
    const existing = getPrincipalToken();
    if (!existing) {
      router.replace("/principal/login?next=%2Fprincipal%2Ffees");
      return;
    }
    setToken(existing);
    setIsChecking(false);
  }, [router]);

  const refreshSummary = useCallback(async () => {
    if (!token) return;
    setIsLoadingSummary(true);
    try {
      const data = await getFeesDashboardSummary(token);
      setSummary(data);
    } catch (err) {
      if (err instanceof PrincipalApiError && (err.status === 401 || err.status === 403)) {
        clearPrincipalSession();
        router.replace("/principal/login?next=%2Fprincipal%2Ffees");
      }
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

  return { token, isChecking, summary, isLoadingSummary, refreshSummary, signOut };
}
