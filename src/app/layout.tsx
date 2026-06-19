import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";

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
    <html
      lang="am"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-20 md:pb-0">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="bg-gradient-to-r from-[#00BCD4] to-[#FF1744] text-white py-6 sm:py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs sm:text-sm text-white/90">
            <p>© 2026 AD LMS. ሁሉስ መብት የተጠበቀ ነው።</p>
          </div>
        </footer>
        <MobileBottomNav />
      </body>
    </html>
  );
}
