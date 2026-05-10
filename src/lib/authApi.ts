// Auth API client. All requests include credentials so the refresh-token
// HTTP-only cookie flows on /api/auth/* routes. The short-lived access token
// is returned in JSON and held in memory only.

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PRINCIPAL" | "TEACHER" | "PARENT";
  isActive: boolean;
  lastLogin: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export class AuthApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    throw new AuthApiError("Network error. Check your connection.", 0);
  }

  let body: ApiResponse<T> | null = null;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    // Non-JSON response (e.g. proxy timeout HTML).
    body = null;
  }

  if (!response.ok || !body || body.success === false) {
    const message =
      body?.message || `Request failed (${response.status})`;
    throw new AuthApiError(message, response.status);
  }

  return (body.data ?? ({} as T));
}

export async function login(email: string, password: string) {
  return authRequest<{ user: AuthUser; accessToken: string }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
}

export async function logout(accessToken: string) {
  return authRequest<{}>("/api/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function refresh() {
  return authRequest<{ user: AuthUser; accessToken: string }>(
    "/api/auth/refresh-token",
    { method: "POST" },
  );
}

export async function getProfile(accessToken: string) {
  return authRequest<{ user: AuthUser }>("/api/auth/profile", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function forgotPassword(email: string) {
  return authRequest<{}>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string) {
  return authRequest<{}>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}
