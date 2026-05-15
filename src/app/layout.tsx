import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resillix — School ERP",
  description:
    "Resillix: a calm, fast, parent-friendly school ERP — admissions, fees, attendance, and the principal command center in one workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} min-h-screen bg-surface-bg text-text-primary antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
