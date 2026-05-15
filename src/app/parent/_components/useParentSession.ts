"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearParentSession, getParentToken } from "@/lib/parentSession";

export function useParentSession() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const existing = getParentToken();
    if (!existing) {
      router.replace("/parent/login");
      return;
    }
    setToken(existing);
    setIsChecking(false);
  }, [router]);

  const signOut = useCallback(() => {
    clearParentSession();
    router.replace("/parent/login");
  }, [router]);

  return { token, isChecking, signOut };
}
