import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DashboardProvider } from "./context/DashboardContext";
import { AutomaticDataSourceProvider } from "./context/AutomaticDataSourceContext";
import { ViewModeProvider } from "./context/ViewModeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastManager";

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
  title: "Finance Factor Dashboard",
  description: "Interactive dashboard showing finance factors including house prices and household income trends over time",
  keywords: "finance, dashboard, house prices, income, trends, analytics",
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
            <ViewModeProvider>
              <AutomaticDataSourceProvider>
                <DashboardProvider>
                  {children}
                </DashboardProvider>
              </AutomaticDataSourceProvider>
            </ViewModeProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
