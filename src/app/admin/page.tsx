"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t || "");
    if (!t) {
      setLoading(false);
      return;
    }
    fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => setAnalytics(d.data))
      .finally(() => setLoading(false));
  }, []);

  if (!token)
    return (
      <div className="text-center py-20">
        <Link
          href="/auth/login"
          className="bg-[#1B2A4A] text-white px-6 py-3 rounded-lg"
        >
          ግባ
        </Link>
      </div>
    );
  if (loading)
    return <div className="text-center py-20 text-gray-500">በመጫን ላይ...</div>;

  const sections = [
    {
      title: "ተጠቃሚዎች",
      items: [
        { label: "ጠቅላላ", value: analytics?.users?.total },
        { label: "ንቁ", value: analytics?.users?.active },
        { label: "አስተማሪዎች", value: analytics?.users?.instructors },
      ],
    },
    {
      title: "ኮርሶች",
      items: [
        { label: "ጠቅላላ", value: analytics?.courses?.total },
        { label: "የታተሙ", value: analytics?.courses?.published },
        { label: "ረቂቅ", value: analytics?.courses?.draft },
      ],
    },
    {
      title: "ክፍያ",
      items: [
        { label: "በመጠባበቅ ላይ", value: analytics?.payments?.pending },
        { label: "ጸድቋል", value: analytics?.payments?.approved },
        { label: "ተቀባይነት አላገኘም", value: analytics?.payments?.rejected },
      ],
    },
    {
      title: "ሌላ",
      items: [
        { label: "የምስክር ወረቀት", value: analytics?.certificates?.total },
        {
          label: "ገቢ",
          value: `${Number(analytics?.revenue?.total || 0).toLocaleString()} ብር`,
        },
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">አስተዳደር</h1>
          <p className="text-gray-500 text-sm">የመድረክ አስተዳደር ማዕከል</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/users"
            className="text-sm bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200"
          >
            👥 ተጠቃሚዎች
          </Link>
          <Link
            href="/admin/courses"
            className="text-sm bg-[#1B2A4A] text-white px-4 py-2 rounded-lg hover:bg-[#2C3E6B] transition-colors"
          >
            📚 ኮርሶች አስተዳደር
          </Link>
          <Link
            href="/admin/courses/new"
            className="text-sm bg-[#C9952A] text-white px-4 py-2 rounded-lg hover:bg-[#b8862a] transition-colors"
          >
            ➕ አዲስ ኮርስ
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((section, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-[#1B2A4A] mb-3">
              {section.title}
            </h3>
            <div className="space-y-2">
              {section.items.map((item, j) => (
                <div key={j} className="flex justify-between text-sm">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-semibold">{item.value ?? "-"}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      {analytics?.recentActivity && (
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-[#1B2A4A] mb-4">የቅርብ ጊዜ እንቅስቃሴ</h3>
          {analytics.recentActivity.users?.slice(0, 5).map((u: any) => (
            <div
              key={u.id}
              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
            >
              <div>
                <p className="text-sm font-medium">{u.fullName}</p>
                <p className="text-xs text-gray-400">{u.email}</p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
              >
                {u.isActive ? "ንቁ" : "ሰነፍ"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
