// ============================================
// ⭐ Course Reviews API
// ============================================
// GET  /api/reviews?courseId=...  - List reviews for a course (public)
// POST /api/reviews               - Submit a review (authenticated)
// ============================================
//
// GET uses admin client (public read — no RLS needed for approved reviews).
// POST uses the user-scoped client so RLS enforces userId matching.

import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { verifyAuth } from "@/lib/auth/middleware";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getUserClientFromRequest } from "@/lib/db/supabaseUserClient";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// GET - List reviews for a course (public)
// ============================================

export async function GET(request: NextRequest) {
  try {
    const courseId = request.nextUrl.searchParams.get("courseId");
    const admin = getSupabaseAdmin();

    let query = admin!
      .from("Review")
      .select("*, user:User(id, fullName, profileImage)")
      .eq("isApproved", true);

    if (courseId) {
      query = query.eq("courseId", courseId);
    }

    const { data: reviews, error } = await query.order("createdAt", {
      ascending: false,
    });

    if (error) throw error;

    const total = reviews?.length || 0;
    const averageRating =
      total > 0 ? reviews!.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const distribution = [0, 0, 0, 0, 0];
    reviews?.forEach((r) => {
      distribution[r.rating - 1]++;
    });

    return successResponse(
      {
        reviews: reviews || [],
        stats: {
          total,
          averageRating: Math.round(averageRating * 10) / 10,
          distribution,
        },
      },
      "Reviews retrieved",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// POST - Submit a review (authenticated, RLS-enforced)
// ============================================

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const supabase = getUserClientFromRequest(request);
    if (!supabase) return errorResponse("Unauthorized", 401);

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const { courseId, rating, comment } = body as {
      courseId: string;
      rating: number;
      comment?: string;
    };

    if (!courseId) return errorResponse("courseId is required", 400);
    if (!rating || rating < 1 || rating > 5) {
      return errorResponse("Rating must be between 1 and 5", 400);
    }

    // Check if already reviewed (user-scoped — RLS returns own reviews + approved)
    const { data: existing } = await supabase
      .from("Review")
      .select("id")
      .eq("courseId", courseId)
      .maybeSingle();

    if (existing) {
      return errorResponse("You already reviewed this course", 409);
    }

    // Check enrollment (user-scoped — RLS returns own enrollments)
    const { data: enrollment } = await supabase
      .from("Enrollment")
      .select("id")
      .eq("courseId", courseId)
      .eq("status", "active")
      .maybeSingle();

    if (!enrollment) {
      return errorResponse("You must be enrolled to review this course", 403);
    }

    // Insert review (user-scoped — RLS enforces "userId" = auth.uid())
    const { data: review, error } = await supabase
      .from("Review")
      .insert({
        id: crypto.randomUUID(),
        courseId,
        userId: auth.userId,
        rating,
        comment: comment?.trim() || null,
        isApproved: false, // Requires admin approval
      })
      .select("id, rating, comment, isApproved, createdAt")
      .single();

    if (error) throw error;

    return successResponse(review, "Review submitted for approval", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
