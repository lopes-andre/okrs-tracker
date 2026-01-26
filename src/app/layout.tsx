import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query-client";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { WebVitalsReporter } from "@/components/performance";
import { AppProviders } from "@/components/providers/app-providers";

// Load Plus Jakarta Sans for headings
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Load Inter for body text
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OKRs Tracker | Personal Goals & Key Results",
  description:
    "A premium personal OKR tracking app. Manage annual objectives, quarterly key results, and track your progress with beautiful analytics.",
  keywords: ["OKR", "objectives", "key results", "goal tracking", "productivity"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OKRs Tracker",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${inter.variable}`}>
      <body className="min-h-screen">
        {/* Skip to main content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-md focus:outline-none"
        >
          Skip to main content
        </a>
        <QueryProvider>
          <AppProviders>
            <TooltipProvider delayDuration={200}>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </TooltipProvider>
            <Toaster />
            <WebVitalsReporter />
          </AppProviders>
        </QueryProvider>
      </body>
    </html>
  );
}
