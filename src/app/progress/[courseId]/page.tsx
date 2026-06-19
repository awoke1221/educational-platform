"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { authFetchJson } from "@/lib/utils/auth-fetch";

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

  useEffect(() => {
    const t = localStorage.getItem("token") || "";
    setToken(t);
    if (!t) {
      setLoading(false);
      return;
    }

    authFetchJson(`/api/progress/${courseId}`, {
      method: "GET",
    })
      .then((result) => {
        if (result.response.ok) {
          setData(result.data.data);
        }
      })
      .catch((err) => console.error("Failed to load progress", err))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (!token)
    return <div className="text-center py-20 text-gray-500">እባክዎ ይግቡ</div>;
  if (loading)
    return <div className="text-center py-20 text-gray-500">በመጫን ላይ...</div>;
  if (!data)
    return <div className="text-center py-20 text-gray-500">መረጃ አልተገኘም</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-[#1B2A4A]">የእኔ እድገት</h1>
          <span className="text-sm text-gray-500">
            {data.stats.completedLectures}/{data.stats.totalLectures} ተጠናቋል
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 mb-2">
          <div
            className="bg-[#C9952A] h-4 rounded-full transition-all duration-500"
            style={{ width: `${data.stats.progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{data.stats.progressPercentage}% ተጠናቋል</span>
          <span>ድምር {Math.floor(data.stats.totalWatchTime / 60)} ደቂቃ</span>
        </div>
      </div>

      {/* Next Lecture CTA */}
      {data.nextLecture && data.stats.progressPercentage < 100 && (
        <Link
          href={`/courses/${courseId}/lectures/${data.nextLecture.id}`}
          className="bg-[#1B2A4A] text-white rounded-xl p-4 mb-6 flex items-center justify-between hover:bg-[#2C3E6B] transition-colors group"
        >
          <div>
            <p className="text-xs text-gray-300">ቀጣይ ትምህርት</p>
            <p className="font-semibold">{data.nextLecture.title}</p>
          </div>
          <span className="bg-[#C9952A] px-4 py-2 rounded-lg text-sm font-medium group-hover:bg-[#b8862a] transition-colors">
            ቀጥል →
          </span>
        </Link>
      )}

      {/* Course Completed */}
      {data.stats.progressPercentage >= 100 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
          <div className="text-3xl mb-2">🎉</div>
          <h2 className="font-bold text-green-700 mb-1">ኮርሱን አጠናቀዋል!</h2>
          <p className="text-sm text-green-600">
            እንኳን ደስ ያለዎ! የምስክር ወረቀትዎን ያግኙ
          </p>
        </div>
      )}

      {/* Lecture List */}
      <div className="space-y-2">
        {data.lectures.map((lec, i) => (
          <div
            key={lec.id}
            className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                lec.progress.isCompleted
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {lec.progress.isCompleted ? "✓" : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium text-sm ${lec.progress.isCompleted ? "text-green-700" : ""}`}
              >
                {lec.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{lec.duration || 0} ደቂቃ</span>
                {lec.progress.watchPercentage > 0 && (
                  <span>{lec.progress.watchPercentage}% ተመልክቷል</span>
                )}
              </div>
            </div>
            {lec.progress.isCompleted && (
              <span className="text-green-500 text-sm">ተጠናቋል</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
