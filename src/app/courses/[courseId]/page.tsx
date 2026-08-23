"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedFetch } from "@/lib/utils/cache";
import CourseReviews from "@/components/CourseReviews";
import ExpandableDescription from "@/components/ExpandableDescription";
import { formatDuration } from "@/lib/utils/common";

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  price: number;
  currency?: string;
  level: string;
  category: string;
  duration: number;
  videoCount: number;
  enrollmentCount: number;
  coverImage: string;
  instructor: { id: string; fullName: string; profileImage: string };
  lectures: {
    id: string;
    title: string;
    duration: number;
    orderIndex: number;
  }[];
}

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [pendingEnrollment, setPendingEnrollment] = useState(false);
  const [rejectedEnrollment, setRejectedEnrollment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  useEffect(() => {
    setToken(localStorage.getItem("token") || "");
  }, []);

  useEffect(() => {
    const authToken = token || localStorage.getItem("token") || "";

    // Parallel fetch: course data + (if logged in) profile + enrollments
    const promises: Promise<void>[] = [
      cachedFetch(`/api/courses/${courseId}`, undefined, 15_000).then(
        (res: any) => {
          setCourse(res.data || res.data?.data || null);
        },
      ),
    ];

    if (authToken) {
      promises.push(
        (async () => {
          try {
            const [profileResult, enrResult] = await Promise.all([
              authFetchJson("/api/user/profile", { method: "GET" }),
              authFetchJson("/api/enrollments", { method: "GET" }),
            ]);

            if (profileResult.response.ok) {
              const profile = profileResult.data.data || {};
              setUserId(profile.id || null);
              const admin = profile.role === "admin";
              setIsAdmin(admin);
              if (admin) {
                setIsEnrolled(true);
                setPendingEnrollment(false);
                return;
              }
            }

            const items =
              enrResult.data?.data?.data ||
              enrResult.data?.data ||
              enrResult.data ||
              [];
            const matched = items.find(
              (e: any) => (e.courseId || e.course?.id) === courseId,
            );

            if (matched) {
              setEnrollmentData(matched);

              if (matched.status === "active") {
                setIsEnrolled(true);
                setPendingEnrollment(false);
                setRejectedEnrollment(false);
              } else if (matched.status === "processing") {
                setIsEnrolled(false);
                setPendingEnrollment(true);
                setRejectedEnrollment(false);
              } else if (
                matched.paymentStatus === "rejected" ||
                matched.status === "payment_rejected"
              ) {
                setIsEnrolled(false);
                setPendingEnrollment(false);
                setRejectedEnrollment(true);
              }

              // Store payment details
              const payment = Array.isArray(matched.payment)
                ? matched.payment[0]
                : matched.payment;
              if (payment) {
                setPaymentDetails(payment);
              }
            }
          } catch (e) {
            console.warn("Failed to load user enrollment data", e);
          }
        })(),
      );
    }

    Promise.all(promises).finally(() => setLoading(false));
  }, [courseId, token]);

  const levelLabels: Record<string, string> = {
    beginner: "Advanced",
    intermediate: "Advanced",
    advanced: "Advanced",
  };

  const getCourseStatus = () => {
    if (isEnrolled) {
      return {
        label: "Active access",
        styles: "bg-emerald-100 text-emerald-800",
      };
    }
    if (pendingEnrollment) {
      return {
        label: "Pending payment review",
        styles: "bg-amber-100 text-amber-800",
      };
    }
    if (rejectedEnrollment) {
      return {
        label: "Payment rejected",
        styles: "bg-red-100 text-red-800",
      };
    }
    return {
      label: "Open for enrollment",
      styles: "bg-slate-100 text-slate-800",
    };
  };

  const courseStatus = getCourseStatus();

  function formatDurationHoursMinutes(seconds: number): string {
    if (!seconds || seconds <= 0) return "0 min";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }
    return `${minutes} min`;
  }

  // Group lectures into chapters based on title prefix (e.g. "Chapter 1 - ..." or "Podcasts - ...")
  function groupLectures(lectures: CourseDetail["lectures"]) {
    if (!lectures)
      return [] as { group: string; items: CourseDetail["lectures"] }[];

    const map: Record<string, CourseDetail["lectures"]> = {} as any;
    for (const l of lectures) {
      const [maybeGroup] = l.title.split(" - ");
      const isChapter = /^(?:Chapter)\b/i.test(maybeGroup);
      const isPod = /podcast/i.test(maybeGroup) || /podcasts/i.test(maybeGroup);
      const group = isChapter
        ? maybeGroup
        : isPod
          ? "Podcasts"
          : maybeGroup || "Other";
      map[group] = map[group] || [];
      map[group].push(l);
    }

    const groups = Object.keys(map).map((g) => ({ group: g, items: map[g] }));
    groups.sort((a, b) => {
      const na = a.group.match(/Chapter\s*(\d+)/i);
      const nb = b.group.match(/Chapter\s*(\d+)/i);
      if (na && nb) return Number(na[1]) - Number(nb[1]);
      if (na) return -1;
      if (nb) return 1;
      if (a.group === "Podcasts") return 1;
      if (b.group === "Podcasts") return -1;
      return a.group.localeCompare(b.group);
    });
    return groups;
  }

  const lectureGroups = groupLectures(course?.lectures || []);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    lectureGroups.forEach((g) => (init[g.group] = true));
    return init;
  });

  const lectureDurations = course?.lectures?.map((lec) => {
    const value =
      typeof lec.duration === "string" ? Number(lec.duration) : lec.duration;
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  });

  const actualLectureCount =
    course?.lectures?.length ?? course?.videoCount ?? 0;
  const actualTotalDuration =
    lectureDurations && lectureDurations.length > 0
      ? lectureDurations.reduce((sum, dur) => sum + dur, 0)
      : (course?.duration ?? 0);
  const actualDurationLabel =
    actualTotalDuration > 0
      ? formatDurationHoursMinutes(actualTotalDuration)
      : course?.duration && course.duration > 0
        ? formatDurationHoursMinutes(course.duration)
        : "0 min";

  if (loading)
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-primary/20 border-t-secondary rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  if (!course)
    return (
      <div className="text-center text-gray-400 py-20">Course not found</div>
    );

  const isLoggedIn = !!token;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(195,115,15,0.16),_transparent_45%),linear-gradient(135deg,_#080403_0%,_#0f0a08_45%,_#140d0b_100%)] py-8">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          className="overflow-hidden rounded-[30px] border border-[#c9952a]/20 bg-[#140d0b]/90 shadow-[0_25px_70px_rgba(0,0,0,0.28)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(195,115,15,0.2),_transparent_35%),linear-gradient(135deg,_#0b0705_0%,_#150d0a_45%,_#1d120d_100%)] p-8 text-white">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[240px] bg-[#a30000]/10 rounded-full blur-[90px] pointer-events-none" />
            <motion.span
              className="inline-block rounded-full border border-[#f5c96b]/30 bg-white/10 px-3 py-1 text-xs font-medium text-[#f5e7c4] backdrop-blur-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {levelLabels[course.level] || course.level}
            </motion.span>
            <motion.h1
              className="mt-4 mb-2 text-2xl font-bold sm:text-3xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {course.title}
            </motion.h1>
            <motion.p
              className="text-sm text-[#f5e7c4]/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {course.instructor?.fullName}
            </motion.p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#f5e7c4]/80">
              <span>{actualLectureCount} videos</span>
              <span>{actualDurationLabel}</span>
              <span>{course.enrollmentCount} learners</span>
              <span className="font-bold text-[#f5c96b]">
                {course.price.toLocaleString()} {course.currency || "ETB"}
              </span>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${courseStatus.styles}`}
                >
                  {courseStatus.label}
                </span>
                {pendingEnrollment && paymentDetails && (
                  <span className="text-[11px] text-white/70">
                    {paymentDetails.paymentMethod || "Unknown method"} •{" "}
                    {paymentDetails.amount} {paymentDetails.currency || "ETB"}
                  </span>
                )}
                {rejectedEnrollment && (
                  <span className="text-[11px] text-red-200">
                    Payment rejected • ክፍያው ውድቅ ሆኗል
                  </span>
                )}
              </div>
            </div>
            {isEnrolled ? (
              <Link
                href={
                  course.lectures?.length > 0
                    ? `/courses/${courseId}/lectures/${course.lectures[0].id}`
                    : `/progress/${courseId}`
                }
                className="mt-4 inline-block rounded-lg bg-gradient-to-r from-[#a30000] to-[#c9952a] px-8 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#c9952a]/25"
              >
                Continue learning • መማር ይቀጥሉ
              </Link>
            ) : pendingEnrollment ? (
              <div className="mt-4 inline-flex flex-col items-center justify-center bg-[#FFF7ED] border border-[#FBBF24] text-[#B45309] px-8 py-3 rounded-lg font-semibold">
                <span>Pending review • በግምገማ ላይ</span>
                {paymentDetails && (
                  <span className="text-[10px] font-normal mt-1">
                    {paymentDetails.paymentMethod} receipt submitted{" "}
                    {paymentDetails.amount} {paymentDetails.currency}
                  </span>
                )}
              </div>
            ) : rejectedEnrollment ? (
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    router.push(
                      `/auth/register/payment?${userId ? `userId=${userId}&` : ""}courseId=${courseId}&redirect=/courses/${courseId}`,
                    );
                  }}
                  className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Re-submit • እንደገና ይክፈሉ
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    if (!token) {
                      router.push(
                        `/auth/register?redirect=${encodeURIComponent(
                          `/auth/register/payment?courseId=${courseId}&redirect=/courses/${courseId}`,
                        )}`,
                      );
                    } else if (isAdmin) {
                      router.push(`/courses/${courseId}`);
                    } else {
                      router.push(
                        `/auth/register/payment?${userId ? `userId=${userId}&` : ""}courseId=${courseId}&redirect=/courses/${courseId}`,
                      );
                    }
                  }}
                  disabled={enrolling}
                  className="rounded-lg border-2 border-[#c9952a] px-8 py-3 font-semibold text-[#f5c96b] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c9952a] hover:text-white hover:shadow-lg hover:shadow-[#c9952a]/25 disabled:opacity-50"
                >
                  {enrolling
                    ? "Enrolling..."
                    : isAdmin
                      ? "View course • ኮርሱን ይመልከቱ"
                      : isLoggedIn
                        ? "Enroll now • አሁን ይመዝገቡ"
                        : "Register • ይመዝገቡ"}
                </button>
              </div>
            )}

            {/* Enrollment Error */}
            {enrollError && (
              <p className="mt-3 text-red-200 text-sm">{enrollError}</p>
            )}
          </div>

          <div className="p-6">
            <h2 className="mb-3 text-lg font-semibold text-[#f5c96b]">
              About this course
            </h2>
            <ExpandableDescription
              text={course.description}
              maxLines={5}
              className="text-text-muted"
              variant="light"
            />

            <h2 className="mt-8 mb-4 text-lg font-semibold text-[#f5c96b]">
              Lessons ({course.lectures?.length || 0})
            </h2>

            {!isEnrolled && !isAdmin ? (
              <div className="rounded-[20px] border border-dashed border-[#c9952a]/25 bg-[#140d0b]/70 py-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#2b2018]">
                  <svg
                    className="w-7 h-7 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
                  </svg>
                </div>
                <h3 className="mb-1 text-base font-semibold text-[#f5e7c4]">
                  {pendingEnrollment
                    ? "Pending review • በግምገማ ላይ"
                    : rejectedEnrollment
                      ? "Payment rejected • ክፍያው ውድቅ ሆኗል"
                      : "Unlock course • ኮርሱን ይክፈቱ"}
                </h3>
                <p className="mx-auto max-w-xs text-sm text-[#f5e7c4]/70">
                  {pendingEnrollment
                    ? "We will notify you after approval. • ከጸደቀ በኋላ እናሳውቅዎታለን።"
                    : rejectedEnrollment
                      ? "Please try again. • እንደገና ይሞክሩ።"
                      : "Enroll to start learning. • ለመማር ይመዝገቡ።"}
                </p>
                {rejectedEnrollment && (
                  <button
                    onClick={() =>
                      router.push(
                        `/auth/register/payment?${userId ? `userId=${userId}&` : ""}courseId=${courseId}&redirect=/courses/${courseId}`,
                      )
                    }
                    className="mt-4 rounded-lg bg-[#2b2018] px-5 py-2 text-sm font-medium text-[#f5c96b] transition-colors hover:bg-[#3a2b1a]"
                  >
                    Re-submit • እንደገና ይክፈሉ
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {lectureGroups.map((group) => (
                  <div
                    key={group.group}
                    className="rounded-2xl border border-[#c9952a]/10 bg-[#140d0b]/50 p-3"
                  >
                    <button
                      onClick={() =>
                        setOpenGroups((s) => ({
                          ...s,
                          [group.group]: !s[group.group],
                        }))
                      }
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-[#1a120d]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#f5c96b]">
                          {group.group}
                        </span>
                        <span className="rounded-full border border-[#c9952a]/20 bg-[#2b2018] px-2.5 py-0.5 text-[11px] text-[#f5e7c4]/70">
                          {group.items.length} lesson
                          {group.items.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="text-sm text-[#f5e7c4]/60">
                        {openGroups[group.group] ? "−" : "+"}
                      </div>
                    </button>

                    {openGroups[group.group] && (
                      <div className="mt-2 space-y-2">
                        {group.items.map((lec, i) => {
                          const displayTitle = lec.title.replace(
                            /^[^-]+-\s*/i,
                            "",
                          );
                          const canOpen = isEnrolled || isAdmin;

                          return (
                            <div
                              key={lec.id}
                              onClick={() => {
                                if (canOpen) {
                                  router.push(
                                    `/courses/${courseId}/lectures/${lec.id}`,
                                  );
                                }
                              }}
                              className={`rounded-[14px] border border-[#c9952a]/10 p-3 transition-all ${
                                canOpen
                                  ? "cursor-pointer bg-[#1a120d] hover:border-[#c9952a]/30 hover:bg-[#22160f]"
                                  : "bg-[#140d0b]/60 opacity-80"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2b2018] text-sm font-semibold text-[#f5c96b]">
                                  {i + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <h3 className="text-sm font-medium text-white">
                                        {displayTitle}
                                      </h3>
                                      <p className="mt-1 text-[12px] text-[#f5e7c4]/60">
                                        {canOpen
                                          ? lec.duration
                                            ? `${formatDuration(lec.duration)} • Watch now`
                                            : "Watch now"
                                          : "Unlock after enrollment"}
                                      </p>
                                    </div>
                                    <div className="shrink-0 rounded-full border border-[#c9952a]/20 bg-[#1c120d] px-2.5 py-1 text-[11px] font-medium text-[#f5c96b]">
                                      {lec.duration
                                        ? formatDuration(lec.duration)
                                        : "Video"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {lectureGroups.length === 0 && (
                  <div className="py-8 text-center text-sm text-[#f5e7c4]/70">
                    No lessons available yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Reviews Section */}
        {course && (
          <div className="mt-8">
            <CourseReviews
              courseId={course.id}
              isEnrolled={isEnrolled}
              token={token}
            />
          </div>
        )}
      </div>
    </div>
  );
}
