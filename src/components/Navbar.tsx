"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/ThemeProvider";
import { HamburgerToggle, ThemeSwitch } from "@/components/toggle";

interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export default function Navbar() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  // theme/toggleTheme used by ThemeSwitch child component
  const [user, setUser] = useState<UserInfo | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLDivElement>(null);

  // Scroll listener: transparent at top → solid on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  // Keep nav in sync when user logs in/out, including same-tab auth changes.
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
    window.addEventListener("auth-changed", checkAuth);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-changed", checkAuth);
    };
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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Don't close if clicking on hamburger button or menu
      if (
        hamburgerRef.current?.contains(target) ||
        mobileMenuRef.current?.contains(target)
      ) {
        return;
      }
      // Close if clicking outside
      setMobileMenuOpen(false);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("tokenExpiresAt");
    localStorage.removeItem("user");
    setUser(null);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push("/");
  };

  // Get initials for avatar
  const getInitials = (name: string | undefined | null) => {
    if (!name) return "?";
    return (
      name
        .split(" ")
        .map((n) => n.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?"
    );
  };

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0a0a0a]/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-[#dc2626]/20 shadow-lg shadow-black/30"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity group"
          >
            <span className="relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-full bg-logo-bg shadow-md ring-2 ring-secondary/60 group-hover:ring-secondary group-hover:shadow-lg group-hover:shadow-secondary/20 transition-all duration-300">
              <Image
                src="/logo-adlms.jpg"
                alt="AD LMS"
                fill
                sizes="48px"
                className="object-cover"
              />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-sm md:text-base font-extrabold bg-gradient-to-r from-[#dc2626] via-[#ef4444] to-[#ff3333] bg-clip-text text-transparent tracking-tight leading-tight">
                Adonay TikTok Academy
              </span>
              <span className="text-[8px] sm:text-[10px] text-[#ef4444]/60 tracking-[0.15em] uppercase font-medium hidden sm:block">
                LEARN. CREATE. GROW. GO VIRAL.
              </span>
            </div>
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* ── Desktop Nav Links (md+) ──────────────── */}
            <div className="hidden md:flex items-center gap-3 sm:gap-6">
              <Link
                href="/courses"
                className="text-xs sm:text-sm text-white/80 hover:text-[#ef4444] transition-colors font-medium relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-[#ef4444] after:transition-all after:duration-300 hover:after:w-full"
              >
                Courses
              </Link>
              <Link
                href="/about"
                className="text-xs sm:text-sm text-white/80 hover:text-[#ef4444] transition-colors font-medium relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-[#ef4444] after:transition-all after:duration-300 hover:after:w-full"
              >
                About
              </Link>
              <Link
                href="/testimonials"
                className="text-xs sm:text-sm text-white/80 hover:text-[#ef4444] transition-colors font-medium relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-[#ef4444] after:transition-all after:duration-300 hover:after:w-full"
              >
                Testimonials
              </Link>
              <Link
                href="/faq"
                className="text-xs sm:text-sm text-white/80 hover:text-[#ef4444] transition-colors font-medium relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-[#ef4444] after:transition-all after:duration-300 hover:after:w-full"
              >
                FAQ
              </Link>
              <Link
                href="/in-person-training"
                className="text-xs sm:text-sm text-[#f5c96b] hover:text-[#ef4444] transition-colors font-semibold relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-[#ef4444] after:transition-all after:duration-300 hover:after:w-full"
              >
                In-Person Training
              </Link>

              {/* ── Theme Toggle (Desktop) ─────────────── */}
              <ThemeSwitch />

              {user ? (
                /* ── Logged In: User Avatar (Desktop) ── */
                <div className="relative" ref={dropdownRef}>
                  <motion.button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-gray-700 shadow-sm">
                      {getInitials(user.fullName)}
                    </div>
                    <span className="hidden sm:block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                      {user.fullName}
                    </span>
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

                  {/* Desktop Dropdown Menu */}
                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 z-50"
                      >
                        <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {user.fullName}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {user.email}
                          </p>
                          <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            {user.role === "admin"
                              ? "Admin"
                              : user.role === "instructor"
                                ? "Instructor"
                                : "Student"}
                          </span>
                        </div>

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
                          My Learning
                        </Link>

                        <Link
                          href="/videos"
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
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          Video Library
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
                            <span>👨‍🏫 Instructor</span>
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
                              <span>Admin</span>
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
                              <Link
                                href="/admin/bunny-sync"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                🐰 Bunny Sync
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
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* ── Logged Out: Get Started (Desktop) ── */
                <div className="hidden md:flex items-center gap-3 sm:gap-6">
                  <Link
                    href="/auth/register"
                    className="text-xs sm:text-sm bg-gradient-to-r from-[#7f1d1d] to-[#dc2626] text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg hover:shadow-lg hover:shadow-[#dc2626]/30 hover:brightness-110 transition-all font-semibold whitespace-nowrap"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* ── Mobile Hamburger Button ─────────────── */}
            <div className="md:hidden" ref={hamburgerRef}>
              <HamburgerToggle
                isOpen={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Hamburger Menu Panel ─────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 top-14 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-down panel */}
            <motion.div
              ref={mobileMenuRef}
              initial={{ opacity: 0, y: -20, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -20, scaleY: 0.95 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden absolute left-0 right-0 top-full bg-[#0a0a0a]/98 backdrop-blur-xl border-b border-[#dc2626]/20 shadow-2xl shadow-black/40 z-50 overflow-hidden"
            >
              <div className="px-4 py-5 space-y-1">
                {/* ── Theme Toggle ─────────────────────── */}
                <ThemeSwitch labeled />

                <div className="h-px bg-[#dc2626]/10 my-2" />

                {user ? (
                  /* ── Mobile: Logged In Menu ──────────── */
                  <>
                    {/* User info card */}
                    <div className="px-3 py-3 rounded-xl bg-gradient-to-br from-secondary/5 to-accent/5 dark:from-gray-800 dark:to-gray-800 border border-gray-100 dark:border-gray-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white text-sm font-bold ring-2 ring-white dark:ring-gray-700 shadow-sm">
                          {getInitials(user.fullName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {user.fullName}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {user.email}
                          </p>
                          <span className="inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            {user.role === "admin"
                              ? "Admin"
                              : user.role === "instructor"
                                ? "Instructor"
                                : "Student"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* FAQ */}
                    <MobileMenuItem
                      href="/faq"
                      icon={
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                          />
                        </svg>
                      }
                      label="FAQ"
                      onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* In-Person Training */}
                    <MobileMenuItem
                      href="/in-person-training"
                      icon={
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
                          />
                        </svg>
                      }
                      label="In-Person Training"
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    {/* My Learning */}
                    <MobileMenuItem
                      href="/dashboard"
                      icon={
                        <svg
                          className="w-5 h-5"
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
                      }
                      label="My Learning"
                      onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Video Library */}
                    <MobileMenuItem
                      href="/videos"
                      icon={
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      }
                      label="🎬 Video Library"
                      onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Instructor Dashboard */}
                    {user.role === "instructor" && (
                      <MobileMenuItem
                        href="/instructor"
                        icon={
                          <svg
                            className="w-5 h-5"
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
                        }
                        label="👨‍🏫 Instructor Dashboard"
                        badge="Dashboard"
                        badgeColor="secondary"
                        onClick={() => setMobileMenuOpen(false)}
                      />
                    )}

                    {/* Admin Dashboard */}
                    {user.role === "admin" && (
                      <>
                        <MobileMenuItem
                          href="/admin"
                          icon={
                            <svg
                              className="w-5 h-5"
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
                          }
                          label="Admin Dashboard"
                          badge="Admin"
                          badgeColor="primary"
                          onClick={() => setMobileMenuOpen(false)}
                        />
                        <div className="ml-4 pl-4 border-l-2 border-gray-100 dark:border-gray-700 space-y-0.5 mb-1">
                          <MobileSubMenuItem
                            href="/admin/courses"
                            label="📚 Courses"
                            onClick={() => setMobileMenuOpen(false)}
                          />
                          <MobileSubMenuItem
                            href="/admin/courses/new"
                            label="➕ New Course"
                            onClick={() => setMobileMenuOpen(false)}
                          />
                          <MobileSubMenuItem
                            href="/admin/users"
                            label="👥 Users"
                            onClick={() => setMobileMenuOpen(false)}
                          />
                          <MobileSubMenuItem
                            href="/admin/registrations"
                            label="📝 Registrations"
                            onClick={() => setMobileMenuOpen(false)}
                          />
                          <MobileSubMenuItem
                            href="/admin/bunny-sync"
                            label="🐰 Bunny Sync"
                            onClick={() => setMobileMenuOpen(false)}
                          />
                        </div>
                      </>
                    )}

                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
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
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  /* ── Mobile: Logged Out Menu ─────────── */
                  <>
                    {/* FAQ */}
                    <MobileMenuItem
                      href="/faq"
                      icon={
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                          />
                        </svg>
                      }
                      label="FAQ"
                      onClick={() => setMobileMenuOpen(false)}
                    />

                    <MobileMenuItem
                      href="/auth/login"
                      icon={
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                          />
                        </svg>
                      }
                      label="Sign In"
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <MobileMenuItem
                      href="/auth/register"
                      icon={
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                          />
                        </svg>
                      }
                      label="Create Account"
                      highlight
                      onClick={() => setMobileMenuOpen(false)}
                    />
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* ── Mobile Menu Item Component ────────────────────────── */
function MobileMenuItem({
  href,
  icon,
  label,
  badge,
  badgeColor = "secondary",
  highlight = false,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  badgeColor?: "secondary" | "primary";
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 group ${
        highlight
          ? "bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white shadow-md hover:shadow-lg hover:shadow-[#a30000]/25 hover:-translate-y-0.5"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
      }`}
    >
      <span
        className={`${
          highlight
            ? "text-white/90"
            : "text-gray-400 dark:text-gray-500 group-hover:text-secondary transition-colors"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 font-medium">{label}</span>
      {badge && (
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            badgeColor === "secondary"
              ? "bg-secondary/10 text-secondary"
              : "bg-primary/10 text-primary"
          }`}
        >
          {badge}
        </span>
      )}
      {!highlight && (
        <svg
          className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-secondary transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </Link>
  );
}

/* ── Mobile Sub Menu Item Component ────────────────────── */
function MobileSubMenuItem({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group"
    >
      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-secondary transition-colors" />
      <span>{label}</span>
      <svg
        className="w-3 h-3 ml-auto text-gray-300 dark:text-gray-600 group-hover:text-secondary transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </Link>
  );
}
