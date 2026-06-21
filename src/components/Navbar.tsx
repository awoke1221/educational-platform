"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Client-side: restore session from localStorage after hydration
  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setInitialized(true);
  }, []);

  // Keep nav in sync when user logs in/out (cross-tab)
  useEffect(() => {
    if (!initialized) return;
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const stored = localStorage.getItem("user");
      if (token && stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, [initialized]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    setDropdownOpen(false);
    router.push("/");
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="bg-gradient-to-r from-surface-warm to-accent-light border-b-2 border-secondary sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
          >
            <span className="relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-full bg-logo-bg shadow-sm ring-1 ring-border-light">
              <Image
                src="/logo-adlms.jpg"
                alt="AD LMS"
                fill
                sizes="48px"
                className="object-cover"
              />
            </span>
            <span className="text-sm sm:text-base font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent hidden sm:block">
              AD LMS
            </span>
          </Link>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-3 sm:gap-6">
            <Link
              href="/courses"
              className="text-xs sm:text-sm text-primary hover:text-secondary transition-colors font-medium"
            >
              ኮርሶች
            </Link>
            <Link
              href="/testimonials"
              className="text-xs sm:text-sm text-primary hover:text-secondary transition-colors font-medium"
            >
              ምስክርነቶች
            </Link>

            {user ? (
              /* ── Logged In: User Avatar ─────────────── */
              <div className="hidden md:block relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm">
                    {getInitials(user.fullName)}
                  </div>
                  {/* Name (hidden on mobile) */}
                  <span className="hidden sm:block text-xs sm:text-sm font-medium text-gray-700 max-w-[100px] truncate">
                    {user.fullName}
                  </span>
                  {/* Chevron */}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-fade-in">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {user.email}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {user.role === "admin"
                          ? "አስተዳዳሪ"
                          : user.role === "instructor"
                            ? "አስተማሪ"
                            : "ተማሪ"}
                      </span>
                    </div>

                    {/* Menu items */}
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      የእኔ ትምህርት
                    </Link>

                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        አስተዳደር
                      </Link>
                    )}

                    <div className="border-t border-gray-50 my-1" />

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      ውጣ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Logged Out: Login / Register ──────── */
              <div className="hidden md:flex items-center gap-3 sm:gap-6">
                <Link
                  href="/auth/login"
                  className="text-xs sm:text-sm text-primary hover:text-secondary transition-colors font-medium"
                >
                  ግባ
                </Link>
                <Link
                  href="/auth/register"
                  className="text-xs sm:text-sm bg-gradient-to-r from-secondary to-accent text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:shadow-lg transition-all font-medium whitespace-nowrap"
                >
                  ተመዝገብ
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS animation */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
      `}</style>
    </nav>
  );
}
