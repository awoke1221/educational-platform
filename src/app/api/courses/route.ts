// src/app/api/courses/route.ts
// Course Listing & Creation API Endpoints

import { NextRequest } from "next/server";
import { verifyAuth, requireAuth, requireRole } from "@/lib/auth/middleware";
import { createCourseSchema } from "@/lib/validators/schemas";
import { supabaseAdmin  } from "@/lib/db/supabaseAdmin";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
} from "@/lib/utils/api";
import { parsePagination } from "@/lib/utils/request";

// Helper: build Supabase query from params
function buildCourseQuery(
  filters: Record<string, any>,
  sortBy: string,
  sortOrder: string,
  page: number,
  limit: number,
) {
  let query = supabaseAdmin!
    .from("Course")
    // select course fields and instructorId only — do not rely on DB foreign-key relationships
    .select("*, instructorId", {
      count: "exact",
    })
    .eq("isPublished", true)
    .eq("isArchived", false);

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.level) query = query.eq("level", filters.level);
  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,category.ilike.%${filters.search}%`,
    );
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(from, to);
}

// ============================================
// GET /api/courses - List Published Courses
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { page, limit } = parsePagination(request);

    const searchParams = request.nextUrl.searchParams;
    const filters: Record<string, any> = {};
    const category = searchParams.get("category");
    const level = searchParams.get("level");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    if (category) filters.category = category;
    if (level) filters.level = level;
    if (search) filters.search = search;

    const {
      data: courses,
      count,
      error,
    } = await buildCourseQuery(filters, sortBy, sortOrder, page, limit);

    if (error) throw error;

    // Attach instructor info by fetching users for instructorIds (avoids requiring FK in Postgres schema)
    const courseList = courses || [];
    if (courseList.length > 0) {
      const instructorIds = Array.from(
        new Set(courseList.map((c: any) => c.instructorId).filter(Boolean)),
      );

      if (instructorIds.length > 0) {
        const { data: instructors } = await supabaseAdmin!
          .from("User")
          .select("id, fullName, profileImage")
          .in("id", instructorIds as any[]);

        const instructorMap = new Map(
          (instructors || []).map((u: any) => [u.id, u]),
        );

        for (const c of courseList) {
          c.instructor = instructorMap.get(c.instructorId) || null;
        }
      }
    }

    return paginatedResponse(
      courseList,
      count || 0,
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
    const authError = await requireRole(request, ["instructor", "admin"]);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

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

    const { data: course, error: createErr } = await supabaseAdmin!
      .from("Course")
      .insert({
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
      })
      .select(
        "id, title, description, shortDescription, price, currency, level, category, tags, isPublished, instructorId, createdAt",
      )
      .single();

    if (createErr) throw createErr;

    console.log(
      `[AUDIT] Course created: ${course.id} by instructor ${auth.userId}`,
    );

    return successResponse(course, "Course created successfully", 201);
  } catch (error) {
    console.error("[CREATE COURSE ERROR]", error);
    return handleApiError(error);
  }
}

