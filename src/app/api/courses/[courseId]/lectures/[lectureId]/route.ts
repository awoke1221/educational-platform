// src/app/api/courses/[courseId]/lectures/[lectureId]/route.ts
// Single Lecture API (GET, PUT, DELETE)

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/supabase";
import CloudinaryService from "@/lib/cloudinary";
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
    const lecture = await prisma.lecture.findUnique({
      where: { id: lectureId },
    });
    return { allowed: !!lecture, lecture };
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });

  if (!course || course.instructorId !== userId) {
    return { allowed: false, lecture: null };
  }

  const lecture = await prisma.lecture.findUnique({
    where: { id: lectureId },
  });

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

    // Try DB first
    try {
      const lecture = await prisma.lecture.findUnique({
        where: { id: lectureId },
        include: {
          course: { select: { instructorId: true, isPublished: true } },
        },
      });

      if (lecture && lecture.courseId === courseId) {
        let streamingUrl = null;
        let signedVideoUrl = null;
        if (lecture.cloudinaryPublicId) {
          streamingUrl = CloudinaryService.getStreamingUrl(
            lecture.cloudinaryPublicId,
          );
          signedVideoUrl = CloudinaryService.getSignedUrl(
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

    // Cloudinary fallback: generate lecture from Cloudinary video
    const allVideos = await CloudinaryService.searchResources(
      "resource_type:video",
      { maxResults: 10, resourceType: "video" },
    );

    // Extract video key from courseId (e.g., "cloudinary-samples-elephants" -> "elephants")
    const parts = courseId.replace("cloudinary-", "").split("-");
    const videoKey = parts[parts.length - 1];
    const video =
      allVideos.find((v: any) => v.public_id?.includes(videoKey)) ||
      allVideos[0];

    if (!video) return notFoundResponse("Lecture");

    const videoUrl = video.secure_url;
    const publicId = video.public_id;
    const streamingUrl = CloudinaryService.getStreamingUrl(publicId);

    return successResponse(
      {
        id: lectureId,
        title:
          parts
            .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(" ") || "Course Video",
        description: "ይህን ቪዲዮ በመመልከት ትምህርትዎን ይቀጥሉ",
        duration: video.duration ? Math.round(video.duration) : 0,
        orderIndex: 1,
        videoUrl,
        cloudinaryPublicId: publicId,
        streamingUrl,
        signedVideoUrl: streamingUrl,
        isPublished: true,
        courseId,
        course: {
          id: courseId,
          title: "Course",
          instructorId: auth?.userId || "",
        },
        userProgress: null,
      },
      "Lecture retrieved from Cloudinary",
    );
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
      const updated = await prisma.lecture.update({
        where: { id: lectureId },
        data: {
          videoUrl: body.videoUrl,
          cloudinaryPublicId: body.cloudinaryPublicId,
          duration: body.duration || lecture.duration,
          videoSize: body.videoSize
            ? BigInt(body.videoSize)
            : lecture.videoSize,
          isPublished: true,
        },
        select: {
          id: true,
          title: true,
          videoUrl: true,
          cloudinaryPublicId: true,
          duration: true,
          isPublished: true,
        },
      });

      // Update course total duration
      const allLectures = await prisma.lecture.findMany({
        where: { courseId },
        select: { duration: true },
      });
      const totalDuration = allLectures.reduce(
        (sum: number, l: { duration: number | null }) =>
          sum + (l.duration || 0),
        0,
      );

      await prisma.course.update({
        where: { id: courseId },
        data: { duration: totalDuration },
      });

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

    const updated = await prisma.lecture.update({
      where: { id: lectureId },
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        orderIndex: true,
        isPublished: true,
        updatedAt: true,
      },
    });

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

    // Delete video from Cloudinary if exists
    if (lecture.cloudinaryPublicId) {
      await CloudinaryService.deleteFile(lecture.cloudinaryPublicId, "video");
    }

    // Delete lecture
    await prisma.lecture.delete({
      where: { id: lectureId },
    });

    // Update course video count and duration
    const remainingLectures = await prisma.lecture.findMany({
      where: { courseId },
      select: { duration: true },
    });

    await prisma.course.update({
      where: { id: courseId },
      data: {
        videoCount: remainingLectures.length,
        duration: remainingLectures.reduce(
          (sum, l) => sum + (l.duration || 0),
          0,
        ),
      },
    });

    console.log(
      `[AUDIT] Lecture deleted: ${lectureId} from course ${courseId}`,
    );

    return successResponse(null, "Lecture deleted successfully");
  } catch (error) {
    console.error("[DELETE LECTURE ERROR]", error);
    return handleApiError(error);
  }
}
