import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prelegal – Mutual NDA Creator",
  description: "Draft a mutual non-disclosure agreement in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col bg-white text-gray-900">
        <header className="flex shrink-0 items-center border-b border-gray-200 px-6 py-3">
          <span className="text-lg font-bold tracking-tight text-blue-600">Prelegal</span>
          <span className="ml-3 text-sm text-gray-500">Mutual NDA Creator</span>
        </header>
        {children}
      </body>
    </html>
  );
}
