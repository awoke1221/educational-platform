"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedAuthFetchJson } from "@/lib/utils/cache";
import { handleAuthError } from "@/lib/utils/auth-error";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import {
  AnimatedSection,
  StaggerContainer,
  StaggerItem,
} from "@/components/AnimatedSection";

const COLORS = [
  "#c9952a",
  "#1b2a4a",
  "#d4a843",
  "#2c3e6b",
  "#22c55e",
  "#ef4444",
];

export default function AdminPage() {
  const router = useRouter();
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

    cachedAuthFetchJson("/api/admin/analytics", { method: "GET" }, 15_000)
      .then((result) => {
        // Handle authentication errors
        if (result.response.status === 401 || result.response.status === 403) {
          handleAuthError(result.response.status, router);
          return;
        }
        if (result.response.ok) {
          setAnalytics(result.data.data);
        }
      })
      .catch((err) => console.error("Failed to load admin analytics", err))
      .finally(() => setLoading(false));
  }, [router]);

  if (!token)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            href="/auth/login"
            className="bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all inline-flex items-center gap-2"
          >
            Login
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
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-primary/20 border-t-secondary rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );

  const sections = [
    {
      title: "Users",
      icon: "👥",
      items: [
        {
          label: "Total",
          value: analytics?.users?.total,
          color: "text-primary",
        },
        {
          label: "Active",
          value: analytics?.users?.active,
          color: "text-green-600",
        },
        {
          label: "Instructors",
          value: analytics?.users?.instructors,
          color: "text-secondary",
        },
      ],
      chartData: analytics?.users
        ? [
            { name: "Active", value: analytics.users.active || 0 },
            {
              name: "Inactive",
              value:
                (analytics.users.total || 0) - (analytics.users.active || 0),
            },
          ]
        : [],
    },
    {
      title: "Courses",
      icon: "📚",
      items: [
        {
          label: "Total",
          value: analytics?.courses?.total,
          color: "text-primary",
        },
        {
          label: "Published",
          value: analytics?.courses?.published,
          color: "text-green-600",
        },
        {
          label: "Draft",
          value: analytics?.courses?.draft,
          color: "text-amber-600",
        },
      ],
      chartData: analytics?.courses
        ? [
            { name: "Published", value: analytics.courses.published || 0 },
            { name: "Draft", value: analytics.courses.draft || 0 },
          ]
        : [],
    },
    {
      title: "Payments",
      icon: "💰",
      items: [
        {
          label: "Pending",
          value: analytics?.payments?.pending,
          color: "text-amber-600",
        },
        {
          label: "Approved",
          value: analytics?.payments?.approved,
          color: "text-green-600",
        },
        {
          label: "Rejected",
          value: analytics?.payments?.rejected,
          color: "text-red-600",
        },
      ],
      chartData: analytics?.payments
        ? [
            { name: "Pending", value: analytics.payments.pending || 0 },
            { name: "Approved", value: analytics.payments.approved || 0 },
            { name: "Rejected", value: analytics.payments.rejected || 0 },
          ]
        : [],
    },
    {
      title: "Revenue",
      icon: "📊",
      items: [
        {
          label: "Total Revenue",
          value: `${Number(analytics?.revenue?.total || 0).toLocaleString()} ETB`,
          color: "text-secondary",
        },
        {
          label: "Certificates",
          value: analytics?.certificates?.total || 0,
          color: "text-primary",
        },
      ],
      chartData: analytics?.revenue?.monthly
        ? analytics.revenue.monthly.map((m: any) => ({
            name: m.month?.slice(0, 3) || m.month,
            revenue: m.amount || m.revenue || 0,
          }))
        : [],
    },
  ];

  return (
    <div className="min-h-screen bg-surface dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary-light to-secondary text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <motion.div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Admin Dashboard
              </h1>
              <p className="text-white/70 text-sm mt-1">
                Platform Administration Center
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/users"
                className="text-sm bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all"
              >
                👥 Users
              </Link>
              <Link
                href="/admin/registrations"
                className="text-sm bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all"
              >
                📝 Pending Registrations
              </Link>
              <Link
                href="/admin/courses"
                className="text-sm bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all"
              >
                📚 Courses
              </Link>
              <Link
                href="/admin/courses/new"
                className="text-sm bg-secondary text-white px-4 py-2 rounded-lg hover:brightness-110 transition-all"
              >
                ➕ New Course
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        {/* Quick Actions */}
        <AnimatedSection direction="up" delay={0.1} className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border-light dark:border-gray-700">
            <h3 className="font-semibold text-primary dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>⚡</span> Quick Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Link
                href="/admin/courses/new"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 hover:border-secondary/50 hover:shadow-md transition-all group"
              >
                <span className="text-2xl">📚</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-secondary transition-colors">
                  New Course
                </span>
              </Link>
              <Link
                href="/admin/courses"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <span className="text-2xl">📖</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                  All Courses
                </span>
              </Link>
              <Link
                href="/admin/users"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 hover:border-purple-300 hover:shadow-md transition-all group"
              >
                <span className="text-2xl">👥</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-purple-600 transition-colors">
                  Users
                </span>
              </Link>
              <Link
                href="/admin/registrations"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 hover:border-amber-300 hover:shadow-md transition-all group"
              >
                <span className="text-2xl">📝</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-amber-600 transition-colors">
                  Registrations
                </span>
              </Link>
              <Link
                href="/admin/courses"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 hover:border-green-300 hover:shadow-md transition-all group"
              >
                <span className="text-2xl">📊</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-green-600 transition-colors">
                  Analytics
                </span>
              </Link>
            </div>

            {/* Bunny.net Management */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span>🐰</span> Bunny.net CDN & Storage
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <a
                  href="https://dash.bunny.net/storage/1605341"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 hover:border-orange-300 hover:shadow-sm transition-all group text-sm"
                >
                  <span>🗄️</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-orange-600">
                    Storage Zone
                  </span>
                </a>
                <a
                  href="https://dash.bunny.net/cdn/6042330"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 hover:border-orange-300 hover:shadow-sm transition-all group text-sm"
                >
                  <span>⚡</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-orange-600">
                    Pull Zone
                  </span>
                </a>
                <Link
                  href="/api/bunny/health"
                  target="_blank"
                  className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 hover:border-orange-300 hover:shadow-sm transition-all group text-sm"
                >
                  <span>🩺</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-orange-600">
                    Health Check
                  </span>
                </Link>
                <Link
                  href="/api/bunny/statistics"
                  target="_blank"
                  className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 hover:border-orange-300 hover:shadow-sm transition-all group text-sm"
                >
                  <span>📈</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-orange-600">
                    Statistics
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Overview Cards */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {sections.map((section, i) => (
            <StaggerItem key={i}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border-light dark:border-gray-700 card-hover">
                <h3 className="font-semibold text-primary dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span>{section.icon}</span>
                  {section.title}
                </h3>
                <div className="space-y-2 mb-4">
                  {section.items.map((item, j) => (
                    <div key={j} className="flex justify-between text-sm">
                      <span className="text-text-muted dark:text-gray-400">
                        {item.label}
                      </span>
                      <span
                        className={`font-semibold ${item.color} dark:text-gray-200`}
                      >
                        {typeof item.value === "number" ? (
                          <AnimatedCounter to={item.value} duration={1500} />
                        ) : (
                          (item.value ?? "-")
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Mini chart */}
                {section.chartData.length > 0 && (
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      {section.title === "Revenue" ? (
                        <BarChart data={section.chartData}>
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 8,
                              border: "1px solid #e8ecf4",
                              fontSize: 12,
                            }}
                          />
                          <Bar
                            dataKey="revenue"
                            fill="#c9952a"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={section.chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={35}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {section.chartData.map((_: any, idx: number) => (
                              <Cell
                                key={idx}
                                fill={COLORS[idx % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: 8,
                              border: "1px solid #e8ecf4",
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Recent Activity */}
        {analytics?.recentActivity && (
          <AnimatedSection direction="up" delay={0.3}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border-light dark:border-gray-700 mb-8">
              <h3 className="font-semibold text-primary dark:text-gray-100 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-gradient-to-b from-primary to-secondary rounded-full inline-block" />
                Recent Activity
              </h3>
              {analytics.recentActivity.users
                ?.slice(0, 5)
                .map((u: any, idx: number) => (
                  <motion.div
                    key={u.id}
                    className="flex items-center justify-between py-3 border-b border-border-light dark:border-gray-700 last:border-0"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                        {u.fullName?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary dark:text-gray-100">
                          {u.fullName}
                        </p>
                        <p className="text-xs text-text-muted dark:text-gray-400">
                          {u.email}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        u.isActive
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </motion.div>
                ))}
            </div>
          </AnimatedSection>
        )}
      </div>
    </div>
  );
}
