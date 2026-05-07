import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRINCIPAL_TOKEN_COOKIE = "principal_token";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/principal")) {
    return NextResponse.next();
  }

  if (pathname === "/principal/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(PRINCIPAL_TOKEN_COOKIE)?.value;
  if (token) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/principal/login";
  loginUrl.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/principal/:path*"],
};
