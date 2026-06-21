// src/app/api/progress/route.ts
// Progress Tracking API — Core Learning Engine

import { NextRequest } from "next/server";
import { verifyAuth, requireAuth } from "@/lib/auth/middleware";
import { updateProgressSchema } from "@/lib/validators/schemas";
import { supabaseAdmin  } from "@/lib/db/supabaseAdmin";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// POST /api/progress - Update Lecture Progress
// ============================================

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const validation = updateProgressSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        "Validation failed",
        400,
        validation.error.flatten().fieldErrors,
      );
    }

    const { lectureId, watchDuration, watchPercentage, isCompleted } =
      validation.data;

    // ============================================
    // STEP 1: Verify lecture exists
    // ============================================
    const { data: lecture, error: lecErr } = await supabaseAdmin!
      .from("Lecture")
      .select("id, courseId, duration")
      .eq("id", lectureId)
      .maybeSingle();

    if (lecErr || !lecture) {
      return errorResponse("Lecture not found", 404);
    }

    // ============================================
    // STEP 2: Find active enrollment
    // ============================================
    const { data: enrollment, error: enrollErr } = await supabaseAdmin!
      .from("Enrollment")
      .select("*")
      .eq("userId", auth.userId)
      .eq("courseId", lecture.courseId)
      .maybeSingle();

    if (enrollErr || !enrollment || enrollment.status !== "active") {
      return errorResponse("You are not enrolled in this course", 403);
    }

    // ============================================
    // STEP 3: Determine completion status
    // ============================================
    let shouldMarkComplete = isCompleted === true;
    let calculatedPercentage = watchPercentage;

    // Auto-complete if watch percentage >= 90% (user watched almost all)
    if (!shouldMarkComplete && watchPercentage >= 90) {
      shouldMarkComplete = true;
    }

    // Cap percentage at 100
    calculatedPercentage = Math.min(calculatedPercentage, 100);

    // ============================================
    // STEP 4: Upsert progress record
    // ============================================
    const { data: existingProgress } = await supabaseAdmin!
      .from("UserProgress")
      .select("completedAt, isCompleted")
      .eq("enrollmentId", enrollment.id)
      .eq("lectureId", lectureId)
      .maybeSingle();

    // Upsert progress via insert (or update if exists)
    let progress: any;
    const progressData = {
      enrollmentId: enrollment.id,
      lectureId,
      userId: auth.userId,
      isCompleted: shouldMarkComplete,
      completedAt: shouldMarkComplete
        ? existingProgress?.completedAt || new Date().toISOString()
        : null,
      watchDuration,
      watchPercentage: calculatedPercentage,
      lastWatchedAt: new Date().toISOString(),
    };

    if (existingProgress) {
      const { data: updated } = await supabaseAdmin!
        .from("UserProgress")
        .update({
          watchDuration,
          watchPercentage: calculatedPercentage,
          lastWatchedAt: new Date().toISOString(),
          ...(shouldMarkComplete
            ? {
                isCompleted: true,
                completedAt:
                  existingProgress.completedAt || new Date().toISOString(),
              }
            : {}),
        })
        .eq("enrollmentId", enrollment.id)
        .eq("lectureId", lectureId)
        .select(
          "id, isCompleted, watchDuration, watchPercentage, lastWatchedAt, completedAt",
        )
        .single();
      progress = updated;
    } else {
      const { data: created } = await supabaseAdmin!
        .from("UserProgress")
        .insert(progressData)
        .select(
          "id, isCompleted, watchDuration, watchPercentage, lastWatchedAt, completedAt",
        )
        .single();
      progress = created;
    }

    // ============================================
    // STEP 5: Update enrollment totals
    // ============================================
    const { data: allProgress } = await supabaseAdmin!
      .from("UserProgress")
      .select("watchDuration, isCompleted")
      .eq("enrollmentId", enrollment.id);

    const totalWatchTime = (allProgress || []).reduce(
      (sum: number, p: any) => sum + (p.watchDuration || 0),
      0,
    );
    const completedCount = (allProgress || []).filter(
      (p: any) => p.isCompleted,
    ).length;

    const { count } = await supabaseAdmin!
      .from("Lecture")
      .select("*", { count: "exact", head: true })
      .eq("courseId", lecture.courseId)
      .eq("isPublished", true);

    const lectureCount = count || 0;

    const completionPercentage =
      lectureCount > 0 ? Math.round((completedCount / lectureCount) * 100) : 0;

    await supabaseAdmin!
      .from("Enrollment")
      .update({
        totalWatchTime,
        completionPercentage,
        lastAccessedAt: new Date().toISOString(),
        ...(completionPercentage >= 100
          ? { status: "completed", completionDate: new Date().toISOString() }
          : {}),
      })
      .eq("id", enrollment.id);

    // ============================================
    // STEP 6: Check if course is completed
    // ============================================
    let courseCompleted = false;
    if (completionPercentage >= 100) {
      courseCompleted = true;
      console.log(
        `[PROGRESS] Course completed! User ${auth.userId} completed course ${lecture.courseId}`,
      );
    }

    return successResponse(
      {
        progress,
        enrollment: {
          totalWatchTime,
          completedLectures: completedCount,
          totalLectures: lectureCount,
          completionPercentage,
          isCourseCompleted: courseCompleted,
        },
      },
      courseCompleted
        ? "🎉 Congratulations! You have completed this course!"
        : "Progress updated successfully",
    );
  } catch (error) {
    console.error("[UPDATE PROGRESS ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// PATCH /api/progress - Batch Progress Update
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const { courseId, lectures } = body;

    if (!courseId || !Array.isArray(lectures) || lectures.length === 0) {
      return errorResponse("Course ID and lectures array are required", 400);
    }

    // Verify enrollment
    const { data: enrollment, error: enrollErr } = await supabaseAdmin!
      .from("Enrollment")
      .select("*")
      .eq("userId", auth.userId)
      .eq("courseId", courseId)
      .maybeSingle();

    if (enrollErr || !enrollment || enrollment.status !== "active") {
      return errorResponse("You are not enrolled in this course", 403);
    }

    // Batch upsert progress records
    const results = await Promise.all(
      lectures.map(async (lecture: any) => {
        const shouldComplete =
          lecture.watchPercentage >= 90 || lecture.isCompleted;

        const progressData = {
          enrollmentId: enrollment.id,
          lectureId: lecture.lectureId,
          userId: auth.userId,
          isCompleted: shouldComplete,
          completedAt: shouldComplete ? new Date().toISOString() : null,
          watchDuration: lecture.watchDuration || 0,
          watchPercentage: Math.min(lecture.watchPercentage || 0, 100),
          lastWatchedAt: new Date().toISOString(),
        };

        // Check existing
        const { data: existing } = await supabaseAdmin!
          .from("UserProgress")
          .select("id")
          .eq("enrollmentId", enrollment.id)
          .eq("lectureId", lecture.lectureId)
          .maybeSingle();

        if (existing) {
          const { data: updated } = await supabaseAdmin!
            .from("UserProgress")
            .update({
              watchDuration: lecture.watchDuration || 0,
              watchPercentage: Math.min(lecture.watchPercentage || 0, 100),
              lastWatchedAt: new Date().toISOString(),
              ...(shouldComplete
                ? { isCompleted: true, completedAt: new Date().toISOString() }
                : {}),
            })
            .eq("id", existing.id)
            .select()
            .single();
          return updated;
        } else {
          const { data: created } = await supabaseAdmin!
            .from("UserProgress")
            .insert(progressData)
            .select()
            .single();
          return created;
        }
      }),
    );

    // Recalculate enrollment totals
    const { data: allProgress } = await supabaseAdmin!
      .from("UserProgress")
      .select("watchDuration, isCompleted")
      .eq("enrollmentId", enrollment.id);

    const totalWatchTime = (allProgress || []).reduce(
      (sum: number, p: any) => sum + (p.watchDuration || 0),
      0,
    );
    const completedCount = (allProgress || []).filter(
      (p: any) => p.isCompleted,
    ).length;

    const { count } = await supabaseAdmin!
      .from("Lecture")
      .select("*", { count: "exact", head: true })
      .eq("courseId", courseId)
      .eq("isPublished", true);

    const lectureCount = count || 0;
    const completionPercentage =
      lectureCount > 0 ? Math.round((completedCount / lectureCount) * 100) : 0;

    await supabaseAdmin!
      .from("Enrollment")
      .update({
        totalWatchTime,
        completionPercentage,
        lastAccessedAt: new Date().toISOString(),
        ...(completionPercentage >= 100
          ? { status: "completed", completionDate: new Date().toISOString() }
          : {}),
      })
      .eq("id", enrollment.id);

    return successResponse(
      {
        updated: results.length,
        completedLectures: completedCount,
        totalLectures: lectureCount,
        completionPercentage,
        isCourseCompleted: completionPercentage >= 100,
      },
      "Progress updated successfully",
    );
  } catch (error) {
    console.error("[BATCH PROGRESS ERROR]", error);
    return handleApiError(error);
  }
}

