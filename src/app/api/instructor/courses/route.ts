// src/app/api/instructor/courses/route.ts
// Instructor's Course Management API

import { NextRequest } from "next/server";
import { verifyAuth, requireRole } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/supabase";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
} from "@/lib/utils/api";
import { parsePagination } from "@/lib/utils/request";

// ============================================
// GET /api/instructor/courses - Instructor's Courses
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Verify instructor/admin role
    const authError = await requireRole(request, ["instructor", "admin"]);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const { page, limit } = parsePagination(request);
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status"); // published, draft, archived

    // Build where clause
    const where: Record<string, any> = {
      instructorId: auth.userId,
    };

    if (status === "published") {
      where.isPublished = true;
      where.isArchived = false;
    } else if (status === "draft") {
      where.isPublished = false;
      where.isArchived = false;
    } else if (status === "archived") {
      where.isArchived = true;
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          coverImage: true,
          price: true,
          currency: true,
          level: true,
          category: true,
          isPublished: true,
          isArchived: true,
          videoCount: true,
          enrollmentCount: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              lectures: true,
              enrollments: true,
            },
          },
        },
      }),
      prisma.course.count({ where }),
    ]);

    return paginatedResponse(
      courses,
      total,
      page,
      limit,
      "Courses retrieved successfully",
    );
  } catch (error) {
    console.error("[INSTRUCTOR COURSES ERROR]", error);
    return handleApiError(error);
  }
}
