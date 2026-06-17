"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface CourseInfo {
  id: string;
  title: string;
  coverImage: string;
  instructor: { fullName: string };
}

interface Enrollment {
  id: string;
  status: string;
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

export default function DashboardPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) return;
    setToken(t);
    Promise.all([
      fetch("/api/enrollments", {
        headers: { Authorization: `Bearer ${t}` },
      }).then((r) => r.json()),
      fetch("/api/enrollments/stats", {
        headers: { Authorization: `Bearer ${t}` },
      }).then((r) => r.json()),
    ])
      .then(([enr, st]) => {
        setEnrollments(enr.data?.data || []);
        setStats(st.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!token) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">እባክዎ ይግቡ</p>
        <Link
          href="/auth/login"
          className="bg-[#1B2A4A] text-white px-6 py-3 rounded-lg"
        >
          ግባ
        </Link>
      </div>
    );
  }

  if (loading)
    return <div className="text-center text-gray-500 py-20">በመጫን ላይ...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">የእኔ ትምህርት</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "የተመዘገቡ", value: stats.overview?.totalEnrollments || 0 },
            { label: "ንቁ ኮርሶች", value: stats.overview?.activeCourses || 0 },
            { label: "የተጠናቀቁ", value: stats.overview?.completedCourses || 0 },
            {
              label: "የምስክር ወረቀት",
              value: stats.overview?.certificatesCount || 0,
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-xl shadow-sm text-center"
            >
              <div className="text-2xl font-bold text-[#1B2A4A]">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Enrolled Courses */}
      <h2 className="font-semibold text-lg mb-4">የተመዘገብኩባቸው ኮርሶች</h2>
      {enrollments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500 mb-4">እስካሁን ኮርስ አልተመዘገቡም</p>
          <Link
            href="/courses"
            className="bg-[#C9952A] text-white px-6 py-3 rounded-lg"
          >
            ኮርሶችን ይመልከቱ
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrollments.map((enr) => (
            <div
              key={enr.id}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <Link
                href={`/courses/${enr.course?.id || enr.courseId}`}
                className="block"
              >
                <div className="h-32 bg-gradient-to-br from-[#1B2A4A] to-[#2C3E6B] rounded-lg flex items-center justify-center mb-3">
                  <span className="text-white text-2xl font-bold">
                    {enr.course?.title?.charAt(0) || "?"}
                  </span>
                </div>
                <h3 className="font-semibold text-sm mb-2">
                  {enr.course?.title}
                </h3>
              </Link>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                <div
                  className="bg-[#C9952A] h-2 rounded-full transition-all"
                  style={{
                    width: `${enr.completionPercentage || enr.progressPercentage || 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mb-3">
                {enr.completionPercentage || enr.progressPercentage || 0}% ተጠናቋል
              </p>
              {enr.status === "active" && (
                <Link
                  href={`/courses/${enr.course?.id || enr.courseId}`}
                  className="block w-full text-center bg-[#C9952A] text-white text-sm py-2 rounded-lg font-medium hover:bg-[#b8862a] transition-colors"
                >
                  ቪዲዮ ይመልከቱ →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
