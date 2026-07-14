// src/app/api/courses/[courseId]/lectures/route.ts
// Lecture Listing & Creation API

import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { resolveUserIdForAuth } from "@/lib/auth/userLookup";
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

    // Check authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized. Please log in first.", 401);
    }

    // Check enrollment (admin and instructor bypass)
    let isOwner = auth.role === "admin";

    if (!isOwner) {
      const { data: courseData } = await supabaseAdmin!
        .from("Course")
        .select("instructorId")
        .eq("id", courseId)
        .maybeSingle();
      isOwner = courseData?.instructorId === auth.userId;
    }

    if (!course.isPublished && !isOwner) {
      return errorResponse("Course is not published", 403);
    }

    // Non-owner/non-instructor users must have active enrollment
    if (!isOwner) {
      const resolvedUserId = await resolveUserIdForAuth(
        auth.userId,
        auth.email,
      );
      const lookupUserId = resolvedUserId || auth.userId;

      const { data: enrollment } = await supabaseAdmin!
        .from("Enrollment")
        .select("status")
        .eq("userId", lookupUserId)
        .eq("courseId", courseId)
        .maybeSingle();

      if (!enrollment || enrollment.status !== "active") {
        return errorResponse(
          "You don't have active access to this course. Please complete payment and wait for admin approval.",
          403,
        );
      }
    }

    // Only show published lectures to non-owners
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

    // Include video details for course owners and enrolled students
    lectureSelect.videoUrl = true;
    lectureSelect.cloudinaryPublicId = true; // Bunny storage path
    lectureSelect.videoSize = true;

    let lectureQuery = supabaseAdmin!
      .from("Lecture")
      .select(Object.keys(lectureSelect).join(","))
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
      const resolvedUserId = await resolveUserIdForAuth(
        auth.userId,
        auth.email,
      );
      const lookupUserId = resolvedUserId || auth.userId;

      const { data: enrollment } = await supabaseAdmin!
        .from("Enrollment")
        .select("*")
        .eq("userId", lookupUserId)
        .eq("courseId", courseId)
        .maybeSingle();

      if (enrollment) {
        const { data: userProgress } = await supabaseAdmin!
          .from("UserProgress")
          .select("lectureId, isCompleted, watchPercentage")
          .eq("userId", lookupUserId);

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

    const now = new Date().toISOString();

    const { data: lecture, error: createErr } = await supabaseAdmin!
      .from("Lecture")
      .insert({
        id: crypto.randomUUID(),
        courseId,
        title,
        description: description || null,
        videoUrl: "",
        cloudinaryPublicId: "",
        orderIndex: finalOrderIndex,
        isPublished: false,
        createdAt: now,
        updatedAt: now,
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
