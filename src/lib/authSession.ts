// Tiny session helper for the access token on the client.
// - Access token lives in memory + sessionStorage (so a hard reload during a
//   short session keeps the user signed in until a tab close).
// - The long-lived refresh token is in an HTTP-only cookie and is NEVER
//   readable from JS. That is the whole point.
// - We deliberately do NOT use localStorage so that XSS can't trivially
//   exfiltrate a long-lived token across browser sessions.

import type { AuthUser } from "./authApi";

const ACCESS_KEY = "auth.access";
const USER_KEY = "auth.user";

let accessTokenInMemory: string | null = null;

export function setAuthSession(accessToken: string, user: AuthUser) {
  accessTokenInMemory = accessToken;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(ACCESS_KEY, accessToken);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // sessionStorage can be unavailable (private mode, quota); we still
      // hold the token in memory so the current tab keeps working.
    }
  }
}

export function clearAuthSession() {
  accessTokenInMemory = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(ACCESS_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
  }
}

export function getAccessToken(): string | null {
  if (accessTokenInMemory) return accessTokenInMemory;
  if (typeof window === "undefined") return null;
  try {
    accessTokenInMemory = sessionStorage.getItem(ACCESS_KEY);
    return accessTokenInMemory;
  } catch {
    return null;
  }
}

export function getCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

// Returns the route a user should land on after successful login,
// based on their role.
export function defaultLandingForRole(role: AuthUser["role"]): string {
  switch (role) {
    case "PRINCIPAL":
    case "ADMIN":
      return "/principal";
    case "TEACHER":
      return "/principal/admissions";
    case "PARENT":
    default:
      return "/admissions/apply";
  }
}
