const PRINCIPAL_TOKEN_COOKIE = "principal_token";
const PRINCIPAL_TOKEN_STORAGE_KEY = "principal_token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function encodeCookieValue(value: string): string {
  return encodeURIComponent(value);
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getPrincipalTokenFromCookie(): string {
  if (typeof document === "undefined") return "";
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PRINCIPAL_TOKEN_COOKIE}=`));
  if (!cookie) return "";
  const [, value = ""] = cookie.split("=");
  return decodeCookieValue(value);
}

export function getPrincipalToken(): string {
  if (typeof window === "undefined") return "";
  const fromStorage = window.localStorage.getItem(PRINCIPAL_TOKEN_STORAGE_KEY);
  if (fromStorage?.trim()) return fromStorage.trim();
  return getPrincipalTokenFromCookie().trim();
}

export function setPrincipalSession(token: string): void {
  if (typeof window === "undefined") return;
  const trimmed = token.trim();
  if (!trimmed) return;

  window.localStorage.setItem(PRINCIPAL_TOKEN_STORAGE_KEY, trimmed);
  document.cookie = `${PRINCIPAL_TOKEN_COOKIE}=${encodeCookieValue(trimmed)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearPrincipalSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PRINCIPAL_TOKEN_STORAGE_KEY);
  document.cookie = `${PRINCIPAL_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export const principalSession = {
  cookieName: PRINCIPAL_TOKEN_COOKIE,
};
