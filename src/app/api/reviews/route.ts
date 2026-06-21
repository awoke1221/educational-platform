// ============================================
// ⭐ Course Reviews API
// ============================================
// GET  /api/reviews?courseId=...  - List reviews for a course
// POST /api/reviews               - Submit a review
// ============================================

import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { verifyAuth } from "@/lib/auth/middleware";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// GET - List reviews for a course
// ============================================

export async function GET(request: NextRequest) {
  try {
    const courseId = request.nextUrl.searchParams.get("courseId");
    if (!courseId) return errorResponse("courseId is required", 400);

    const { data: reviews, error } = await supabaseAdmin!
      .from("Review")
      .select("*, user:User(id, fullName, profileImage)")
      .eq("courseId", courseId)
      .eq("isApproved", true)
      .order("createdAt", { ascending: false });

    if (error) throw error;

    // Calculate aggregate stats
    const total = reviews?.length || 0;
    const averageRating =
      total > 0 ? reviews!.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const distribution = [0, 0, 0, 0, 0]; // 1-5 stars
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
// POST - Submit a review
// ============================================

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

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

    // Check if already reviewed
    const { data: existing } = await supabaseAdmin!
      .from("Review")
      .select("id")
      .eq("userId", auth.userId)
      .eq("courseId", courseId)
      .maybeSingle();

    if (existing) {
      return errorResponse("You already reviewed this course", 409);
    }

    // Check enrollment (must be enrolled to review)
    const { data: enrollment } = await supabaseAdmin!
      .from("Enrollment")
      .select("id")
      .eq("userId", auth.userId)
      .eq("courseId", courseId)
      .eq("status", "active")
      .maybeSingle();

    if (!enrollment) {
      return errorResponse("You must be enrolled to review this course", 403);
    }

    const { data: review, error } = await supabaseAdmin!
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
