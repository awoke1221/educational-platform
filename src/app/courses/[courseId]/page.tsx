"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedFetch } from "@/lib/utils/cache";
import CourseReviews from "@/components/CourseReviews";

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  price: number;
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

            const items = enrResult.data?.data || enrResult.data || [];
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
    beginner: "ጀማሪ",
    intermediate: "መካከለኛ",
    advanced: "ከፍተኛ",
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
      label: "Payment required",
      styles: "bg-slate-100 text-slate-800",
    };
  };

  const courseStatus = getCourseStatus();

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
    return <div className="text-center text-gray-500 py-20">ኮርስ አልተገኘም</div>;

  const isLoggedIn = !!token;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-border-light dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="bg-gradient-to-br from-primary via-primary-light to-secondary p-8 text-white">
          <motion.span
            className="bg-white/20 backdrop-blur-sm text-xs px-3 py-1 rounded-full text-white font-medium inline-block"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {levelLabels[course.level] || course.level}
          </motion.span>
          <motion.h1
            className="text-2xl sm:text-3xl font-bold mt-4 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {course.title}
          </motion.h1>
          <motion.p
            className="text-white/80 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {course.instructor?.fullName}
          </motion.p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-white/80">
            <span>{course.videoCount} ቪዲዮዎች</span>
            <span>{course.duration || 0} ደቂቃ</span>
            <span>{course.enrollmentCount} ተማሪዎች</span>
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
                  Your payment was rejected. Please re-submit.
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
              className="inline-block mt-4 bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Continue learning
            </Link>
          ) : pendingEnrollment ? (
            <div className="mt-4 inline-flex flex-col items-center justify-center bg-[#FFF7ED] border border-[#FBBF24] text-[#B45309] px-8 py-3 rounded-lg font-semibold">
              <span>Pending payment review</span>
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
                Re-submit payment
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
                className="border-2 border-[#1b2a4a] text-[#1b2a4a] px-8 py-3 rounded-lg font-semibold hover:bg-[#1b2a4a] hover:text-white hover:shadow-lg hover:shadow-[#1b2a4a]/25 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
              >
                {enrolling
                  ? "በመመዝገብ ላይ..."
                  : isAdmin
                    ? "View course"
                    : isLoggedIn
                      ? "Pay and start learning"
                      : "Register and pay to take course"}
              </button>
            </div>
          )}

          {/* Enrollment Error */}
          {enrollError && (
            <p className="mt-3 text-red-200 text-sm">{enrollError}</p>
          )}
        </div>

        <div className="p-6">
          <h2 className="font-semibold text-lg mb-3 text-primary">ስለ ኮርሱ</h2>
          <p className="text-text-muted text-sm leading-relaxed whitespace-pre-line">
            {course.description}
          </p>

          <h2 className="font-semibold text-lg mt-8 mb-4 text-primary">
            ትምህርቶች ({course.lectures?.length || 0})
          </h2>

          {!isEnrolled && !isAdmin ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-7 h-7 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">
                {pendingEnrollment
                  ? "Waiting for admin approval"
                  : rejectedEnrollment
                    ? "Payment rejected"
                    : "Course locked"}
              </h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                {pendingEnrollment
                  ? "Your payment is being reviewed. You'll get access once approved."
                  : rejectedEnrollment
                    ? "Your payment was rejected. Please re-submit to access lectures."
                    : "Please complete payment and wait for admin approval to access the lectures."}
              </p>
              {rejectedEnrollment && (
                <button
                  onClick={() =>
                    router.push(
                      `/auth/register/payment?${userId ? `userId=${userId}&` : ""}courseId=${courseId}&redirect=/courses/${courseId}`,
                    )
                  }
                  className="mt-4 bg-red-50 text-red-600 px-5 py-2 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                >
                  Re-submit payment
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {course.lectures?.map((lec, i) => (
                <div
                  key={lec.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isEnrolled
                      ? "bg-gradient-to-r from-border-light to-accent-light hover:from-[#D0D8E8] hover:to-[#F5E8C8] cursor-pointer"
                      : "bg-gray-50/50 cursor-default"
                  }`}
                  onClick={() => {
                    if (isEnrolled) {
                      router.push(`/courses/${courseId}/lectures/${lec.id}`);
                    }
                  }}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                      isEnrolled
                        ? "bg-gradient-to-br from-primary to-secondary text-white"
                        : "bg-gray-300 text-gray-500"
                    }`}
                  >
                    {isEnrolled ? (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium text-sm ${
                        isEnrolled ? "text-primary" : "text-gray-400"
                      }`}
                    >
                      {lec.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      {lec.duration || 0} ደቂቃ
                    </p>
                  </div>
                  {isEnrolled ? (
                    <svg
                      className="w-4 h-4 text-primary flex-shrink-0"
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
                  ) : (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      ይመዝገቡ
                    </span>
                  )}
                </div>
              ))}
              {(!course.lectures || course.lectures.length === 0) && (
                <div className="text-center py-8 text-text-muted text-sm">
                  ምንም ትምህርቶች የሉም
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ⭐ Reviews Section */}
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
  );
}
