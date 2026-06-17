// src/app/api/admin/courses/route.ts
// Admin Course Management API

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
// GET /api/admin/courses - List All Courses (Admin View)
// ============================================

export async function GET(request: NextRequest) {
  try {
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;

    const { page, limit } = parsePagination(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // published, draft, archived, all
    const instructorId = searchParams.get("instructorId");

    const where: Record<string, any> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status === "published") {
      where.isPublished = true;
      where.isArchived = false;
    } else if (status === "draft") {
      where.isPublished = false;
      where.isArchived = false;
    } else if (status === "archived") {
      where.isArchived = true;
    }

    if (instructorId) {
      where.instructorId = instructorId;
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          instructor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
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
    console.error("[ADMIN COURSES ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// PATCH /api/admin/courses - Admin Course Actions
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const { courseId, action } = body;

    if (!courseId || !action) {
      return errorResponse("Course ID and action are required", 400);
    }

    let updateData: Record<string, any> = {};
    let responseMessage = "";

    switch (action) {
      case "publish":
        updateData = { isPublished: true };
        responseMessage = "Course published";
        break;
      case "unpublish":
        updateData = { isPublished: false };
        responseMessage = "Course unpublished";
        break;
      case "archive":
        updateData = { isArchived: true, isPublished: false };
        responseMessage = "Course archived";
        break;
      case "restore":
        updateData = { isArchived: false, deletedAt: null };
        responseMessage = "Course restored";
        break;
      default:
        return errorResponse(
          "Invalid action. Use: publish, unpublish, archive, restore",
          400,
        );
    }

    const course = await prisma.course.update({
      where: { id: courseId },
      data: updateData,
      select: {
        id: true,
        title: true,
        isPublished: true,
        isArchived: true,
      },
    });

    console.log(`[ADMIN] Course ${action}: ${courseId} by ${auth.userId}`);

    return successResponse(course, responseMessage);
  } catch (error: any) {
    console.error("[ADMIN COURSE ACTION ERROR]", error);
    if (error.message?.includes("Record to update not found")) {
      return errorResponse("Course not found", 404);
    }
    return handleApiError(error);
  }
}
