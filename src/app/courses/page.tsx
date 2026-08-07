"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedFetch } from "@/lib/utils/cache";
import ExpandableDescription from "@/components/ExpandableDescription";

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

interface Course {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  coverImage: string;
  level: string;
  category: string;
  price: number;
  currency: string;
  enrollmentCount: number;
  instructor: { fullName: string };
  videoDuration?: number;
  videoUrl?: string;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "ጀማሪ",
  intermediate: "መካከለኛ",
  advanced: "ከፍተኛ",
};

// ─── Particle Field ─────────────────────────────────
function ParticleField({ count = 20 }: { count?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" />
    );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/8 blur-[1px]"
          style={{
            left: `${(i * 17 + 7) % 100}%`,
            top: `${(i * 19 + 3) % 100}%`,
            width: 2 + (i % 3),
            height: 2 + (i % 3),
          }}
          animate={{
            y: [0, -15 - (i % 5), 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 4 + (i % 3),
            repeat: Infinity,
            ease: "easeInOut",
            delay: (i % 5) * 0.3,
          }}
        />
      ))}
    </div>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-gray-200" />
          <div className="h-5 w-20 rounded-full bg-gray-200" />
        </div>
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-100" />
        <div className="h-4 w-2/3 rounded bg-gray-100" />
        <div className="flex justify-between pt-3 border-t border-gray-100">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────
