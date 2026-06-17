// src/app/api/courses/route.ts
// Course Listing & Creation API Endpoints

import { NextRequest } from "next/server";
import { verifyAuth, requireAuth, requireRole } from "@/lib/auth/middleware";
import { createCourseSchema } from "@/lib/validators/schemas";
import { prisma } from "@/lib/db/supabase";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
} from "@/lib/utils/api";
import { parsePagination } from "@/lib/utils/request";

// ============================================
// GET /api/courses - List Published Courses
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { page, limit } = parsePagination(request);

    // Build filters from query params
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const level = searchParams.get("level");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build where clause
    const where: Record<string, any> = {
      isPublished: true,
      isArchived: false,
    };

    if (category) {
      where.category = category;
    }

    if (level) {
      where.level = level;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get courses with pagination
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          title: true,
          shortDescription: true,
          coverImage: true,
          price: true,
          currency: true,
          level: true,
          category: true,
          tags: true,
          duration: true,
          videoCount: true,
          enrollmentCount: true,
          instructorId: true,
          createdAt: true,
          instructor: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
          _count: {
            select: {
              lectures: true,
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
    console.error("[LIST COURSES ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// POST /api/courses - Create New Course
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify instructor/admin role
    const authError = await requireRole(request, ["instructor", "admin"]);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    // Parse and validate request body
    const body = await request.json().catch(() => null);
    if (!body) {
      return errorResponse("Invalid JSON body", 400);
    }

    const validation = createCourseSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        "Validation failed",
        400,
        validation.error.flatten().fieldErrors,
      );
    }

    const {
      title,
      description,
      shortDescription,
      price,
      level,
      category,
      tags,
    } = validation.data;

    // Create course
    const course = await prisma.course.create({
      data: {
        title,
        description,
        shortDescription: shortDescription || null,
        coverImage: "",
        instructorId: auth.userId,
        price,
        currency: "ETB",
        level,
        category: category || null,
        tags: tags || [],
        isPublished: false,
      },
      select: {
        id: true,
        title: true,
        description: true,
        shortDescription: true,
        price: true,
        currency: true,
        level: true,
        category: true,
        tags: true,
        isPublished: true,
        instructorId: true,
        createdAt: true,
      },
    });

    console.log(
      `[AUDIT] Course created: ${course.id} by instructor ${auth.userId}`,
    );

    return successResponse(course, "Course created successfully", 201);
  } catch (error) {
    console.error("[CREATE COURSE ERROR]", error);
    return handleApiError(error);
  }
}
