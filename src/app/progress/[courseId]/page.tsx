"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedAuthFetchJson } from "@/lib/utils/cache";
import { formatDuration } from "@/lib/utils/common";
import { ProgressRing } from "@/components/ProgressRing";
import { ConfettiEffect } from "@/components/ConfettiEffect";
import {
  AnimatedSection,
  StaggerContainer,
  StaggerItem,
} from "@/components/AnimatedSection";

interface Lecture {
  id: string;
  title: string;
  duration: number;
  orderIndex: number;
  progress: { isCompleted: boolean; watchPercentage: number };
}

interface CourseProgress {
  enrollment: any;
  stats: {
    completedLectures: number;
    totalLectures: number;
    progressPercentage: number;
    totalWatchTime: number;
  };
  lectures: Lecture[];
  nextLecture: { id: string; title: string } | null;
}

export default function ProgressPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [data, setData] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token") || "";
    setToken(t);
    if (!t) {
      setLoading(false);
      return;
    }

    cachedAuthFetchJson(`/api/progress/${courseId}`, { method: "GET" }, 15_000)
      .then((result) => {
        if (result.response.ok) {
          const d = result.data.data;
          setData(d);
          if (d?.stats?.progressPercentage >= 100) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4000);
          }
        }
      })
      .catch((err) => console.error("Failed to load progress", err))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (!token)
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-gray-500 dark:text-gray-400 mb-4">እባክዎ ይግቡ</p>
          <Link
            href="/auth/login"
            className="bg-primary text-white px-6 py-3 rounded-lg"
          >
            ግባ
          </Link>
        </motion.div>
      </div>
    );
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
  if (!data)
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-400">
        መረጃ አልተገኘም
      </div>
    );

  const isComplete = data.stats.progressPercentage >= 100;

  return (
    <>
      <ConfettiEffect active={showConfetti} duration={4000} />
      <div className="min-h-screen bg-[#0a0604]">
        {/* Header */}
        <div className="bg-[#0a0604] text-white relative overflow-hidden">\n        <div className=\"absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#a30000]/8 rounded-full blur-[80px] pointer-events-none\" />
          <div className="max-w-4xl mx-auto px-4 py-8">
            <motion.h1
              className="text-2xl font-bold"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              የእኔ እድገት
            </motion.h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-6 relative z-10">
          {/* Progress Overview */}
          <AnimatedSection direction="up">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-border-light dark:border-gray-700 mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                {/* Radial progress */}
                <div className="relative">
                  <ProgressRing
                    percentage={data.stats.progressPercentage}
                    size={120}
                    strokeWidth={10}
                    color={isComplete ? "#22c55e" : "#a30000"}
                  >
                    <div className="text-center">
                      <span
                        className={`text-2xl font-bold ${isComplete ? "text-green-500" : "text-primary dark:text-gray-100"}`}
                      >
                        {Math.round(data.stats.progressPercentage)}%
                      </span>
                    </div>
                  </ProgressRing>
                  {isComplete && (
                    <motion.span
                      className="absolute -top-1 -right-1 text-2xl"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 10,
                      }}
                    >
                      🎉
                    </motion.span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                  <div className="text-center sm:text-left">
                    <div className="text-2xl font-bold text-primary dark:text-gray-100">
                      {data.stats.completedLectures}/{data.stats.totalLectures}
                    </div>
                    <div className="text-xs text-text-muted dark:text-gray-400 mt-1">
                      ትምህርቶች ተጠናቀዋል
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-2xl font-bold text-primary dark:text-gray-100">
                      {Math.floor(data.stats.totalWatchTime / 60)}
                    </div>
                    <div className="text-xs text-text-muted dark:text-gray-400 mt-1">
                      ደቂቃዎች ተመልክተዋል
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-2xl font-bold text-primary dark:text-gray-100">
                      {data.stats.totalLectures - data.stats.completedLectures}
                    </div>
                    <div className="text-xs text-text-muted dark:text-gray-400 mt-1">
                      የቀሩ ትምህርቶች
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-2xl font-bold text-primary dark:text-gray-100">
                      {
                        data.lectures.filter(
                          (l) => l.progress.watchPercentage > 0,
                        ).length
                      }
                    </div>
                    <div className="text-xs text-text-muted dark:text-gray-400 mt-1">
                      የተከፈቱ ትምህርቶች
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Next Lecture CTA */}
          {data.nextLecture && !isComplete && (
            <AnimatedSection direction="up" delay={0.1}>
              <Link
                href={`/courses/${courseId}/lectures/${data.nextLecture.id}`}
                className="group block bg-gradient-to-r from-primary to-primary-light text-white rounded-xl p-5 mb-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60 mb-1">ቀጣይ ትምህርት</p>
                    <p className="font-semibold">{data.nextLecture.title}</p>
                  </div>
                  <motion.span
                    className="bg-secondary px-5 py-2.5 rounded-lg text-sm font-medium group-hover:brightness-110 transition-all inline-flex items-center gap-2"
                    whileHover={{ x: 4 }}
                  >
                    ቀጥል
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
                  </motion.span>
                </div>
              </Link>
            </AnimatedSection>
          )}

          {/* Course Completed */}
          {isComplete && (
            <AnimatedSection direction="scale" delay={0.2}>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 mb-6 text-center">
                <motion.div
                  className="text-5xl mb-4"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 150, damping: 12 }}
                >
                  🎉
                </motion.div>
                <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                  ኮርሱን አጠናቀዋል!
                </h2>
                <p className="text-green-600 dark:text-green-500 mb-6">
                  እንኳን ደስ ያለዎ! የምስክር ወረቀትዎን ያግኙ
                </p>
                <Link
                  href={`/certificates/${courseId}`}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
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
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                  የምስክር ወረቀት ያግኙ
                </Link>
              </div>
            </AnimatedSection>
          )}

          {/* Lecture List */}
          <AnimatedSection direction="up" delay={0.2}>
            <h2 className="font-semibold text-lg mb-4 text-primary dark:text-gray-100 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-primary to-secondary rounded-full inline-block" />
              የትምህርት ዝርዝር
            </h2>
          </AnimatedSection>

          <StaggerContainer className="space-y-2 pb-8">
            {data.lectures.map((lec, i) => (
              <StaggerItem key={lec.id}>
                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-border-light dark:border-gray-700 hover:shadow-md transition-all card-hover">
                  <motion.div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                      lec.progress.isCompleted
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : lec.progress.watchPercentage > 0
                          ? "bg-secondary/20 text-secondary"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                    whileHover={{ scale: 1.1 }}
                  >
                    {lec.progress.isCompleted ? (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium text-sm ${
                        lec.progress.isCompleted
                          ? "text-green-700 dark:text-green-400"
                          : "text-primary dark:text-gray-100"
                      }`}
                    >
                      {lec.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-text-muted dark:text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
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
                        {formatDuration(lec.duration)}
                      </span>
                      {lec.progress.watchPercentage > 0 && (
                        <span>{lec.progress.watchPercentage}% ተመልክቷል</span>
                      )}
                    </div>
                  </div>
                  {lec.progress.isCompleted ? (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                      ተጠናቋል
                    </span>
                  ) : (
                    <Link
                      href={`/courses/${courseId}/lectures/${lec.id}`}
                      className="text-xs font-medium text-secondary hover:text-accent transition-colors shrink-0"
                    >
                      ቀጥል →
                    </Link>
                  )}
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </>
  );
}
