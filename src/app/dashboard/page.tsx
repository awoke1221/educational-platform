"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedAuthFetchJson } from "@/lib/utils/cache";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ProgressRing } from "@/components/ProgressRing";
import {
  AnimatedSection,
  StaggerContainer,
  StaggerItem,
} from "@/components/AnimatedSection";

interface CourseInfo {
  id: string;
  title: string;
  coverImage: string;
  instructor: { fullName: string };
}

interface Enrollment {
  id: string;
  status: string;
  paymentStatus?: string;
  completionPercentage: number;
  progressPercentage: number;
  course: CourseInfo;
  courseId?: string;
}

interface DashboardStats {
  overview?: {
    totalEnrollments: number;
    activeCourses: number;
    completedCourses: number;
    certificatesCount: number;
  };
}

interface UserProfile {
  id?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  profileImage?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  lastLogin?: string;
  paymentStatus?: string;
}

function getInitials(name?: string) {
  if (!name) return "U";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

const statIcons = [
  (active: boolean) => (
    <svg
      className={`w-6 h-6 ${active ? "text-secondary" : "text-gray-400"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  (active: boolean) => (
    <svg
      className={`w-6 h-6 ${active ? "text-secondary" : "text-gray-400"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
  (active: boolean) => (
    <svg
      className={`w-6 h-6 ${active ? "text-secondary" : "text-gray-400"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    </svg>
  ),
  (active: boolean) => (
    <svg
      className={`w-6 h-6 ${active ? "text-secondary" : "text-gray-400"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 14v3m-3 0h6"
      />
    </svg>
  ),
  (active: boolean) => (
    <svg
      className={`w-6 h-6 ${active ? "text-secondary" : "text-gray-400"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
];

export default function DashboardPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [inPersonRegistrations, setInPersonRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  const pendingCount = enrollments.filter(
    (enr) =>
      enr.paymentStatus === "submitted" ||
      enr.status === "processing" ||
      enr.paymentStatus === "rejected",
  ).length;

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) return;

    const storedUser = localStorage.getItem("user");
    const fallbackProfile = storedUser ? JSON.parse(storedUser) : null;

    setToken(t);
    setProfile(fallbackProfile);

    Promise.all([
      cachedAuthFetchJson("/api/enrollments", { method: "GET" }, 15_000).then(
        (result) => result.data,
      ),
      cachedAuthFetchJson(
        "/api/enrollments/stats",
        { method: "GET" },
        15_000,
      ).then((result) => result.data),
      authFetchJson("/api/user/profile", { method: "GET" }).then(
        (result) => result.data,
      ),
      authFetchJson("/api/in-person-training", { method: "GET" }).then(
        (result) => result.data,
      ),
    ])
      .then(([enr, st, profileResult, inPersonResult]) => {
        setEnrollments(enr.data?.data || []);
        setStats(st.data);

        const userData =
          profileResult?.data || profileResult || fallbackProfile;
        if (userData) {
          setProfile(userData);
        }

        setInPersonRegistrations(inPersonResult?.data || []);
      })
      .catch(() => {
        if (fallbackProfile) {
          setProfile(fallbackProfile);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center ring-1 ring-primary/20">
            <svg
              className="w-10 h-10 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-lg">
            Please sign in
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#a30000]/25 hover:-translate-y-0.5 transition-all duration-300"
          >
            Sign In
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
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="w-12 h-12 border-4 border-primary/20 border-t-secondary rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );

  const statsData = [
    {
      label: "Enrolled",
      value: stats?.overview?.totalEnrollments || 0,
      icon: statIcons[0],
    },
    {
      label: "Active Courses",
      value: stats?.overview?.activeCourses || 0,
      icon: statIcons[1],
    },
    {
      label: "Completed",
      value: stats?.overview?.completedCourses || 0,
      icon: statIcons[2],
    },
    {
      label: "Certificates",
      value: stats?.overview?.certificatesCount || 0,
      icon: statIcons[3],
    },
    { label: "Pending Payments", value: pendingCount, icon: statIcons[4] },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(195,115,15,0.16),_transparent_45%),linear-gradient(135deg,_#080403_0%,_#0f0a08_45%,_#140d0b_100%)] text-white">
      {/* Header */}
      <div className="text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(195,115,15,0.12),_transparent_55%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] bg-[#a30000]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <motion.h1
            className="text-2xl sm:text-3xl font-bold"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            My Learning Dashboard
          </motion.h1>
          <motion.p
            className="text-white/70 text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            Track your progress and stay on top of your learning
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        <motion.div
          className="mb-8 rounded-[28px] border border-[#c9952a]/20 bg-gradient-to-br from-[#140d0b] via-[#1a110c] to-[#2a160d] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.3)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#ef4444]/25 to-[#c9952a]/25 ring-1 ring-[#c9952a]/30">
                {profile?.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt={profile.fullName || "User avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-[#f5c96b]">
                    {getInitials(profile?.fullName || profile?.email)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c9952a]">
                  Profile Overview
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {profile?.fullName || "User Name"}
                </h2>
                <p className="text-sm text-[#f5e7c4]/70">
                  {profile?.email || "No email available"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#c9952a]">
                  Role
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {profile?.role || "Learner"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#c9952a]">
                  Phone
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {profile?.phoneNumber || "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#c9952a]">
                  Joined
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {formatDate(profile?.createdAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#c9952a]">
                  Status
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {profile?.isActive === false ? "Inactive" : "Active"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {inPersonRegistrations.length > 0 && (
          <div className="mb-8 rounded-[24px] border border-[#c9952a]/20 bg-[#140d0b]/90 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)]">
            <h2 className="mb-4 text-lg font-semibold text-[#f5c96b]">
              In-person training status
            </h2>
            <div className="space-y-3">
              {inPersonRegistrations.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[18px] border border-[#c9952a]/20 bg-[#1a120d] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.course_id || "In-person training"}
                      </p>
                      <p className="text-xs text-[#f5e7c4]/70">
                        Status: {item.registration_status || "Pending"}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#2b2018] px-3 py-1 text-xs text-[#f5e7c4]">
                      {item.payment_status || "Pending"}
                    </span>
                  </div>
                  {item.coupon_code ? (
                    <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                      <p className="font-semibold">Your coupon code</p>
                      <p className="mt-1 font-mono">{item.coupon_code}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[#f5e7c4]/70">
                      Your payment is being reviewed. Once approved, your coupon
                      code will appear here.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            {statsData.map((s, i) => (
              <StaggerItem key={i}>
                <div className="rounded-[24px] border border-[#c9952a]/20 bg-[#140d0b]/90 p-5 shadow-[0_14px_45px_rgba(0,0,0,0.22)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#ef4444]/20 to-[#c9952a]/20 mb-3 mx-auto">
                    {s.icon(true)}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#f5c96b] text-center">
                    <AnimatedCounter to={s.value} duration={2000} />
                  </div>
                  <div className="text-xs text-[#f5e7c4]/70 text-center mt-1">
                    {s.label}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {/* Enrolled Courses */}
        <AnimatedSection direction="up">
          <h2 className="font-semibold text-lg mb-4 text-[#f5c96b] flex items-center gap-2">
            <span className="w-1.5 h-5 bg-gradient-to-b from-[#ef4444] to-[#c9952a] rounded-full inline-block" />
            My Enrolled Courses
          </h2>
        </AnimatedSection>

        {enrollments.length === 0 ? (
          <motion.div
            className="text-center py-16 rounded-[24px] border border-[#c9952a]/20 bg-[#140d0b]/85 shadow-[0_16px_50px_rgba(0,0,0,0.24)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center ring-1 ring-primary/20">
              <svg
                className="w-10 h-10 text-primary dark:text-gray-300"
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
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              You haven’t enrolled in any course yet.
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#a30000]/25 hover:-translate-y-0.5 transition-all duration-300"
            >
              Browse Courses
            </Link>
          </motion.div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {enrollments.map((enr) => {
              const progress =
                enr.completionPercentage || enr.progressPercentage || 0;
              return (
                <StaggerItem key={enr.id}>
                  <div className="rounded-[24px] border border-[#c9952a]/20 bg-[#140d0b]/90 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(0,0,0,0.28)] group">
                    <Link
                      href={`/courses/${enr.course?.id || enr.courseId}`}
                      className="block"
                    >
                      <div className="h-36 rounded-[20px] bg-gradient-to-br from-[#8a0000] via-[#a30000] to-[#c9952a] flex items-center justify-center mb-4 relative overflow-hidden">
                        <span className="text-white text-3xl font-bold relative z-10">
                          {enr.course?.title?.charAt(0) || "?"}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                      <h3 className="font-semibold text-sm mb-3 text-[#f5e7c4] group-hover:text-[#f5c96b] transition-colors line-clamp-1">
                        {enr.course?.title}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-3 mb-3">
                      <ProgressRing
                        percentage={progress}
                        size={48}
                        strokeWidth={4}
                      >
                        <span className="text-[10px] font-bold text-[#f5c96b]">
                          {Math.round(progress)}%
                        </span>
                      </ProgressRing>
                      <div className="flex-1 min-w-0">
                        <div className="w-full bg-[#2b2018] rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-secondary to-accent h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-[#f5e7c4]/70 mt-1">
                          {Math.round(progress)}% completed
                        </p>
                      </div>
                    </div>

                    {enr.paymentStatus === "rejected" ? (
                      <div className="inline-flex items-center gap-2 text-[#B91C1C] text-xs font-semibold mb-3">
                        <span className="inline-flex h-6 px-2.5 items-center rounded-full bg-[#FECACA] text-[#B91C1C]">
                          Payment rejected
                        </span>
                      </div>
                    ) : enr.paymentStatus === "submitted" ||
                      enr.status === "processing" ? (
                      <div className="inline-flex items-center gap-2 text-[#CA8A04] text-xs font-semibold mb-3">
                        <span className="inline-flex h-6 px-2.5 items-center rounded-full bg-[#FEF3C7] text-[#CA8A04]">
                          Pending payment review
                        </span>
                      </div>
                    ) : null}

                    {enr.status === "active" && (
                      <Link
                        href={`/courses/${enr.course?.id || enr.courseId}`}
                        className="block w-full text-center bg-gradient-to-r from-[#a30000] to-[#c9952a] text-white text-sm py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-[#c9952a]/25 hover:-translate-y-0.5 transition-all duration-300"
                      >
                        Watch Video →
                      </Link>
                    )}
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>
    </div>
  );
}
