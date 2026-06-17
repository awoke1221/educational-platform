// src/app/api/progress/route.ts
// Progress Tracking API — Core Learning Engine

import { NextRequest } from "next/server";
import { verifyAuth, requireAuth } from "@/lib/auth/middleware";
import { updateProgressSchema } from "@/lib/validators/schemas";
import { prisma } from "@/lib/db/supabase";
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
    const lecture = await prisma.lecture.findUnique({
      where: { id: lectureId },
      select: {
        id: true,
        courseId: true,
        duration: true,
        course: {
          select: { id: true, title: true },
        },
      },
    });

    if (!lecture) {
      return errorResponse("Lecture not found", 404);
    }

    // ============================================
    // STEP 2: Find active enrollment
    // ============================================
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: auth.userId,
          courseId: lecture.courseId,
        },
      },
    });

    if (!enrollment || enrollment.status !== "active") {
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
    // Check existing progress to preserve completedAt
    const existingProgress = await prisma.userProgress.findUnique({
      where: {
        enrollmentId_lectureId: {
          enrollmentId: enrollment.id,
          lectureId,
        },
      },
      select: { completedAt: true, isCompleted: true },
    });

    const progress = await prisma.userProgress.upsert({
      where: {
        enrollmentId_lectureId: {
          enrollmentId: enrollment.id,
          lectureId,
        },
      },
      create: {
        enrollmentId: enrollment.id,
        lectureId,
        userId: auth.userId,
        isCompleted: shouldMarkComplete,
        completedAt: shouldMarkComplete ? new Date() : null,
        watchDuration,
        watchPercentage: calculatedPercentage,
        lastWatchedAt: new Date(),
      },
      update: {
        watchDuration,
        watchPercentage: calculatedPercentage,
        lastWatchedAt: new Date(),
        // Only set completed if not already completed
        ...(shouldMarkComplete
          ? {
              isCompleted: true,
              completedAt: existingProgress?.completedAt || new Date(),
            }
          : {}),
      },
      select: {
        id: true,
        isCompleted: true,
        watchDuration: true,
        watchPercentage: true,
        lastWatchedAt: true,
        completedAt: true,
      },
    });

    // ============================================
    // STEP 5: Update enrollment totals
    // ============================================
    const allProgress = await prisma.userProgress.findMany({
      where: { enrollmentId: enrollment.id },
      select: { watchDuration: true, isCompleted: true },
    });

    const totalWatchTime = allProgress.reduce(
      (sum, p) => sum + p.watchDuration,
      0,
    );
    const completedCount = allProgress.filter((p) => p.isCompleted).length;

    // Get total lecture count for the course
    const lectureCount = await prisma.lecture.count({
      where: { courseId: lecture.courseId, isPublished: true },
    });

    // Calculate completion percentage
    const completionPercentage =
      lectureCount > 0 ? Math.round((completedCount / lectureCount) * 100) : 0;

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        totalWatchTime,
        completionPercentage,
        lastAccessedAt: new Date(),
        // Auto-mark course as completed
        ...(completionPercentage >= 100
          ? {
              status: "completed",
              completionDate: new Date(),
            }
          : {}),
      },
    });

    // ============================================
    // STEP 6: Check if course is completed
    // ============================================
    let courseCompleted = false;
    if (completionPercentage >= 100) {
      courseCompleted = true;
      console.log(
        `[PROGRESS] Course completed! User ${auth.userId} completed ${lecture.course.title}`,
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
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: auth.userId,
          courseId,
        },
      },
    });

    if (!enrollment || enrollment.status !== "active") {
      return errorResponse("You are not enrolled in this course", 403);
    }

    // Batch upsert progress records
    const results = await Promise.all(
      lectures.map(async (lecture: any) => {
        const shouldComplete =
          lecture.watchPercentage >= 90 || lecture.isCompleted;

        return prisma.userProgress.upsert({
          where: {
            enrollmentId_lectureId: {
              enrollmentId: enrollment.id,
              lectureId: lecture.lectureId,
            },
          },
          create: {
            enrollmentId: enrollment.id,
            lectureId: lecture.lectureId,
            userId: auth.userId,
            isCompleted: shouldComplete,
            completedAt: shouldComplete ? new Date() : null,
            watchDuration: lecture.watchDuration || 0,
            watchPercentage: Math.min(lecture.watchPercentage || 0, 100),
            lastWatchedAt: new Date(),
          },
          update: {
            watchDuration: lecture.watchDuration || 0,
            watchPercentage: Math.min(lecture.watchPercentage || 0, 100),
            lastWatchedAt: new Date(),
            ...(shouldComplete
              ? { isCompleted: true, completedAt: new Date() }
              : {}),
          },
        });
      }),
    );

    // Recalculate enrollment totals
    const allProgress = await prisma.userProgress.findMany({
      where: { enrollmentId: enrollment.id },
      select: { watchDuration: true, isCompleted: true },
    });

    const totalWatchTime = allProgress.reduce(
      (sum, p) => sum + p.watchDuration,
      0,
    );
    const completedCount = allProgress.filter((p) => p.isCompleted).length;
    const lectureCount = await prisma.lecture.count({
      where: { courseId, isPublished: true },
    });
    const completionPercentage =
      lectureCount > 0 ? Math.round((completedCount / lectureCount) * 100) : 0;

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        totalWatchTime,
        completionPercentage,
        lastAccessedAt: new Date(),
        ...(completionPercentage >= 100
          ? { status: "completed", completionDate: new Date() }
          : {}),
      },
    });

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
