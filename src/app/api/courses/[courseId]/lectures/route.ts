// src/app/api/courses/[courseId]/lectures/route.ts
// Lecture Listing & Creation API

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { createLectureSchema } from "@/lib/validators/schemas";
import { prisma } from "@/lib/db/supabase";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// Helper: Check course ownership
// ============================================

async function canManageCourse(
  courseId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "admin") return true;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  return course?.instructorId === userId;
}

// ============================================
// GET /api/courses/[courseId]/lectures - List Lectures
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true },
    });

    if (!course) {
      return notFoundResponse("Course");
    }

    // Check authentication for unpublished courses
    const auth = await verifyAuth(request);
    const isOwner = auth
      ? await canManageCourse(courseId, auth.userId, auth.role)
      : false;

    // Only show published lectures to non-owners
    const lectureWhere: Record<string, any> = { courseId };

    if (!course.isPublished && !isOwner) {
      return errorResponse("Course is not published", 403);
    }

    if (!isOwner) {
      lectureWhere.isPublished = true;
    }

    const lectureSelect: Record<string, any> = {
      id: true,
      title: true,
      description: true,
      duration: true,
      orderIndex: true,
      isPublished: true,
      views: true,
      createdAt: true,
    };

    // Only include video details for course owner
    if (isOwner) {
      lectureSelect.videoUrl = true;
      lectureSelect.cloudinaryPublicId = true;
      lectureSelect.videoSize = true;
    }

    const lectures = await prisma.lecture.findMany({
      where: lectureWhere,
      orderBy: { orderIndex: "asc" },
      select: lectureSelect,
    });

    // Get course progress if user is enrolled
    let progress: Record<string, any> = {};
    if (auth && !isOwner) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: auth.userId,
            courseId,
          },
        },
      });

      if (enrollment) {
        const userProgress = await prisma.userProgress.findMany({
          where: {
            userId: auth.userId,
            lecture: { courseId },
          },
          select: {
            lectureId: true,
            isCompleted: true,
            watchPercentage: true,
          },
        });

        progress = userProgress.reduce(
          (acc, p) => {
            acc[p.lectureId] = {
              isCompleted: p.isCompleted,
              watchPercentage: p.watchPercentage,
            };
            return acc;
          },
          {} as Record<string, any>,
        );
      }
    }

    return successResponse(
      {
        courseId,
        lectures,
        progress,
      },
      "Lectures retrieved successfully",
    );
  } catch (error) {
    console.error("[LIST LECTURES ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// POST /api/courses/[courseId]/lectures - Create Lecture
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;

    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    // Verify ownership
    const canManage = await canManageCourse(courseId, auth.userId, auth.role);
    if (!canManage) {
      return errorResponse(
        "You don't have permission to manage this course",
        403,
      );
    }

    // Parse and validate body
    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const validation = createLectureSchema.safeParse({ ...body, courseId });
    if (!validation.success) {
      return errorResponse(
        "Validation failed",
        400,
        validation.error.flatten().fieldErrors,
      );
    }

    const { title, description, orderIndex } = validation.data;

    // Auto-assign orderIndex if not provided
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      const lastLecture = await prisma.lecture.findFirst({
        where: { courseId },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });
      finalOrderIndex = (lastLecture?.orderIndex ?? -1) + 1;
    }

    // Create lecture
    const lecture = await prisma.lecture.create({
      data: {
        courseId,
        title,
        description: description || null,
        videoUrl: "",
        cloudinaryPublicId: "",
        orderIndex: finalOrderIndex,
        isPublished: false,
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        orderIndex: true,
        isPublished: true,
        createdAt: true,
      },
    });

    // Update course video count
    await prisma.course.update({
      where: { id: courseId },
      data: { videoCount: { increment: 1 } },
    });

    console.log(`[AUDIT] Lecture created: ${lecture.id} in course ${courseId}`);

    return successResponse(lecture, "Lecture created successfully", 201);
  } catch (error) {
    console.error("[CREATE LECTURE ERROR]", error);
    return handleApiError(error);
  }
}
