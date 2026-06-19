"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import {
  validateSearchQuery,
  sanitizeInput,
} from "@/lib/validators/form-validation";

// ============================================
// Types
// ============================================

interface Course {
  id: string;
  title: string;
  price: string;
  level: string;
  category: string | null;
  isPublished: boolean;
  isArchived: boolean;
  videoCount: number;
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
  instructor: {
    id: string;
    fullName: string;
    email: string;
  };
  _count: {
    lectures: number;
    enrollments: number;
  };
}

interface PaginatedResponse {
  success: boolean;
  data: {
    items: Course[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================
// Stats Card Component
// ============================================

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ============================================
// Main Admin Courses Page
// ============================================

export default function AdminCoursesPage() {
  const router = useRouter();

  // State
  const [token, setToken] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
  });

  // ============================================
  // Auth Check
  // ============================================

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/auth/login");
      return;
    }
    setToken(t);
  }, [router]);

  // ============================================
  // Fetch Courses
  // ============================================

  const fetchCourses = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const result = await authFetchJson(`/api/admin/courses?${params}`, {
        method: "GET",
      });
      const data: PaginatedResponse = result.data;

      if (result.response.ok && data.success) {
        setCourses(data.data.items);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);

        // Also fetch all for stats
        const allResult = await authFetchJson(`/api/admin/courses?limit=1`, {
          method: "GET",
        });
        const allData = allResult.data;
        if (allResult.response.ok && allData.success) {
          setStats({
            total: allData.data.total,
            published: 0,
            draft: 0,
            archived: 0,
          });
        }
      }
    } catch (err) {
      console.error("[ADMIN COURSES] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, statusFilter]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Also fetch stats breakdown
  useEffect(() => {
    if (!token) return;
    const fetchStats = async () => {
      try {
        const [pub, draft, arch] = await Promise.all([
          authFetchJson(`/api/admin/courses?status=published&limit=1`, {
            method: "GET",
          }).then((result) => result.data),
          authFetchJson(`/api/admin/courses?status=draft&limit=1`, {
            method: "GET",
          }).then((result) => result.data),
          authFetchJson(`/api/admin/courses?status=archived&limit=1`, {
            method: "GET",
          }).then((result) => result.data),
        ]);
        setStats({
          total: stats.total || 0,
          published: pub.data?.total || 0,
          draft: draft.data?.total || 0,
          archived: arch.data?.total || 0,
        });
      } catch (err) {
        console.error("[ADMIN COURSES] Stats fetch error:", err);
      }
    };
    fetchStats();
  }, [token]);

  // ============================================
  // Actions
  // ============================================

  const handleAction = async (
    courseId: string,
    action: "publish" | "unpublish" | "archive" | "restore",
  ) => {
    try {
      const result = await authFetchJson("/api/admin/courses", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId, action }),
      });
      const data = result.data;
      if (result.response.ok && data.success) {
        fetchCourses();
      }
    } catch (err) {
      console.error("[ADMIN COURSES] Action error:", err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSearchQuery(searchInput);
    if (!validation.valid) {
      return;
    }
    setSearch(sanitizeInput(searchInput.trim()));
    setPage(1);
  };

  // ============================================
  // Helpers
  // ============================================

  const levelLabels: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  };

  const statusBadge = (course: Course) => {
    if (course.isArchived)
      return (
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          Archived
        </span>
      );
    if (course.isPublished)
      return (
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          Published
        </span>
      );
    return (
      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
        Draft
      </span>
    );
  };

  // ============================================
  // Render
  // ============================================

  if (!token) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-gray-400 hover:text-gray-600 transition-colors"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00BCD4] to-[#FF1744] bg-clip-text text-transparent">
              Course Management
            </h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Manage, publish and monitor all courses
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-[#00BCD4] transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total"
          value={stats.total || total}
          color="text-[#0D3B4A]"
        />
        <StatCard
          label="Published"
          value={stats.published}
          color="text-green-600"
        />
        <StatCard label="Draft" value={stats.draft} color="text-amber-600" />
        <StatCard
          label="Archived"
          value={stats.archived}
          color="text-gray-600"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title or category..."
                className="w-full pl-9 pr-3 py-2 border-2 border-[#E0F7FA] rounded-lg text-sm focus:ring-2 focus:ring-[#00BCD4]/30 focus:border-[#00BCD4] outline-none bg-[#F0FEFF]"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-[#00BCD4] to-[#FF1744] text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
            >
              Search
            </button>
          </form>

          {/* Status Filter */}
          <div className="flex gap-1.5">
            {[
              { value: "all", label: "All" },
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? "bg-gradient-to-r from-[#00BCD4] to-[#FF1744] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-[#00BCD4] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <p className="text-gray-500 text-sm">No courses found</p>
          </div>
        ) : (
          <>
            {/* Table Header - Desktop */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-4">Course</div>
              <div className="col-span-2">Instructor</div>
              <div className="col-span-1 text-center">Level</div>
              <div className="col-span-1 text-center">Lectures</div>
              <div className="col-span-1 text-center">Students</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Table Rows */}
            {courses.map((course) => (
              <div
                key={course.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-6 py-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors items-center"
              >
                {/* Course Info */}
                <div className="md:col-span-4">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="font-medium text-sm text-[#0D3B4A] hover:text-[#00BCD4] transition-colors line-clamp-1"
                  >
                    {course.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      {Number(course.price).toLocaleString()} ETB
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-400">
                      {course.category || "Other"}
                    </span>
                  </div>
                  {/* Mobile status */}
                  <div className="md:hidden mt-2">{statusBadge(course)}</div>
                </div>

                {/* Instructor */}
                <div className="hidden md:block md:col-span-2">
                  <p className="text-sm text-gray-700 truncate">
                    {course.instructor?.fullName || "N/A"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {course.instructor?.email || ""}
                  </p>
                </div>

                {/* Level */}
                <div className="hidden md:block md:col-span-1 text-center">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {levelLabels[course.level] || course.level}
                  </span>
                </div>

                {/* Lectures */}
                <div className="hidden md:block md:col-span-1 text-center">
                  <span className="text-sm text-gray-700">
                    {course._count?.lectures || 0}
                  </span>
                </div>

                {/* Students */}
                <div className="hidden md:block md:col-span-1 text-center">
                  <span className="text-sm text-gray-700">
                    {course._count?.enrollments || 0}
                  </span>
                </div>

                {/* Status Badge - Desktop */}
                <div className="hidden md:block md:col-span-1 text-center">
                  {statusBadge(course)}
                </div>

                {/* Actions */}
                <div className="md:col-span-2 flex justify-end gap-1.5">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="p-1.5 text-gray-400 hover:text-[#FF1744] transition-colors"
                    title="Manage"
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
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </Link>

                  {course.isArchived ? (
                    <button
                      onClick={() => handleAction(course.id, "restore")}
                      className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                      title="Restore"
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
                    </button>
                  ) : course.isPublished ? (
                    <button
                      onClick={() => handleAction(course.id, "unpublish")}
                      className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
                      title="Unpublish"
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
                          d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(course.id, "publish")}
                      className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                      title="Publish"
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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                  )}

                  {!course.isArchived && (
                    <button
                      onClick={() => handleAction(course.id, "archive")}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="Archive"
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
                          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Total {total} courses • Page {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
