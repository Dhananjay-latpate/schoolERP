import path from "path";
import type { NextConfig } from "next";

// Content-Security-Policy applied to public-facing admission pages.
// We allow Razorpay and Cashfree gateway origins explicitly because the
// parent payment flow loads their checkout SDK + posts to their APIs.
// `'unsafe-inline'` and `'unsafe-eval'` are kept on script-src because
// Next.js Turbopack dev tooling requires them; for the production
// deployment, swap these for nonces.

// Extract the API origin from NEXT_PUBLIC_API_BASE_URL so the CSP doesn't
// block legitimate client → backend calls when the backend lives on a
// different origin (dev: http://localhost:3001). Falls back to a permissive
// localhost rule for local dev where the env var isn't always set.
function apiOriginsForCsp(): string[] {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!base) return ["http://localhost:3001", "ws://localhost:*"]; // dev default
  try {
    const u = new URL(base);
    return [`${u.protocol}//${u.host}`];
  } catch {
    return ["http://localhost:3001"];
  }
}

const API_ORIGINS = apiOriginsForCsp().join(" ");

const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Razorpay + Cashfree gateway origins for the checkout iframes / SDKs
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://sdk.cashfree.com https://*.cashfree.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  // ws:// is needed for Next.js dev HMR (same-origin websocket). In prod
  // builds the dev WS isn't there but the directive is harmless.
  `connect-src 'self' ws://localhost:* ${API_ORIGINS} https://api.razorpay.com https://lumberjack.razorpay.com https://*.cashfree.com https://sdk.cashfree.com`,
  // Cashfree v3 sandbox redirects the checkout iframe through multiple
  // subdomains (payments-test, sdk, atoms, etc.) and occasionally serves
  // 3DS pages from third-party bank origins. We allow https: at the
  // payment iframe level — the SDK script itself is still locked down via
  // script-src above, which is the actual code-execution boundary.
  "frame-src 'self' https: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Self allows the same-origin Cashfree/Razorpay popup callbacks to
  // window-message back into the admission page. Third-party framing
  // remains blocked.
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Only needed locally where client/ lives inside server/ monorepo
  ...(process.env.VERCEL !== "1" && {
    outputFileTracingRoot: path.join(__dirname, ".."),
  }),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Security headers — applied to admissions pages where the public form
  // and payment gateway run. The CSP locks scripts to our origin plus the
  // two payment gateways; other defense headers harden the browser
  // surface against clickjacking, MIME sniffing, and referer leakage.
  async headers() {
    // CSP is shipped in report-only mode by default while we finalize
    // the gateway-modal compatibility. Browsers honor the directives for
    // reporting/logging but do NOT block — this gets us all the
    // visibility of a CSP without breaking the Cashfree v3 sandbox
    // checkout, which dynamically navigates a child iframe via the SDK.
    // Flip NEXT_PUBLIC_CSP_ENFORCE=1 to switch on enforcement once the
    // gateway flow is verified end-to-end on the deploy target.
    // NEXT_PUBLIC_DISABLE_CSP=1 still removes the header entirely.
    const cspHeader =
      process.env.NEXT_PUBLIC_DISABLE_CSP === "1"
        ? []
        : [
            {
              key:
                process.env.NEXT_PUBLIC_CSP_ENFORCE === "1"
                  ? "Content-Security-Policy"
                  : "Content-Security-Policy-Report-Only",
              value: CSP_DIRECTIVES,
            },
          ];
    return [
      {
        source: "/admissions/:path*",
        headers: [
          ...cspHeader,
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Allow the Cashfree / Razorpay 3DS popups to interact with the
          // payment page via `window.opener` round-trips on the same
          // origin. SAMEORIGIN is the right setting for a parent page
          // hosting a gateway popup.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
