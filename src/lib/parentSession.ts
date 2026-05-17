const PARENT_TOKEN_COOKIE = "parent_token";
const PARENT_TOKEN_STORAGE_KEY = "parent_token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getParentToken(): string {
  if (typeof window === "undefined") return "";
  const fromStorage = window.localStorage.getItem(PARENT_TOKEN_STORAGE_KEY);
  if (fromStorage?.trim()) return fromStorage.trim();
  if (typeof document === "undefined") return "";
  const cookie = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${PARENT_TOKEN_COOKIE}=`));
  if (!cookie) return "";
  const [, value = ""] = cookie.split("=");
  return decodeCookieValue(value).trim();
}

export function setParentSession(token: string): void {
  if (typeof window === "undefined") return;
  const trimmed = token.trim();
  if (!trimmed) return;
  window.localStorage.setItem(PARENT_TOKEN_STORAGE_KEY, trimmed);
  document.cookie = `${PARENT_TOKEN_COOKIE}=${encodeURIComponent(trimmed)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearParentSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PARENT_TOKEN_STORAGE_KEY);
  document.cookie = `${PARENT_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
