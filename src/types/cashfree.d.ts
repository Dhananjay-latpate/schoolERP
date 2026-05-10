/* eslint-disable @typescript-eslint/no-explicit-any */
// Minimal type definition for the Cashfree v3 web checkout SDK
// (https://sdk.cashfree.com/js/v3/cashfree.js).

interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  redirectTarget?: "_self" | "_blank" | "_modal";
  returnUrl?: string;
}

interface CashfreeCheckoutResult {
  error?: { code?: string; message?: string };
  redirect?: boolean;
  paymentDetails?: {
    paymentMessage?: string;
    paymentStatus?: string;
    [key: string]: any;
  };
}

interface CashfreeInstance {
  checkout(options: CashfreeCheckoutOptions): Promise<CashfreeCheckoutResult>;
}

interface CashfreeFactoryOptions {
  mode: "sandbox" | "production";
}

declare global {
  interface Window {
    Cashfree?: (options: CashfreeFactoryOptions) => CashfreeInstance;
  }
}

export {};
