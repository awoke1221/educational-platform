// ============================================
// 🎯 Lecture Reorder API
// ============================================
// PATCH /api/courses/[courseId]/lectures/reorder
// Body: { lectureIds: string[] }
// Reorders lectures in the order of the provided IDs
// ============================================

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    // Verify ownership
    const isAdmin = auth.role === "admin";
    if (!isAdmin) {
      const { data: course } = await supabaseAdmin!
        .from("Course")
        .select("instructorId")
        .eq("id", courseId)
        .maybeSingle();
      if (!course || course.instructorId !== auth.userId) {
        return errorResponse(
          "You don't have permission to manage this course",
          403,
        );
      }
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.lectureIds)) {
      return errorResponse("Provide lectureIds array", 400);
    }

    const { lectureIds } = body as { lectureIds: string[] };

    // Verify all lectures belong to this course
    const { data: existingLectures } = await supabaseAdmin!
      .from("Lecture")
      .select("id, courseId")
      .in("id", lectureIds);

    if (!existingLectures || existingLectures.length !== lectureIds.length) {
      return errorResponse("Some lectures not found", 400);
    }

    const invalidLecture = existingLectures.find(
      (l: any) => l.courseId !== courseId,
    );
    if (invalidLecture) {
      return errorResponse("Lecture does not belong to this course", 400);
    }

    // Update orderIndex for each lecture
    const updates = lectureIds.map((id: string, index: number) => ({
      id,
      orderIndex: index + 1,
    }));

    for (const update of updates) {
      await supabaseAdmin!
        .from("Lecture")
        .update({ orderIndex: update.orderIndex })
        .eq("id", update.id);
    }

    console.log(
      `[AUDIT] Lectures reordered for course ${courseId} by user ${auth.userId}`,
    );

    return successResponse(
      { lectureIds, reordered: true },
      "Lectures reordered successfully",
    );
  } catch (error) {
    console.error("[REORDER LECTURES ERROR]", error);
    return handleApiError(error);
  }
}