function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-6 ring-1 ring-primary/20">
        <svg
          className="w-12 h-12 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-primary mb-2">እስካሁን ኮርሶች የሉም</h3>
      <p className="text-text-muted max-w-md mb-6">
        በቅርቡ አዳዲስ እና ጥራት ያላቸው ኮርሶችን እንጨምራለን። እባክዎ ይጠብቁን።
      </p>
      <Link
        href="/auth/register"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0f1b3a] to-[#1b2a4a] text-white px-6 py-2.5 rounded-full font-semibold hover:shadow-lg hover:shadow-[#1b2a4a]/25 hover:-translate-y-0.5 transition-all duration-300 text-sm"
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
            d="M5 13l4 4L19 7"
          />
        </svg>
        አሁኑኑ ይመዝገቡ
      </Link>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────
export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(
    new Set<string>(),
  );
  const [pendingCourseIds, setPendingCourseIds] = useState<Set<string>>(
    new Set<string>(),
  );
  const [rejectedCourseIds, setRejectedCourseIds] = useState<Set<string>>(
    new Set<string>(),
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [enrollmentMap, setEnrollmentMap] = useState<Map<string, any>>(
    new Map(),
  );
  // Search state
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("token") || "");
  }, []);

  useEffect(() => {
    if (!token) return;
    const loadUserInfo = async () => {
      try {
        const profileResult = await authFetchJson("/api/user/profile", {
          method: "GET",
        });
        if (profileResult.response.ok) {
          const profile = profileResult.data.data || {};
          setUserId(profile.id || null);
          setIsAdmin(profile.role === "admin");
          if (profile.role === "admin") {
            return;
          }
        }

        const enr = await authFetchJson("/api/enrollments", {
          method: "GET",
        }).then((result) => result.data);
        const items = (enr.data?.data || enr.data || []) as Array<{
          courseId?: string;
          course?: { id?: string };
          status?: string;
          paymentStatus?: string;
          payment?: any;
        }>;

        const activeIds: string[] = [];
        const pendingIds: string[] = [];
        const rejectedIds: string[] = [];
        const enrollments = new Map();

        items.forEach((e) => {
          const cId = String(e.courseId || e.course?.id);
          enrollments.set(cId, e);

          if (e.status === "active") {
            activeIds.push(cId);
          } else if (
            e.status === "processing" ||
            e.paymentStatus === "submitted" ||
            e.paymentStatus === "pending"
          ) {
            pendingIds.push(cId);
          } else if (e.paymentStatus === "rejected") {
            rejectedIds.push(cId);
          }
        });

        setEnrollmentMap(enrollments);
        setEnrolledIds(new Set(activeIds));
        setPendingCourseIds(new Set(pendingIds));
        setRejectedCourseIds(new Set(rejectedIds));
      } catch (e) {
        console.warn("Failed to load enrollments", e);
      }
    };

    loadUserInfo();
  }, [token]);

  // Admin: mark all courses as enrolled
  useEffect(() => {
    if (isAdmin && courses.length > 0) {
      setEnrolledIds(new Set(courses.map((c) => c.id)));
    }
  }, [isAdmin, courses]);

  useEffect(() => {
    setFetchError(null);
    cachedFetch("/api/courses", undefined, 15_000)
      .then((d: any) => {
        if (!d.success) {
          setFetchError(d.error || "Failed to load courses");
          setCourses([]);
        } else {
          setCourses(d.data?.data || []);
        }
      })
      .catch((err: Error) => {
        console.error("[COURSES] Fetch error:", err);
        setFetchError(err.message || "Network error — unable to load courses");
        setCourses([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const isLoaded = !loading;
  const totalCount = courses.length;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ── Hero Banner ─────────────────────────────── */}
      <section className="relative bg-[#0a0a0a] overflow-hidden">
        <ParticleField count={25} />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#dc2626]/8 to-[#ef4444]/3 blur-3xl animate-orb" />
          <motion.div className="absolute -bottom-32 -left-32 w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-[#7f1d1d]/10 to-transparent blur-3xl animate-orb-slow" />
          <motion.div className="absolute top-1/4 right-1/4 w-20 h-20 rounded-full border border-[#dc2626]/10 animate-spin-slow" />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#dc2626]/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-[#ef4444]/20 text-white/70 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
                <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                Adonay TikTok Academy
              </span>
            </motion.div>
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              የሚገኙ{" "}
              <span className="bg-gradient-to-r from-[#7f1d1d] to-[#dc2626] bg-clip-text text-transparent">
                ኮርሶች
              </span>
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg text-white/70 mb-8 max-w-xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              የ TikTok ስኬት ምስጢሮችን ይማሩ። የቫይራል ይዘት ይፍጠሩ፣ ታዳሚዎን ያሳድጉ እና የሚታመን ዲጂታል
              ብራንድ ይገንቡ።
            </motion.p>
            <motion.div
              className="grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {[
                { value: isLoaded ? totalCount : "—", label: "ኮርሶች" },
                { value: "24/7", label: " የተማሪ ድጋፍ" },
                { value: " ፈጣን", label: "ምዝገባ" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent drop-shadow-lg">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-white/50 mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      </section>

      {/* ── All Courses Grid ────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
            <span className="w-1.5 h-7 bg-gradient-to-b from-[#7f1d1d] to-[#dc2626] rounded-full inline-block" />
            ኮርስ
          </h2>
          {isLoaded && (
            <span className="text-xs text-white/40 font-medium bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              {courses.length} ኮርሶች
            </span>
          )}
        </div>

        {/* Loading */}
        {!isLoaded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty / Error */}
        {isLoaded && courses.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            {fetchError ? (
              <>
                <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4 ring-1 ring-red-200 dark:ring-red-800">
                  <svg
                    className="w-10 h-10 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">
                  Unable to load courses
                </h3>
                <p className="text-sm text-red-500 dark:text-red-400/80 mb-4 max-w-md">
                  {fetchError}
                </p>
                <button
                  onClick={() => {
                    setLoading(true);
                    setFetchError(null);
                    cachedFetch("/api/courses", undefined, 0)
                      .then((d: any) => {
                        if (!d.success) {
                          setFetchError(d.error || "Failed to load courses");
                          setCourses([]);
                        } else {
                          setCourses(d.data?.data || []);
                        }
                      })
                      .catch((err: Error) => {
                        setFetchError(err.message || "Network error");
                        setCourses([]);
                      })
                      .finally(() => setLoading(false));
                  }}
                  className="inline-flex items-center gap-2 text-sm bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Try again
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                  <svg
                    className="w-10 h-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  እስካሁን ኮርሶች የሉም
                </h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                  አሁንም ለመመዝገብ ዝግጁ ያሉ ኮርሶች አሉ። ይመርምሩ እና ይጀምሩ።
                </p>
              </>
            )}
          </div>
        )}

        {/* Grid */}
        {isLoaded && courses.length > 0 && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-30px" }}
          >
            {courses.map((course) => (
              <motion.div
                key={course.id}
                variants={staggerItem}
                className="group bg-white/[0.03] backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-[#dc2626]/15 transition-all duration-500 border border-white/5 hover:border-[#dc2626]/40 hover:-translate-y-2 relative"
              >
                {/* Card glow on hover */}
                <div className="absolute -inset-0.5 bg-gradient-to-br from-[#dc2626]/20 via-transparent to-[#ef4444]/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm pointer-events-none" />
                <div className="relative h-48 bg-gradient-to-br from-primary via-primary-light to-secondary overflow-hidden">
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback to gradient background if image fails to load
                      const target = e.currentTarget;
                      target.style.display = "none";
                      // Show a gradient placeholder with course initials
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector(".img-fallback")) {
                        const fallback = document.createElement("div");
                        fallback.className =
                          "img-fallback absolute inset-0 flex items-center justify-center";
                        fallback.innerHTML = `<span class="text-4xl font-bold text-white/60">${course.title.charAt(0)}</span>`;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                  {/* Level badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`text-[11px] font-semibold px-3 py-1 rounded-full backdrop-blur-md shadow-lg ${
                        course.level === "beginner"
                          ? "bg-emerald-500/90 text-white ring-1 ring-emerald-300/50"
                          : course.level === "intermediate"
                            ? "bg-amber-500/90 text-white ring-1 ring-amber-300/50"
                            : "bg-purple-500/90 text-white ring-1 ring-purple-300/50"
                      }`}
                    >
                      {LEVEL_LABELS[course.level] || course.level}
                    </span>
                  </div>
                  {/* Price badge */}
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-[#a30000] to-[#c9952a] text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                    </svg>
                    {course.price.toLocaleString()} {course.currency || "ETB"}
                  </div>

                  {/* Enrollment count badge */}
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                      />
                    </svg>
                    {course.enrollmentCount || 0} enrolled
                  </div>

                  {/* No enrollment lock overlay — all courses are coming soon */}
                </div>
                <div className="p-5 relative z-10">
                  {/* Category tag */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-medium text-white bg-[#dc2626]/20 px-2.5 py-0.5 rounded-full ring-1 ring-[#dc2626]/20">
                      {course.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-white mb-1.5 line-clamp-2 group-hover:text-[#ef4444] transition-colors text-base leading-snug">
                    {course.title}
                  </h3>
                  <ExpandableDescription
                    text={course.description || course.shortDescription}
                    maxLines={2}
                    className="mb-4"
                  />
                  <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7f1d1d] to-[#dc2626] flex items-center justify-center text-[11px] text-white font-bold shrink-0 shadow-sm">
                        {course.instructor?.fullName?.charAt(0) || "A"}
                      </div>
                      <span className="text-xs text-white/50 truncate">
                        {course.instructor?.fullName || "AD LMS"}
                      </span>
                    </div>
                    {isAdmin || enrolledIds.has(course.id) ? (
                      <Link
                        href={`/courses/${course.id}`}
                        className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-400/20 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                        Active
                      </Link>
                    ) : pendingCourseIds.has(course.id) ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-400 bg-amber-400/10 border border-amber-400/25 px-3 py-1.5 rounded-lg text-xs font-bold">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        Pending
                      </span>
                    ) : rejectedCourseIds.has(course.id) ? (
                      <span className="inline-flex items-center gap-1.5 text-red-400 bg-red-400/10 border border-red-400/25 px-3 py-1.5 rounded-lg text-xs font-bold">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        Rejected
                      </span>
                    ) : (
                      <Link
                        href={`/courses/${course.id}`}
                        className="inline-flex items-center gap-1.5 text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/25 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#ef4444]/20 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                          />
                        </svg>
                        አሁን ይመዝገቡ
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}
