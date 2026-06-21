// src/app/api/admin/analytics/route.ts
// Admin Dashboard Analytics API

import { NextRequest } from "next/server";
import { verifyAuth, requireRole } from "@/lib/auth/middleware";
import { supabaseAdmin  } from "@/lib/db/supabaseAdmin";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

// Helper: get count from supabase with optional filter
async function countTable(
  table: string,
  filter?: Record<string, any>,
): Promise<number> {
  let query = supabaseAdmin!
    .from(table)
    .select("*", { count: "exact", head: true });
  if (filter) {
    for (const [k, v] of Object.entries(filter)) {
      if (k === "gte") query = query.gte("createdAt", v);
      else query = query.eq(k, v);
    }
  }
  const { count, error } = await query;
  if (error) {
    console.error(`[ANALYTICS] Count error on ${table}:`, error);
    return 0;
  }
  return count || 0;
}

// Helper: list rows
async function listTable(
  table: string,
  select: string,
  orderBy: string,
  limit: number,
  ascending = false,
) {
  const { data, error } = await supabaseAdmin!
    .from(table)
    .select(select)
    .order(orderBy, { ascending })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function GET(request: NextRequest) {
  try {
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "all";

    const now = new Date();
    let startDate: string | null = null;

    switch (period) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case "week":
        startDate = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "month":
        startDate = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "year":
        startDate = new Date(
          now.getTime() - 365 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
    }

    // ============================================
    // USER STATS
    // ============================================
    const [
      totalUsers,
      newUsers,
      activeUsers,
      bannedUsers,
      instructors,
      admins,
    ] = await Promise.all([
      countTable("User"),
      startDate ? countTable("User", { gte: startDate }) : 0,
      countTable("User", { isActive: true, isBanned: false }),
      countTable("User", { isBanned: true }),
      countTable("User", { role: "instructor" }),
      countTable("User", { role: "admin" }),
    ]);

    // ============================================
    // COURSE STATS
    // ============================================
    const [
      totalCourses,
      publishedCourses,
      draftCourses,
      archivedCourses,
      totalEnrollmentsAll,
      completedCoursesAll,
    ] = await Promise.all([
      countTable("Course"),
      countTable("Course", { isPublished: true, isArchived: false }),
      countTable("Course", { isPublished: false, isArchived: false }),
      countTable("Course", { isArchived: true }),
      countTable("Enrollment"),
      countTable("Enrollment", { status: "completed" }),
    ]);

    // ============================================
    // PAYMENT STATS
    // ============================================
    const [
      totalPayments,
      pendingPayments,
      approvedPayments,
      rejectedPayments,
      localPayments,
      diasporaPayments,
    ] = await Promise.all([
      countTable("Payment"),
      countTable("Payment", { status: "pending" }),
      countTable("Payment", { status: "approved" }),
      countTable("Payment", { status: "rejected" }),
      countTable("Payment", { paymentType: "local" }),
      countTable("Payment", { paymentType: "diaspora" }),
    ]);

    // Revenue: sum of approved payment amounts
    let totalRevenue = 0;
    let periodRevenue = 0;
    try {
      const { data: allApproved } = await supabaseAdmin!
        .from("Payment")
        .select("amount")
        .eq("status", "approved");
      totalRevenue = (allApproved || []).reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0,
      );

      if (startDate) {
        const { data: periodApproved } = await supabaseAdmin!
          .from("Payment")
          .select("amount")
          .eq("status", "approved")
          .gte("createdAt", startDate);
        periodRevenue = (periodApproved || []).reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0,
        );
      }
    } catch (revErr) {
      console.error("[ANALYTICS] Revenue error:", revErr);
    }

    // ============================================
    // CERTIFICATE STATS
    // ============================================
    const [totalCertificates, validCertificates] = await Promise.all([
      countTable("Certificate"),
      countTable("Certificate", { isValid: true }),
    ]);

    // ============================================
    // RECENT ACTIVITY
    // ============================================
    const [recentUsers, recentPayments, recentEnrollments] = await Promise.all([
      listTable(
        "User",
        "id, fullName, email, role, isActive, createdAt",
        "createdAt",
        5,
      ),
      listTable(
        "Payment",
        "id, amount, currency, paymentType, status, createdAt, user:User(fullName, email), course:Course(title)",
        "createdAt",
        5,
      ),
      listTable(
        "Enrollment",
        "id, status, createdAt, user:User(fullName, email), course:Course(title)",
        "createdAt",
        5,
      ),
    ]);

    const completionRate =
      totalEnrollmentsAll > 0
        ? Math.round((completedCoursesAll / totalEnrollmentsAll) * 100)
        : 0;

    return successResponse(
      {
        period,
        users: {
          total: totalUsers,
          new: newUsers,
          active: activeUsers,
          banned: bannedUsers,
          instructors,
          admins,
          regularUsers: totalUsers - instructors - admins,
        },
        courses: {
          total: totalCourses,
          published: publishedCourses,
          draft: draftCourses,
          archived: archivedCourses,
          totalEnrollments: totalEnrollmentsAll,
          completedEnrollments: completedCoursesAll,
          completionRate,
        },
        payments: {
          total: totalPayments,
          pending: pendingPayments,
          approved: approvedPayments,
          rejected: rejectedPayments,
          local: localPayments,
          diaspora: diasporaPayments,
        },
        revenue: {
          total: totalRevenue,
          periodRevenue,
          currency: "ETB",
        },
        certificates: {
          total: totalCertificates,
          valid: validCertificates,
        },
        recentActivity: {
          users: recentUsers,
          payments: recentPayments,
          enrollments: recentEnrollments,
        },
      },
      "Analytics retrieved successfully",
    );
  } catch (error) {
    console.error("[ANALYTICS ERROR]", error);
    return handleApiError(error);
  }
}

