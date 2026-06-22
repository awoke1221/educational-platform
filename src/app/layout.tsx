import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ThemeProvider } from "@/lib/ThemeProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adonay TikTok Academy",
  description:
    "Adonay TikTok Academy - በኢትዮጵያ ውስጥ ለሁሉም ሰው ተደራሽ የሆነ የመስመር ላይ ትምህርት መድረክ",
  icons: {
    icon: "/logo-adlms.jpg",
    apple: "/logo-adlms.jpg",
    shortcut: "/logo-adlms.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="am" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Preconnect to Bunny CDN for faster video loading */}
        <link rel="preconnect" href="https://AdonayTikTokAcadamy.b-cdn.net" />
        <link rel="dns-prefetch" href="https://AdonayTikTokAcadamy.b-cdn.net" />
        <link rel="preconnect" href="https://ny.storage.bunnycdn.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col pb-20 md:pb-0`}
      >
        <ThemeProvider>
          <ServiceWorkerRegister />
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="bg-gradient-to-r from-[#0a0a0a] via-[#111111] to-[#1a1a1a] border-t border-[#c9952a]/20 py-8 sm:py-10 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-xs sm:text-sm bg-gradient-to-r from-[#c9952a] to-[#d4a843] bg-clip-text text-transparent font-semibold tracking-wide">
                © 2026 Adonay TikTok Academy
              </p>
            </div>
          </footer>
          <MobileBottomNav />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: "12px",
                padding: "14px 18px",
                fontSize: "14px",
                fontWeight: 500,
              },
              success: {
                iconTheme: { primary: "#c9952a", secondary: "#fff" },
                style: { borderLeft: "4px solid #c9952a" },
              },
              error: {
                style: { borderLeft: "4px solid #ef4444" },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
