"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  const [enrolling, setEnrolling] = useState(false);
  const [token, setToken] = useState("");
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("token") || "";
    setToken(t);

    if (!t) {
      router.push(`/auth/register?redirect=/courses/${courseId}`);
      return;
    }

    fetch(`/api/courses/${courseId}`)
      .then((r) => r.json())
      .then((d) => setCourse(d.data))
      .finally(() => setLoading(false));

    setIsEnrolled(true);
  }, [courseId, router]);

  // Handle free enrollment or redirect to payment
  const handleEnroll = useCallback(() => {
    if (!token) {
      router.push(`/auth/register?redirect=/courses/${courseId}`);
      return;
    }
    if (!course) return;

    const firstLecture = course.lectures?.[0];
    if (firstLecture) {
      router.push(`/courses/${courseId}/lectures/${firstLecture.id}`);
    } else {
      router.push(`/courses/${courseId}`);
    }
  }, [token, course, courseId, router]);

  const levelLabels: Record<string, string> = {
    beginner: "ጀማሪ",
    intermediate: "መካከለኛ",
    advanced: "ከፍተኛ",
  };

  if (loading)
    return <div className="text-center text-gray-500 py-20">በመጫን ላይ...</div>;
  if (!course)
    return <div className="text-center text-gray-500 py-20">ኮርስ አልተገኘም</div>;

  const isLoggedIn = !!token;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#E0F7FA]">
        <div className="bg-gradient-to-br from-[#00BCD4] via-[#0097A7] to-[#FF1744] p-8 text-white">
          <span className="bg-white/20 backdrop-blur-sm text-xs px-3 py-1 rounded-full text-white font-medium">
            {levelLabels[course.level] || course.level}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-4 mb-2">
            {course.title}
          </h1>
          <p className="text-white/80 text-sm">{course.instructor?.fullName}</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-white/80">
            <span>{course.videoCount} ቪዲዮዎች</span>
            <span>{course.duration || 0} ደቂቃ</span>
            <span>{course.enrollmentCount} ተማሪዎች</span>
          </div>
          {/* CTA Button - changes based on enrollment & auth */}
          {isEnrolled ? (
            <Link
              href={
                course.lectures?.length > 0
                  ? `/courses/${courseId}/lectures/${course.lectures[0].id}`
                  : `/progress/${courseId}`
              }
              className="inline-block mt-4 bg-white text-[#00BCD4] px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              መማር ቀጥል → ቪዲዮ ይመልከቱ
            </Link>
          ) : (
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="bg-white text-[#FF1744] px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {enrolling
                  ? "በመመዝገብ ላይ..."
                  : isLoggedIn
                    ? "Start learning"
                    : "Register to take course"}
              </button>
              {!isLoggedIn && (
                <Link
                  href={`/auth/login?redirect=/courses/${courseId}`}
                  className="bg-white/20 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/30 transition-colors text-center"
                >
                  በመለያ ይግቡ
                </Link>
              )}
            </div>
          )}

          {/* Enrollment Error */}
          {enrollError && (
            <p className="mt-3 text-red-200 text-sm">{enrollError}</p>
          )}
        </div>

        <div className="p-6">
          <h2 className="font-semibold text-lg mb-3 text-[#0D3B4A]">ስለ ኮርሱ</h2>
          <p className="text-[#4A7278] text-sm leading-relaxed whitespace-pre-line">
            {course.description}
          </p>

          <h2 className="font-semibold text-lg mt-8 mb-4 text-[#0D3B4A]">
            ትምህርቶች ({course.lectures?.length || 0})
          </h2>
          <div className="space-y-2">
            {course.lectures?.map((lec, i) => (
              <div
                key={lec.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isEnrolled
                    ? "bg-gradient-to-r from-[#E0F7FA] to-[#FFF3E0] hover:from-[#B2EBF2] hover:to-[#FFECB3] cursor-pointer"
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
                      ? "bg-gradient-to-br from-[#00BCD4] to-[#FF1744] text-white"
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
                      isEnrolled ? "text-[#0D3B4A]" : "text-gray-400"
                    }`}
                  >
                    {lec.title}
                  </p>
                  <p className="text-xs text-[#4A7278]">
                    {lec.duration || 0} ደቂቃ
                  </p>
                </div>
                {isEnrolled ? (
                  <svg
                    className="w-4 h-4 text-[#00BCD4] flex-shrink-0"
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
              <div className="text-center py-8 text-[#4A7278] text-sm">
                ምንም ትምህርቶች የሉም
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
