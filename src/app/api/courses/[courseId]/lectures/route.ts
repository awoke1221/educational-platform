// src/app/api/courses/[courseId]/lectures/route.ts
// Lecture Listing & Creation API

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { createLectureSchema } from "@/lib/validators/schemas";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
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
  const { data: course } = await supabaseAdmin!
    .from("Course")
    .select("instructorId")
    .eq("id", courseId)
    .maybeSingle();
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
    const { data: course } = await supabaseAdmin!
      .from("Course")
      .select("id, isPublished")
      .eq("id", courseId)
      .maybeSingle();

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

    let lectureQuery = supabaseAdmin!
      .from("Lecture")
      .select(lectureSelect.join(","))
      .eq("courseId", courseId)
      .order("orderIndex", { ascending: true });

    if (!isOwner) {
      lectureQuery = lectureQuery.eq("isPublished", true);
    }

    const { data: lectures, error: lecErr } = await lectureQuery;
    if (lecErr) throw lecErr;

    // Get course progress if user is enrolled
    let progress: Record<string, any> = {};
    if (auth && !isOwner) {
      const { data: enrollment } = await supabaseAdmin!
        .from("Enrollment")
        .select("*")
        .eq("userId", auth.userId)
        .eq("courseId", courseId)
        .maybeSingle();

      if (enrollment) {
        const { data: userProgress } = await supabaseAdmin!
          .from("UserProgress")
          .select("lectureId, isCompleted, watchPercentage")
          .eq("userId", auth.userId);

        // Filter to lectures in this course (simplified - UserProgress is filtered by enrollment)
        if (userProgress) {
          progress = userProgress.reduce(
            (acc: any, p: any) => {
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

    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      const { data: lastLecture } = await supabaseAdmin!
        .from("Lecture")
        .select("orderIndex")
        .eq("courseId", courseId)
        .order("orderIndex", { ascending: false })
        .limit(1)
        .maybeSingle();
      finalOrderIndex = (lastLecture?.orderIndex ?? -1) + 1;
    }

    const { data: lecture, error: createErr } = await supabaseAdmin!
      .from("Lecture")
      .insert({
        courseId,
        title,
        description: description || null,
        videoUrl: "",
        cloudinaryPublicId: "",
        orderIndex: finalOrderIndex,
        isPublished: false,
      })
      .select(
        "id, courseId, title, description, orderIndex, isPublished, createdAt",
      )
      .single();

    if (createErr) throw createErr;

    // Update course video count
    const { data: courseData } = await supabaseAdmin!
      .from("Course")
      .select("videoCount")
      .eq("id", courseId)
      .single();
    await supabaseAdmin!
      .from("Course")
      .update({ videoCount: (courseData?.videoCount || 0) + 1 })
      .eq("id", courseId);

    console.log(`[AUDIT] Lecture created: ${lecture.id} in course ${courseId}`);

    return successResponse(lecture, "Lecture created successfully", 201);
  } catch (error) {
    console.error("[CREATE LECTURE ERROR]", error);
    return handleApiError(error);
  }
}
