import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DashboardProvider } from "@/frontend/context/DashboardContext";
import { AutomaticDataSourceProvider } from "@/frontend/context/AutomaticDataSourceContext";
import { ViewModeProvider } from "@/frontend/context/ViewModeContext";
import { ThemeProvider } from "@/frontend/context/ThemeContext";
import { CrossfilterProvider } from "@/frontend/context/CrossfilterContext";
import ErrorBoundary from "@/frontend/components/ErrorBoundary";
import { ToastProvider } from "@/frontend/components/ToastManager";
import PerformanceMonitor from "@/frontend/components/PerformanceMonitor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Improve font loading performance
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Improve font loading performance
  preload: false, // Only preload the main font
});

export const metadata: Metadata = {
  title: "Finance Factors Dashboard",
  description: "See how the economy and costs that affect you change over time. House prices, income, inflation, and more in plain language.",
  keywords: "finance, dashboard, house prices, income, inflation, cost of living, trends, economy, personal finance",
  authors: [{ name: "Finance Factors Team" }],
  robots: "index, follow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Set theme before first paint to avoid flash and align with ThemeProvider */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var k='finance-dashboard-theme';var s=typeof document!=='undefined'&&document.documentElement;if(!s)return;try{var v=localStorage.getItem(k);var theme=(v==='dark'||v==='light')?v:(typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');s.setAttribute('data-theme',theme);s.classList.add(theme);s.classList.remove(theme==='dark'?'light':'dark');}catch(e){}})();`,
          }}
        />
        {/* Preconnect to external domains for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Resource hints for better loading */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />

        {/* Performance hints */}
        <meta httpEquiv="x-dns-prefetch-control" content="on" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ErrorBoundary>
          <ToastProvider>
            <ThemeProvider>
              <ViewModeProvider>
                <AutomaticDataSourceProvider>
                  <CrossfilterProvider>
                    <DashboardProvider>
                      {children}
                      <PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} />
                    </DashboardProvider>
                  </CrossfilterProvider>
                </AutomaticDataSourceProvider>
              </ViewModeProvider>
            </ThemeProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
