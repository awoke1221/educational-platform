"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedFetch } from "@/lib/utils/cache";

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
        በቅርቡ አዳዲስ ኮርሶች ይጨመራሉ። ይጠብቁን
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
        ይመዝገቡ እና ይጀምሩ
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
  // Search & Filter state
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
    <div className="min-h-screen bg-surface">
      {/* ── Hero Banner ─────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary via-primary-light to-secondary overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
              ኮርሶች
            </h1>
            <p className="text-base sm:text-lg text-white/90 mb-8 max-w-xl mx-auto">
              ቢሊዮኖች እይታዎችን ያመጡ ስልቶችን ይማሩ፣ ብራንድዎን ይገንቡ፣
            </p>
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto">
              {[
                { value: isLoaded ? totalCount : "—", label: "ኮርሶች" },
                { value: "24/7", label: "ድጋፍ" },
                { value: "ቀላል", label: "ምዝገባ" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-white/80 mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface to-transparent" />
      </section>

      {/* ── All Courses Grid ────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <span className="w-1.5 h-7 bg-gradient-to-b from-primary to-secondary rounded-full inline-block" />
            ሁሉም ኮርሶች
          </h2>
          {isLoaded && (
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
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
                  በቅርቡ አዳዲስ ኮርሶች ይጨመራሉ። ይጠብቁን
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
                className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 border border-gray-100 dark:border-gray-700 hover:border-primary/30 dark:hover:border-secondary/50 hover:-translate-y-1"
              >
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

                  {/* Lock overlay for not-enrolled */}
                  {!enrolledIds.has(course.id) && !isAdmin && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
                  )}
                </div>
                <div className="p-5">
                  {/* Category tag */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-medium text-primary dark:text-gray-200 bg-primary/5 dark:bg-gray-700/50 px-2.5 py-0.5 rounded-full ring-1 ring-primary/10 dark:ring-gray-600">
                      {course.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1.5 line-clamp-2 group-hover:text-primary dark:group-hover:text-secondary transition-colors text-base leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4">
                    {course.shortDescription}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[11px] text-white font-bold shrink-0 shadow-sm">
                        {course.instructor?.fullName?.charAt(0) || "A"}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {course.instructor?.fullName || "AD LMS"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-sm font-semibold">
                        {rejectedCourseIds.has(course.id) ? (
                          <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-lg text-xs">
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Rejected
                          </span>
                        ) : enrolledIds.has(course.id) ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg text-xs font-medium">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                            Enrolled
                          </span>
                        ) : pendingCourseIds.has(course.id) ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg text-xs font-medium">
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
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 px-2.5 py-1 rounded-lg text-xs font-medium">
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
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                            {(course.currency || "ETB") +
                              " " +
                              (course.price ?? 0)}
                          </span>
                        )}
                      </div>
                      {/* CTA */}
                      {isAdmin ? (
                        <Link
                          href={`/courses/${course.id}`}
                          className="inline-flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white text-xs font-semibold px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all duration-300"
                        >
                          View course
                        </Link>
                      ) : enrolledIds.has(course.id) ? (
                        <Link
                          href={`/courses/${course.id}`}
                          className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 transition-all duration-300"
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
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                          </svg>
                          Continue
                        </Link>
                      ) : pendingCourseIds.has(course.id) ? (
                        <button
                          type="button"
                          className="inline-flex items-center justify-center bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-xs font-semibold px-4 py-2 rounded-lg cursor-not-allowed"
                          disabled
                        >
                          Pending
                        </button>
                      ) : token ? (
                        <Link
                          href={`/auth/register/payment?${userId ? `userId=${userId}&` : ""}redirect=/courses/${course.id}&courseId=${course.id}`}
                          className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-secondary text-white text-xs font-semibold px-5 py-2 rounded-lg shadow-md hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
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
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                          Enroll
                        </Link>
                      ) : (
                        <Link
                          href={`/auth/register?redirect=${encodeURIComponent(
                            `/auth/register/payment?courseId=${course.id}&redirect=/courses/${course.id}`,
                          )}`}
                          className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-secondary text-white text-xs font-semibold px-5 py-2 rounded-lg shadow-md hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
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
                              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                            />
                          </svg>
                          Enroll
                        </Link>
                      )}
                    </div>
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
