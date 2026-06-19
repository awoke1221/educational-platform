// src/app/api/admin/courses/route.ts
// Admin Course Management API

import { NextRequest } from "next/server";
import { verifyAuth, requireRole } from "@/lib/auth/middleware";
import { supabaseAdmin } from "@/lib/db/supabase";
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

    // Build Supabase query
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = supabaseAdmin!
      .from("Course")
      // select instructorId and attach instructor data separately to avoid FK dependency
      .select("*, instructorId", { count: "exact" });

    if (status === "published") {
      query = query.eq("isPublished", true).eq("isArchived", false);
    } else if (status === "draft") {
      query = query.eq("isPublished", false).eq("isArchived", false);
    } else if (status === "archived") {
      query = query.eq("isArchived", true);
    }

    if (instructorId) query = query.eq("instructorId", instructorId);
    if (search) {
      query = query.or(`title.ilike.%${search}%,category.ilike.%${search}%`);
    }

    const {
      data: courses,
      count,
      error,
    } = await query.order("updatedAt", { ascending: false }).range(from, to);

    if (error) throw error;

    const courseList = courses || [];
    if (courseList.length > 0) {
      const instructorIds = Array.from(
        new Set(courseList.map((c: any) => c.instructorId).filter(Boolean)),
      );
      if (instructorIds.length > 0) {
        const { data: instructors } = await supabaseAdmin!
          .from("User")
          .select("id, fullName, email")
          .in("id", instructorIds as any[]);
        const map = new Map((instructors || []).map((u: any) => [u.id, u]));
        for (const c of courseList)
          c.instructor = map.get(c.instructorId) || null;
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

    const { data: course, error: updateErr } = await supabaseAdmin!
      .from("Course")
      .update(updateData)
      .eq("id", courseId)
      .select("id, title, isPublished, isArchived")
      .single();

    if (updateErr) {
      if (updateErr.message?.includes("multiple (or no) rows")) {
        return errorResponse("Course not found", 404);
      }
      throw updateErr;
    }

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
