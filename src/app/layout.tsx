import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ThemeCustomizer } from "@/components/ui/ThemeCustomizer";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AIマネタイズ総研",
  description: "Accel - AIツールを搭載した次世代のマネタイズ支援システム",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-72x72.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-body text-foreground antialiased",
          inter.variable,
          outfit.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <div className="fixed bottom-4 left-4 z-50">
            <ThemeCustomizer />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}