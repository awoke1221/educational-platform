// src/app/api/instructor/courses/route.ts
// Instructor's Course Management API

import { NextRequest } from "next/server";
import { verifyAuth, requireRole } from "@/lib/auth/middleware";
import { supabaseAdmin  } from "@/lib/db/supabaseAdmin";
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

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = supabaseAdmin!
      .from("Course")
      .select("*", { count: "exact" })
      .eq("instructorId", auth.userId);

    if (status === "published") {
      query = query.eq("isPublished", true).eq("isArchived", false);
    } else if (status === "draft") {
      query = query.eq("isPublished", false).eq("isArchived", false);
    } else if (status === "archived") {
      query = query.eq("isArchived", true);
    }

    const {
      data: courses,
      count,
      error,
    } = await query.order("updatedAt", { ascending: false }).range(from, to);

    if (error) throw error;

    return paginatedResponse(
      courses || [],
      count || 0,
      page,
      limit,
      "Courses retrieved successfully",
    );
  } catch (error) {
    console.error("[INSTRUCTOR COURSES ERROR]", error);
    return handleApiError(error);
  }
}

