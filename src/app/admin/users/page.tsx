"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
  isBanned: boolean;
  lastLogin: string | null;
  loginCount: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [token, setToken] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
    else setLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data?.data || []);
        setTotal(data.data?.total || 0);
      }
    } catch (err) {
      console.error("[ADMIN USERS] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (
    userId: string,
    action: string,
    value?: string,
  ) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, action, value }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || "Action failed");
      }
    } catch {
      alert("Failed to perform action");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Link
          href="/auth/login"
          className="bg-[#1B2A4A] text-white px-6 py-3 rounded-lg"
        >
          ግባ
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">ተጠቃሚዎች አስተዳደር</h1>
          <p className="text-sm text-gray-500">{total} ተጠቃሚዎች ተገኝተዋል</p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-[#1B2A4A]"
        >
          ← ወደ አስተዳደር ተመለስ
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="ተጠቃሚ ይፈልጉ..."
            className="flex-1 min-w-[200px] border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9952A]/30"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="border border-gray-200 rounded-lg p-2.5 text-sm"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">ሁሉም ሚና</option>
            <option value="user">ተጠቃሚ</option>
            <option value="instructor">አስተማሪ</option>
            <option value="admin">አስተዳዳሪ</option>
          </select>
          <select
            className="border border-gray-200 rounded-lg p-2.5 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">ሁሉም ሁኔታ</option>
            <option value="active">ንቁ</option>
            <option value="banned">ታግዷል</option>
            <option value="inactive">እንቅስቃሴ የለም</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">በመጫን ላይ...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-500">ተጠቃሚ አልተገኘም</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left p-3 font-medium text-gray-500">
                    ተጠቃሚ
                  </th>
                  <th className="text-left p-3 font-medium text-gray-500">
                    ኢሜይል
                  </th>
                  <th className="text-left p-3 font-medium text-gray-500">
                    ሚና
                  </th>
                  <th className="text-left p-3 font-medium text-gray-500">
                    ሁኔታ
                  </th>
                  <th className="text-left p-3 font-medium text-gray-500">
                    መግቢያ
                  </th>
                  <th className="text-left p-3 font-medium text-gray-500">
                    ድርጊት
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1B2A4A] to-[#2C3E6B] flex items-center justify-center text-white text-xs font-bold">
                          {user.fullName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {user.fullName}
                          </p>
                          <p className="text-xs text-gray-400">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-gray-500">{user.email}</td>
                    <td className="p-3">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleAction(user.id, "changeRole", e.target.value)
                        }
                        className={`text-xs px-2 py-1 rounded-full border ${
                          user.role === "admin"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : user.role === "instructor"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        <option value="user">ተጠቃሚ</option>
                        <option value="instructor">አስተማሪ</option>
                        <option value="admin">አስተዳዳሪ</option>
                      </select>
                    </td>
                    <td className="p-3">
                      {user.isBanned ? (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                          ታግዷል
                        </span>
                      ) : user.isActive ? (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                          ንቁ
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                          እንቅስቃሴ የለም
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-400">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : "በፍጹም"}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {user.isBanned ? (
                          <button
                            onClick={() => handleAction(user.id, "unban")}
                            className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded hover:bg-green-200"
                          >
                            ክልክል አንሳ
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(user.id, "ban")}
                            className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200"
                          >
                            ከልክል
                          </button>
                        )}
                        {!user.isActive && !user.isBanned && (
                          <button
                            onClick={() => handleAction(user.id, "activate")}
                            className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded hover:bg-green-200"
                          >
                            አንቃ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-sm text-gray-500 hover:text-[#1B2A4A] disabled:opacity-30"
            >
              ← ቀዳሚ
            </button>
            <span className="text-sm text-gray-400">ገጽ {page}</span>
            <button
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
              className="text-sm text-gray-500 hover:text-[#1B2A4A] disabled:opacity-30"
            >
              ቀጣይ →
            </button>
          </div>
        </div>
      )}

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <Link
          href="/admin/courses"
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-[#1B2A4A] mb-1">ኮርሶች አስተዳደር</h3>
          <p className="text-sm text-gray-400">ኮርሶችን ይፍጠሩ፣ ያስተካክሉ እና ያትሙ</p>
        </Link>
        <Link
          href="/admin"
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-[#1B2A4A] mb-1">ዳሽቦርድ</h3>
          <p className="text-sm text-gray-400">የመድረክ አጠቃላይ እይታ</p>
        </Link>
      </div>
    </div>
  );
}
