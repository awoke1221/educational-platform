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
    setToken(t);
    Promise.all([
      cachedAuthFetchJson("/api/enrollments", { method: "GET" }, 15_000).then(
        (result) => result.data,
      ),
      cachedAuthFetchJson(
        "/api/enrollments/stats",
        { method: "GET" },
        15_000,
      ).then((result) => result.data),
    ])
      .then(([enr, st]) => {
        setEnrollments(enr.data?.data || []);
        setStats(st.data);
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
            እባክዎ ይግቡ
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            ግባ
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
          <p className="text-gray-500 dark:text-gray-400">በመጫን ላይ...</p>
        </div>
      </div>
    );

  const statsData = [
    {
      label: "የተመዘገቡ",
      value: stats?.overview?.totalEnrollments || 0,
      icon: statIcons[0],
    },
    {
      label: "ንቁ ኮርሶች",
      value: stats?.overview?.activeCourses || 0,
      icon: statIcons[1],
    },
    {
      label: "የተጠናቀቁ",
      value: stats?.overview?.completedCourses || 0,
      icon: statIcons[2],
    },
    {
      label: "የምስክር ወረቀት",
      value: stats?.overview?.certificatesCount || 0,
      icon: statIcons[3],
    },
    { label: "የተላከ ክፍያ", value: pendingCount, icon: statIcons[4] },
  ];

  return (
    <div className="min-h-screen bg-surface dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary-light to-secondary text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <motion.h1
            className="text-2xl sm:text-3xl font-bold"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            የእኔ ትምህርት
          </motion.h1>
          <motion.p
            className="text-white/70 text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            የእርስዎን እድገት ይከታተሉ
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        {/* Stats Cards */}
        {stats && (
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            {statsData.map((s, i) => (
              <StaggerItem key={i}>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-border-light dark:border-gray-700 hover:shadow-md transition-all group card-hover">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 mb-3 mx-auto group-hover:scale-110 transition-transform duration-300">
                    {s.icon(true)}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary dark:text-gray-100 text-center">
                    <AnimatedCounter to={s.value} duration={2000} />
                  </div>
                  <div className="text-xs text-text-muted dark:text-gray-400 text-center mt-1">
                    {s.label}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {/* Enrolled Courses */}
        <AnimatedSection direction="up">
          <h2 className="font-semibold text-lg mb-4 text-primary dark:text-gray-100 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-gradient-to-b from-primary to-secondary rounded-full inline-block" />
            የተመዘገብኩባቸው ኮርሶች
          </h2>
        </AnimatedSection>

        {enrollments.length === 0 ? (
          <motion.div
            className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-border-light dark:border-gray-700"
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
              እስካሁን ኮርስ አልተመዘገቡም
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-secondary to-accent text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              ኮርሶችን ይመልከቱ
            </Link>
          </motion.div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {enrollments.map((enr) => {
              const progress =
                enr.completionPercentage || enr.progressPercentage || 0;
              return (
                <StaggerItem key={enr.id}>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 border border-border-light dark:border-gray-700 card-hover group">
                    <Link
                      href={`/courses/${enr.course?.id || enr.courseId}`}
                      className="block"
                    >
                      <div className="h-36 bg-gradient-to-br from-primary via-primary-light to-secondary rounded-xl flex items-center justify-center mb-4 relative overflow-hidden">
                        <span className="text-white text-3xl font-bold relative z-10">
                          {enr.course?.title?.charAt(0) || "?"}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                      <h3 className="font-semibold text-sm mb-3 text-primary dark:text-gray-100 group-hover:text-secondary transition-colors line-clamp-1">
                        {enr.course?.title}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-3 mb-3">
                      <ProgressRing
                        percentage={progress}
                        size={48}
                        strokeWidth={4}
                      >
                        <span className="text-[10px] font-bold text-primary dark:text-gray-200">
                          {Math.round(progress)}%
                        </span>
                      </ProgressRing>
                      <div className="flex-1 min-w-0">
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-secondary to-accent h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-text-muted dark:text-gray-400 mt-1">
                          {Math.round(progress)}% ተጠናቋል
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
                        className="block w-full text-center bg-gradient-to-r from-secondary to-accent text-white text-sm py-2.5 rounded-xl font-medium hover:shadow-lg transition-all hover:brightness-110"
                      >
                        ቪዲዮ ይመልከቱ →
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
