"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetchJson } from "@/lib/utils/auth-fetch";

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
  isFromCloudinary?: boolean;
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
      <div className="h-44 bg-gray-200" />
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
        className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-2.5 rounded-full font-semibold hover:shadow-lg transition-all text-sm"
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
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
            setEnrolledIds(new Set(courses.map((course) => course.id)));
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
        }>;

        const activeIds: string[] = items
          .filter((e) => e.status === "active")
          .map((e) => String(e.courseId || e.course?.id));

        const pendingIds: string[] = items
          .filter((e) => e.status === "processing")
          .map((e) => String(e.courseId || e.course?.id));

        setEnrolledIds(new Set(activeIds));
        setPendingCourseIds(new Set(pendingIds));
      } catch (e) {
        console.warn("Failed to load enrollments", e);
      }
    };

    loadUserInfo();
  }, [token, courses]);

  useEffect(() => {
    Promise.all([
      fetch("/api/courses")
        .then((r) => r.json())
        .then((d) => d.data?.data || [])
        .catch(() => []),
      fetch("/api/courses/samples")
        .then((r) => r.json())
        .then((d) => d.data || [])
        .catch(() => []),
    ])
      .then(([dbData, cloudData]) => {
        const dbIds = new Set(dbData.map((c: Course) => c.id));
        const uniqueCloud = cloudData.filter((c: Course) => !dbIds.has(c.id));
        setCourses([...uniqueCloud, ...dbData]);
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
              ከመቶዎች ኮርሶች ውስጥ የሚፈልጉትን ይምረጡ እና በአዲስ መልኩ መማር ይጀምሩ
            </p>
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto">
              {[
                { value: isLoaded ? totalCount : "—", label: "ኮርሶች" },
                { value: "24/7", label: "ድጋፍ" },
                { value: "ነፃ", label: "ምዝገባ" },
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
            <span className="w-1.5 h-6 bg-gradient-to-b from-primary to-secondary rounded-full inline-block" />
            ሁሉም ኮርሶች
          </h2>
          {isLoaded && (
            <span className="text-xs text-text-muted">
              {courses.length} ኮርሶች ተገኝተዋል
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

        {/* Empty */}
        {isLoaded && courses.length === 0 && <EmptyState />}

        {/* Grid */}
        {isLoaded && courses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-border-light hover:border-primary"
              >
                <div className="relative h-44 bg-gradient-to-br from-primary to-secondary overflow-hidden">
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* Level badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm ${
                        course.level === "beginner"
                          ? "bg-primary/90 text-white"
                          : course.level === "intermediate"
                            ? "bg-secondary/90 text-white"
                            : "bg-purple-500/90 text-white"
                      }`}
                    >
                      {LEVEL_LABELS[course.level] || course.level}
                    </span>
                  </div>
                  {/* Duration badge for Cloudinary courses */}
                  {(course as any).videoDuration ? (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {(course as any).videoDuration}s
                    </div>
                  ) : (
                    <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5">
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
                      {course.enrollmentCount || 0}
                    </div>
                  )}
                  {/* Cloudinary badge */}
                  {(course as any).isFromCloudinary && (
                    <div className="absolute bottom-3 left-3 bg-secondary/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
                      ቪዲዮ ኮርስ
                    </div>
                  )}

                  {/* Lock badge for not-enrolled */}
                  {!enrolledIds.has(course.id) && !isAdmin && (
                    <>
                      <div className="absolute inset-0 bg-black/20 pointer-events-none transition-opacity duration-300" />
                      <div className="absolute top-3 right-3 inline-flex items-center gap-2 bg-white/90 text-primary text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm pointer-events-none">
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
                            d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4s-3 1.567-3 3.5S10.343 11 12 11zm-7 0h14v10H5V11z"
                          />
                        </svg>
                        Locked
                      </div>
                    </>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] text-primary bg-border-light px-2 py-0.5 rounded-full">
                      {course.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-primary mb-1.5 line-clamp-2 group-hover:text-secondary transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-text-muted line-clamp-2 leading-relaxed mb-4">
                    {course.shortDescription}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-border-light">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[10px] text-white font-bold">
                        {course.instructor?.fullName?.charAt(0) || "A"}
                      </div>
                      <span className="text-xs text-text-muted truncate max-w-[100px]">
                        {course.instructor?.fullName || "AD LMS"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold text-primary">
                        {enrolledIds.has(course.id) ? (
                          <span className="inline-flex items-center gap-2 text-primary">
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
                            Enrolled
                          </span>
                        ) : pendingCourseIds.has(course.id) ? (
                          <span className="inline-flex items-center gap-2 text-[#CA8A04]">
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
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Pending admin review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-secondary">
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
                                d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4s-3 1.567-3 3.5S10.343 11 12 11zm-7 0h14v10H5V11z"
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
                          className="mt-0 inline-flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:shadow-lg transition-all"
                        >
                          View course
                        </Link>
                      ) : enrolledIds.has(course.id) ? (
                        <Link
                          href={`/courses/${course.id}`}
                          className="mt-0 inline-flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:shadow-lg transition-all"
                        >
                          Continue learning
                        </Link>
                      ) : pendingCourseIds.has(course.id) ? (
                        <button
                          type="button"
                          className="mt-0 inline-flex items-center justify-center bg-[#FFF7ED] border border-[#FBBF24] text-[#B45309] text-sm font-semibold px-4 py-2.5 rounded-xl"
                          disabled
                        >
                          Pending payment review
                        </button>
                      ) : token ? (
                        <Link
                          href={`/auth/register/payment?${userId ? `userId=${userId}&` : ""}redirect=/courses/${course.id}&courseId=${course.id}`}
                          className="mt-0 inline-flex items-center justify-center bg-white border border-border-light text-secondary text-sm font-semibold px-4 py-2.5 rounded-xl hover:shadow transition-all"
                        >
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v-3m0 0V8m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Pay and start learning
                        </Link>
                      ) : (
                        <Link
                          href={`/auth/register?redirect=${encodeURIComponent(
                            `/auth/register/payment?courseId=${course.id}&redirect=/courses/${course.id}`,
                          )}`}
                          className="mt-0 inline-flex items-center justify-center bg-white border border-border-light text-secondary text-sm font-semibold px-4 py-2.5 rounded-xl hover:shadow transition-all"
                        >
                          Register and pay to take course
                        </Link>
                      )}
                    </div>
                  </div>
                  {/* Lock overlay for not-enrolled */}
                  {!enrolledIds.has(course.id) && (
                    <div className="absolute inset-0 flex items-start justify-end p-3 pointer-events-none">
                      <div className="bg-white/80 rounded-full p-2 shadow">
                        <svg
                          className="w-5 h-5 text-secondary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4s-3 1.567-3 3.5S10.343 11 12 11z M5 11h14v10H5V11z"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
