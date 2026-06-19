// src/app/api/enrollments/[id]/route.ts
// Single Enrollment Detail API

import { NextRequest } from "next/server";
import { verifyAuth, requireAuth } from "@/lib/auth/middleware";
import { supabaseAdmin } from "@/lib/db/supabase";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// GET /api/enrollments/[id] - Enrollment Details with Progress
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    const { data: enrollment, error: enrollErr } = await supabaseAdmin!
      .from("Enrollment")
      .select(
        "*, course:Course(*, instructorId, videoCount), payment:Payment(id, amount, currency, paymentType, paymentMethod, status, createdAt), certificate:Certificate(id, certificateNumber, issuedDate, verificationUrl, isValid), userProgress:UserProgress(*, lecture:Lecture(id, title, duration, orderIndex))",
      )
      .eq("id", id)
      .maybeSingle();

    if (enrollErr || !enrollment) {
      return notFoundResponse("Enrollment");
    }

    // Only allow owner or admin to view
    if (enrollment.userId !== auth.userId && auth.role !== "admin") {
      return errorResponse("Access denied", 403);
    }

    // If course has instructorId, fetch instructor info separately to avoid FK dependency errors
    if (enrollment?.course?.instructorId) {
      const { data: instructor } = await supabaseAdmin!
        .from("User")
        .select("id, fullName, profileImage")
        .eq("id", enrollment.course.instructorId)
        .maybeSingle();
      enrollment.course.instructor = instructor || null;
    }

    // Calculate progress
    const totalLectures = enrollment.course.videoCount;
    const completedLectures = enrollment.userProgress.filter(
      (p: any) => p.isCompleted,
    ).length;

    const progressPercentage =
      totalLectures > 0
        ? Math.round((completedLectures / totalLectures) * 100)
        : 0;

    return successResponse(
      {
        ...enrollment,
        stats: {
          totalLectures,
          completedLectures,
          progressPercentage,
          totalWatchTime: enrollment.totalWatchTime,
        },
      },
      "Enrollment retrieved successfully",
    );
  } catch (error) {
    console.error("[GET ENROLLMENT ERROR]", error);
    return handleApiError(error);
  }
}
