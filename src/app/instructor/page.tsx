"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedAuthFetchJson } from "@/lib/utils/cache";

// ============================================
// Types
// ============================================

interface InstructorCourse {
  id: string;
  title: string;
  description: string;
  price: string;
  level: string;
  category: string | null;
  isPublished: boolean;
  isArchived: boolean;
  videoCount: number;
  enrollmentCount: number;
  duration: number | null;
  coverImage: string;
  createdAt: string;
  updatedAt: string;
}

interface CourseStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  totalVideos: number;
}

// ============================================
// Helper
// ============================================

const levelLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ============================================
// Component
// ============================================

export default function InstructorDashboard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [userName, setUserName] = useState("");
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (!t) {
      router.push("/auth/login");
      return;
    }
    setToken(t);
    try {
      const p = JSON.parse(u || "{}");
      setUserName(p.fullName || "Instructor");
    } catch {}
  }, [router]);

  const fetchCourses = useCallback(async () => {
    if (!token) return;
    try {
      const result = await cachedAuthFetchJson(
        "/api/instructor/courses",
        { method: "GET" },
        15_000,
      );
      if (result.response.ok && result.data.success) {
        setCourses(result.data.data?.data || []);
      }
    } catch (err) {
      console.error("[INSTRUCTOR] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Compute stats
  const stats: CourseStats = {
    totalCourses: courses.length,
    publishedCourses: courses.filter((c) => c.isPublished && !c.isArchived)
      .length,
    draftCourses: courses.filter((c) => !c.isPublished && !c.isArchived).length,
    totalEnrollments: courses.reduce(
      (sum, c) => sum + (c.enrollmentCount || 0),
      0,
    ),
    totalVideos: courses.reduce((sum, c) => sum + (c.videoCount || 0), 0),
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-[#0a0604] dark:bg-gray-900">
      {/* Header */}
      <div className="bg-[#0a0604] text-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#a30000]/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                👨‍🏫 Instructor Dashboard
              </h1>
              <p className="text-white/70 text-sm mt-1">
                Welcome back, {userName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/courses/new"
                className="text-sm bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-[#a30000]/25 hover:-translate-y-0.5 transition-all duration-300 font-medium"
              >
                ➕ New Course
              </Link>
              <Link
                href="/dashboard"
                className="text-sm bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all"
              >
                📊 My Learning
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Courses",
              value: stats.totalCourses,
              color: "text-primary",
              icon: "📚",
            },
            {
              label: "Published",
              value: stats.publishedCourses,
              color: "text-green-600",
              icon: "✅",
            },
            {
              label: "Drafts",
              value: stats.draftCourses,
              color: "text-amber-600",
              icon: "📝",
            },
            {
              label: "Total Students",
              value: stats.totalEnrollments,
              color: "text-secondary",
              icon: "👥",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{stat.icon}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color} text-white/90`}>
                {stat.value}
              </p>
              <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* My Courses */}
        {!loading && (
          <div className="bg-surface rounded-2xl shadow-sm border border-surface/50 overflow-hidden mb-8">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-primary flex items-center gap-2">
                📖 My Courses
                <span className="text-xs font-normal text-white/50">
                  ({courses.length})
                </span>
              </h2>
              <Link
                href="/admin/courses/new"
                className="text-xs text-secondary hover:underline font-medium"
              >
                + Create New
              </Link>
            </div>

            {courses.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📚</span>
                </div>
                <p className="text-white/60 font-medium mb-1">No courses yet</p>
                <p className="text-xs text-white/50 mb-4">
                  Create your first course to get started
                </p>
                <Link
                  href="/admin/courses/new"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white px-5 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#a30000]/25 hover:-translate-y-0.5 transition-all duration-300"
                >
                  ➕ Create Course
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {courses
                  .sort(
                    (a, b) =>
                      new Date(b.updatedAt).getTime() -
                      new Date(a.updatedAt).getTime(),
                  )
                  .map((course, i) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Thumbnail */}
                        <div className="w-16 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex-shrink-0 overflow-hidden">
                          {course.coverImage ? (
                            <img
                              src={course.coverImage}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                              {course.title.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white/90 truncate">
                              {course.title}
                            </h3>
                            {course.isPublished ? (
                              <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                Published
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                Draft
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                            <span>
                              {levelLabels[course.level] || course.level}
                            </span>
                            <span>•</span>
                            <span>{course.videoCount} videos</span>
                            <span>•</span>
                            <span>{course.enrollmentCount} students</span>
                            <span>•</span>
                            <span>
                              {Number(course.price).toLocaleString()} ETB
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Link
                            href={`/admin/courses/${course.id}`}
                            className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                          >
                            Manage
                          </Link>
                          <Link
                            href={`/courses/${course.id}`}
                            target="_blank"
                            className="p-1.5 text-white/40 hover:text-primary rounded-lg hover:bg-white/10 transition-colors"
                            title="View public page"
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
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Stats Row */}
        {!loading && courses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-surface rounded-xl p-5 shadow-sm border border-surface/50">
              <h3 className="font-semibold text-sm text-primary mb-3">
                📹 Video Content
              </h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {stats.totalVideos}
              </p>
              <p className="text-xs text-gray-400">
                Total videos across all courses
              </p>
            </div>
            <div className="bg-surface rounded-xl p-5 shadow-sm border border-surface/50">
              <h3 className="font-semibold text-sm text-primary mb-3">
                📈 Engagement
              </h3>
              <p className="text-2xl font-bold text-white/90">
                {courses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0)}
              </p>
              <p className="text-xs text-white/50">Total student enrollments</p>
            </div>
            <div className="bg-surface rounded-xl p-5 shadow-sm border border-surface/50">
              <h3 className="font-semibold text-sm text-primary mb-3">
                💰 Revenue
              </h3>
              <p className="text-2xl font-bold text-secondary">
                {courses
                  .reduce(
                    (sum, c) =>
                      sum + Number(c.price) * (c.enrollmentCount || 0),
                    0,
                  )
                  .toLocaleString()}{" "}
                ETB
              </p>
              <p className="text-xs text-white/50">Estimated total revenue</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
