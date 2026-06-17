// src/app/api/admin/analytics/route.ts
// Admin Dashboard Analytics API

import { NextRequest } from "next/server";
import { verifyAuth, requireRole } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/supabase";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// GET /api/admin/analytics - Full Dashboard Stats
// ============================================

export async function GET(request: NextRequest) {
  try {
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "all"; // day, week, month, year, all

    // Calculate date range
    const now = new Date();
    let startDate: Date | null = null;

    switch (period) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null;
    }

    const dateFilter = startDate ? { gte: startDate } : undefined;

    // ============================================
    // USER STATS
    // ============================================
    const [totalUsers, newUsers, activeUsers, bannedUsers] = await Promise.all([
      prisma.user.count(),
      startDate
        ? prisma.user.count({ where: { createdAt: { gte: startDate } } })
        : Promise.resolve(0),
      prisma.user.count({ where: { isActive: true, isBanned: false } }),
      prisma.user.count({ where: { isBanned: true } }),
    ]);

    // User role breakdown
    const instructors = await prisma.user.count({
      where: { role: "instructor" },
    });
    const admins = await prisma.user.count({ where: { role: "admin" } });
    const regularUsers = totalUsers - instructors - admins;

    // ============================================
    // COURSE STATS
    // ============================================
    const [totalCourses, publishedCourses, draftCourses, archivedCourses] =
      await Promise.all([
        prisma.course.count(),
        prisma.course.count({
          where: { isPublished: true, isArchived: false },
        }),
        prisma.course.count({
          where: { isPublished: false, isArchived: false },
        }),
        prisma.course.count({ where: { isArchived: true } }),
      ]);

    const totalEnrollmentsAll = await prisma.enrollment.count();
    const completedCoursesAll = await prisma.enrollment.count({
      where: { status: "completed" },
    });

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
      prisma.payment.count(),
      prisma.payment.count({ where: { status: "pending" } }),
      prisma.payment.count({ where: { status: "approved" } }),
      prisma.payment.count({ where: { status: "rejected" } }),
      prisma.payment.count({ where: { paymentType: "local" } }),
      prisma.payment.count({ where: { paymentType: "diaspora" } }),
    ]);

    // Revenue calculation
    const revenueAgg = await prisma.payment.aggregate({
      where: { status: "approved" },
      _sum: { amount: true },
    });
    const totalRevenue = revenueAgg._sum.amount || 0;

    // Revenue by period
    const periodRevenueAgg = await prisma.payment.aggregate({
      where: {
        status: "approved",
        ...(dateFilter ? { createdAt: { gte: startDate! } } : {}),
      },
      _sum: { amount: true },
    });
    const periodRevenue = periodRevenueAgg._sum.amount || 0;

    // ============================================
    // CERTIFICATE STATS
    // ============================================
    const [totalCertificates, validCertificates] = await Promise.all([
      prisma.certificate.count(),
      prisma.certificate.count({ where: { isValid: true } }),
    ]);

    // ============================================
    // RECENT ACTIVITY
    // ============================================
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    const recentPayments = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amount: true,
        currency: true,
        paymentType: true,
        status: true,
        createdAt: true,
        user: { select: { fullName: true, email: true } },
        course: { select: { title: true } },
      },
    });

    const recentEnrollments = await prisma.enrollment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        createdAt: true,
        user: { select: { fullName: true, email: true } },
        course: { select: { title: true } },
      },
    });

    // ============================================
    // COMPLETION RATE
    // ============================================
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
          regularUsers,
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
          total: Number(totalRevenue),
          periodRevenue: Number(periodRevenue),
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
