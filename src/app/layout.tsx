import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ThemeProvider } from "@/lib/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AD LMS - የመስመር ላይ ትምህርት መድረክ",
  description: "AD LMS - በኢትዮጵያ ውስጥ ለሁሉም ሰው ተደራሽ የሆነ የመስመር ላይ ትምህርት መድረክ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="am" className="h-full antialiased" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col pb-20 md:pb-0`}
      >
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="bg-gradient-to-r from-secondary to-accent text-white py-6 sm:py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs sm:text-sm text-white/90">
              <p>© 2026 AD LMS. ሁሉስ መብት የተጠበቀ ነው።</p>
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
