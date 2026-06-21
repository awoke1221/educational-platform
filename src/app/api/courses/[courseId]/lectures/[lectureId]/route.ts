import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { BunnyService } from "@/lib/bunny";
import { env } from "@/config/env";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// Helper: Check lecture & course ownership
// ============================================

async function canManageLecture(
  courseId: string,
  lectureId: string,
  userId: string,
  userRole: string,
): Promise<{ allowed: boolean; lecture: any }> {
  if (userRole === "admin") {
    const { data: lecture } = await supabaseAdmin!
      .from("Lecture")
      .select("*")
      .eq("id", lectureId)
      .maybeSingle();
    return { allowed: !!lecture, lecture };
  }

  const { data: course } = await supabaseAdmin!
    .from("Course")
    .select("instructorId")
    .eq("id", courseId)
    .maybeSingle();

  if (!course || course.instructorId !== userId) {
    return { allowed: false, lecture: null };
  }

  const { data: lecture } = await supabaseAdmin!
    .from("Lecture")
    .select("*")
    .eq("id", lectureId)
    .maybeSingle();

  return { allowed: !!lecture, lecture };
}

// ============================================
// GET /api/courses/[courseId]/lectures/[lectureId]
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lectureId: string }> },
) {
  try {
    const { courseId, lectureId } = await params;
    const auth = await verifyAuth(request);

    // Require authentication
    if (!auth) {
      return errorResponse("Unauthorized. Please log in first.", 401);
    }

    // Check enrollment (admin and instructor bypass)
    let isAdminOrInstructor = auth.role === "admin";

    if (!isAdminOrInstructor) {
      const { data: course } = await supabaseAdmin!
        .from("Course")
        .select("instructorId")
        .eq("id", courseId)
        .maybeSingle();
      isAdminOrInstructor = course?.instructorId === auth.userId;
    }

    if (!isAdminOrInstructor) {
      const { data: enrollment } = await supabaseAdmin!
        .from("Enrollment")
        .select("status")
        .eq("userId", auth.userId)
        .eq("courseId", courseId)
        .maybeSingle();

      if (!enrollment || enrollment.status !== "active") {
        return errorResponse(
          "You don't have active access to this course. Please complete payment and wait for admin approval.",
          403,
        );
      }
    }

    // Try DB first
    try {
      const { data: lecture } = await supabaseAdmin!
        .from("Lecture")
        .select("*")
        .eq("id", lectureId)
        .maybeSingle();

      if (lecture && lecture.courseId === courseId) {
        let streamingUrl = null;
        let signedVideoUrl = null;
        if (lecture.cloudinaryPublicId) {
          streamingUrl = BunnyService.getStreamingUrl(
            lecture.cloudinaryPublicId,
          );
          signedVideoUrl = BunnyService.generateSignedUrl(
            lecture.cloudinaryPublicId,
            { expiresIn: 86400 },
          );
        }
        return successResponse(
          { ...lecture, streamingUrl, signedVideoUrl },
          "Lecture retrieved",
        );
      }
    } catch {
      /* DB unavailable, fallback to Cloudinary */
    }

    // Bunny fallback: generate lecture from Bunny demo video
    if (courseId.startsWith("bunny-demo-") && env.bunny.demoVideoUrl) {
      return successResponse(
        {
          id: lectureId,
          title: courseId.replace("bunny-demo-", "").replace(/-/g, " "),
          description: "ይህን ቪዲዮ በመመልከት ትምህርትዎን ይቀጥሉ",
          duration: 60,
          orderIndex: 1,
          videoUrl: env.bunny.demoVideoUrl,
          cloudinaryPublicId: "demo-bunny",
          streamingUrl: env.bunny.demoVideoUrl,
          signedVideoUrl: env.bunny.demoVideoUrl,
          isPublished: true,
          courseId,
          course: {
            id: courseId,
            title: "Demo Course",
            instructorId: auth?.userId || "",
          },
          userProgress: null,
        },
        "Demo lecture from Bunny",
      );
    }
  } catch (error) {
    console.error("[GET LECTURE ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// PUT /api/courses/[courseId]/lectures/[lectureId]
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lectureId: string }> },
) {
  try {
    const { courseId, lectureId } = await params;

    // Verify auth & ownership
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const { allowed, lecture } = await canManageLecture(
      courseId,
      lectureId,
      auth.userId,
      auth.role,
    );
    if (!allowed || !lecture) {
      return errorResponse(
        "You don't have permission to manage this lecture",
        403,
      );
    }

    const body = await request.json().catch(() => ({}));

    // Handle different update actions
    if (body.action === "video") {
      // Update video URL from Cloudinary upload
      const { data: updated, error: videoUpdateErr } = await supabaseAdmin!
        .from("Lecture")
        .update({
          videoUrl: body.videoUrl,
          cloudinaryPublicId: body.cloudinaryPublicId,
          duration: body.duration || lecture.duration,
          videoSize: body.videoSize
            ? String(body.videoSize)
            : lecture.videoSize,
          isPublished: true,
        })
        .eq("id", lectureId)
        .select(
          "id, title, videoUrl, cloudinaryPublicId, duration, isPublished",
        )
        .single();

      if (videoUpdateErr) throw videoUpdateErr;

      // Update course total duration
      const { data: allLectures } = await supabaseAdmin!
        .from("Lecture")
        .select("duration")
        .eq("courseId", courseId);
      const totalDuration = (allLectures || []).reduce(
        (sum: number, l: any) => sum + (l.duration || 0),
        0,
      );

      await supabaseAdmin!
        .from("Course")
        .update({ duration: totalDuration })
        .eq("id", courseId);

      return successResponse(updated, "Video uploaded successfully");
    }

    // Standard update (title, description, orderIndex, isPublished)
    const updateData: Record<string, any> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;
    if (body.isPublished !== undefined)
      updateData.isPublished = body.isPublished;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const { data: updated, error: stdUpdateErr } = await supabaseAdmin!
      .from("Lecture")
      .update(updateData)
      .eq("id", lectureId)
      .select("id, title, description, orderIndex, isPublished, updatedAt")
      .single();

    if (stdUpdateErr) throw stdUpdateErr;

    console.log(`[AUDIT] Lecture updated: ${lectureId} in course ${courseId}`);

    return successResponse(updated, "Lecture updated successfully");
  } catch (error) {
    console.error("[UPDATE LECTURE ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// DELETE /api/courses/[courseId]/lectures/[lectureId]
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lectureId: string }> },
) {
  try {
    const { courseId, lectureId } = await params;

    // Verify auth & ownership
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const { allowed, lecture } = await canManageLecture(
      courseId,
      lectureId,
      auth.userId,
      auth.role,
    );
    if (!allowed || !lecture) {
      return errorResponse(
        "You don't have permission to manage this lecture",
        403,
      );
    }

    // Delete video from Bunny if exists
    if (lecture.cloudinaryPublicId) {
      await BunnyService.deleteFile(lecture.cloudinaryPublicId);
    }

    await supabaseAdmin!.from("Lecture").delete().eq("id", lectureId);

    const { data: remainingLectures } = await supabaseAdmin!
      .from("Lecture")
      .select("duration")
      .eq("courseId", courseId);

    await supabaseAdmin!
      .from("Course")
      .update({
        videoCount: (remainingLectures || []).length,
        duration: (remainingLectures || []).reduce(
          (sum: number, l: any) => sum + (l.duration || 0),
          0,
        ),
      })
      .eq("id", courseId);

    console.log(
      `[AUDIT] Lecture deleted: ${lectureId} from course ${courseId}`,
    );

    return successResponse(null, "Lecture deleted successfully");
  } catch (error) {
    console.error("[DELETE LECTURE ERROR]", error);
    return handleApiError(error);
  }
}
