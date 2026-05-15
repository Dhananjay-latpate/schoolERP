import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fees & Accounts · Principal",
};

export default function FeesLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-surface-bg">{children}</div>;
}
