import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parent Portal · Resillix",
};

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-surface-bg">{children}</div>;
}
