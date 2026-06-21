"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/ThemeProvider";

interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export default function Navbar() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
    <nav className="bg-gradient-to-r from-surface-warm to-accent-light dark:from-gray-900 dark:to-gray-800 border-b-2 border-secondary sticky top-0 z-50 shadow-sm backdrop-blur-md bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity group"
          >
            <span className="relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-full bg-logo-bg shadow-sm ring-1 ring-border-light group-hover:ring-secondary transition-all duration-300">
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
              className="text-xs sm:text-sm text-primary hover:text-secondary dark:text-gray-300 dark:hover:text-secondary transition-colors font-medium relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-secondary after:transition-all after:duration-300 hover:after:w-full"
            >
              ኮርሶች
            </Link>
            <Link
              href="/about"
              className="text-xs sm:text-sm text-primary hover:text-secondary dark:text-gray-300 dark:hover:text-secondary transition-colors font-medium relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-secondary after:transition-all after:duration-300 hover:after:w-full"
            >
              ስለ እኛ
            </Link>
            <Link
              href="/testimonials"
              className="text-xs sm:text-sm text-primary hover:text-secondary dark:text-gray-300 dark:hover:text-secondary transition-colors font-medium relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-secondary after:transition-all after:duration-300 hover:after:w-full"
            >
              ምስክርነቶች
            </Link>

            {/* ── Theme Toggle ──────────────────────────── */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
              aria-label="Toggle dark mode"
            >
              {theme === "light" ? (
                <svg
                  className="w-5 h-5 text-primary dark:text-gray-300 group-hover:text-secondary transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-secondary group-hover:text-secondary transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              )}
            </button>

            {user ? (
              /* ── Logged In: User Avatar ─────────────── */
              <div className="hidden md:block relative" ref={dropdownRef}>
                <motion.button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-gray-700 shadow-sm">
                    {getInitials(user.fullName)}
                  </div>
                  {/* Name (hidden on mobile) */}
                  <span className="hidden sm:block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                    {user.fullName}
                  </span>
                  {/* Chevron */}
                  <motion.svg
                    animate={{ rotate: dropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-4 h-4 text-gray-400"
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
                  </motion.svg>
                </motion.button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 z-50"
                    >
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {user.fullName}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {user.email}
                        </p>
                        <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
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
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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

                      {user.role === "instructor" && (
                        <Link
                          href="/instructor"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                          <span>👨‍🏫 አስተማሪ</span>
                          <span className="ml-auto text-[10px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded">
                            Dashboard
                          </span>
                        </Link>
                      )}

                      {user.role === "admin" && (
                        <>
                          <Link
                            href="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                            <span>አስተዳደር</span>
                            <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              Dashboard
                            </span>
                          </Link>
                          <div className="ml-7 pl-3 border-l-2 border-gray-100 dark:border-gray-700 space-y-0.5">
                            <Link
                              href="/admin/courses"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              📚 Courses
                            </Link>
                            <Link
                              href="/admin/courses/new"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              ➕ New Course
                            </Link>
                            <Link
                              href="/admin/users"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              👥 Users
                            </Link>
                            <Link
                              href="/admin/registrations"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              📝 Registrations
                            </Link>
                          </div>
                        </>
                      )}

                      <div className="border-t border-gray-50 dark:border-gray-700 my-1" />

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* ── Logged Out: Login / Register ──────── */
              <div className="hidden md:flex items-center gap-3 sm:gap-6">
                <Link
                  href="/auth/login"
                  className="text-xs sm:text-sm text-primary hover:text-secondary dark:text-gray-300 dark:hover:text-secondary transition-colors font-medium"
                >
                  ግባ
                </Link>
                <Link
                  href="/auth/register"
                  className="text-xs sm:text-sm bg-gradient-to-r from-secondary to-accent text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:shadow-lg hover:brightness-110 transition-all font-medium whitespace-nowrap animate-pulse-glow"
                >
                  ተመዝገብ
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
