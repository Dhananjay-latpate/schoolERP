import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resillix | School ERP",
  description:
    "Resillix admission platform for schools - premium, fast, and parent-friendly admission experience.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} min-h-screen bg-surface-bg text-text-primary`}
      >
        {children}
      </body>
    </html>
  );
}
