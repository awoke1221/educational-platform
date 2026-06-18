// src/app/api/progress/[courseId]/route.ts
// Course-Level Progress API

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
// GET /api/progress/[courseId] - Course Progress Details
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const { courseId } = await params;

    // ============================================
    // Verify enrollment
    // ============================================
    const { data: enrollment, error: enrollErr } = await supabaseAdmin!
      .from("Enrollment")
      .select(
        "id, status, completionPercentage, totalWatchTime, enrollmentDate, lastAccessedAt, certificateIssued",
      )
      .eq("userId", auth.userId)
      .eq("courseId", courseId)
      .maybeSingle();

    if (enrollErr || !enrollment) {
      return errorResponse("You are not enrolled in this course", 403);
    }

    // ============================================
    // Get all lectures with progress
    // ============================================
    const { data: lectures } = await supabaseAdmin!
      .from("Lecture")
      .select("id, title, duration, orderIndex, cloudinaryPublicId")
      .eq("courseId", courseId)
      .eq("isPublished", true)
      .order("orderIndex", { ascending: true });

    const { data: progressRecords } = await supabaseAdmin!
      .from("UserProgress")
      .select(
        "lectureId, isCompleted, watchDuration, watchPercentage, lastWatchedAt, completedAt",
      )
      .eq("enrollmentId", enrollment.id);

    // Build progress map
    const progressMap = new Map(
      (progressRecords || []).map((p: any) => [p.lectureId, p]),
    );

    // Enrich lectures with progress data
    const lecturesWithProgress = (lectures || []).map((lecture: any) => {
      const progress = progressMap.get(lecture.id);
      return {
        id: lecture.id,
        title: lecture.title,
        duration: lecture.duration,
        orderIndex: lecture.orderIndex,
        hasVideo: !!lecture.cloudinaryPublicId,
        progress: progress
          ? {
              isCompleted: progress.isCompleted,
              watchDuration: progress.watchDuration,
              watchPercentage: progress.watchPercentage,
              lastWatchedAt: progress.lastWatchedAt,
              completedAt: progress.completedAt,
            }
          : {
              isCompleted: false,
              watchDuration: 0,
              watchPercentage: 0,
              lastWatchedAt: null,
              completedAt: null,
            },
      };
    });

    // ============================================
    // Calculate course stats
    // ============================================
    const completedCount = (progressRecords || []).filter(
      (p: any) => p.isCompleted,
    ).length;
    const totalCount = (lectures || []).length;
    const progressPercentage =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Next lecture to watch
    const nextLecture = lecturesWithProgress.find(
      (l) => !l.progress.isCompleted,
    );

    return successResponse(
      {
        enrollment,
        stats: {
          completedLectures: completedCount,
          totalLectures: totalCount,
          progressPercentage,
          totalWatchTime: enrollment.totalWatchTime,
          isCompleted: enrollment.status === "completed",
          certificateIssued: enrollment.certificateIssued,
        },
        lectures: lecturesWithProgress,
        nextLecture: nextLecture
          ? {
              id: nextLecture.id,
              title: nextLecture.title,
              orderIndex: nextLecture.orderIndex,
            }
          : null,
      },
      "Course progress retrieved successfully",
    );
  } catch (error) {
    console.error("[COURSE PROGRESS ERROR]", error);
    return handleApiError(error);
  }
}
