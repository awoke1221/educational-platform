// ============================================
// 🎬 Public Video Library API
// ============================================
// Lists all lectures (videos) available to the user
// across all courses they are enrolled in.
//
// GET /api/videos — All videos user has access to
// ============================================

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { resolveUserIdForAuth } from "@/lib/auth/userLookup";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { BunnyStreamService } from "@/lib/bunny";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const resolvedUserId = await resolveUserIdForAuth(auth.userId, auth.email);
    const lookupUserId = resolvedUserId || auth.userId;

    // Admin/instructor: see ALL published lectures across all courses
    if (auth.role === "admin" || auth.role === "instructor") {
      const { data: lectures, error } = await supabaseAdmin!
        .from("Lecture")
        .select(
          `
          id,
          title,
          description,
          duration,
          orderIndex,
          isPublished,
          cloudinaryPublicId,
          videoUrl,
          videoSize,
          views,
          courseId,
          createdAt
        `,
        )
        .eq("isPublished", true)
        .order("createdAt", { ascending: false });

      if (error) throw error;

      // Enrich with course info
      const courseIds = Array.from(
        new Set((lectures || []).map((l: any) => l.courseId).filter(Boolean)),
      );

      let courseMap = new Map<string, any>();
      if (courseIds.length > 0) {
        const { data: courses } = await supabaseAdmin!
          .from("Course")
          .select("id, title, coverImage")
          .in("id", courseIds as any[]);

        if (courses) {
          courseMap = new Map(courses.map((c: any) => [c.id, c]));
        }
      }

      const enriched = (lectures || []).map((lec: any) => {
        const course = courseMap.get(lec.courseId);
        const streamVideoId = lec.cloudinaryPublicId;
        return {
          ...lec,
          courseTitle: course?.title || "Unknown",
          courseCover: course?.coverImage || null,
          hlsUrl: streamVideoId
            ? BunnyStreamService.getHlsUrl(streamVideoId)
            : null,
          embedUrl: streamVideoId
            ? BunnyStreamService.getEmbedUrl(streamVideoId)
            : null,
          thumbnailUrl: streamVideoId
            ? BunnyStreamService.getThumbnailUrl(streamVideoId)
            : null,
        };
      });

      return successResponse(
        { videos: enriched, total: enriched.length },
        "Video library retrieved",
      );
    }

    // Regular user: only see lectures from courses they're enrolled in
    const { data: enrollments } = await supabaseAdmin!
      .from("Enrollment")
      .select("courseId")
      .eq("userId", lookupUserId)
      .eq("status", "active");

    const enrolledCourseIds = (enrollments || []).map((e: any) => e.courseId);

    if (enrolledCourseIds.length === 0) {
      return successResponse({ videos: [], total: 0 }, "No enrolled courses");
    }

    const { data: lectures, error } = await supabaseAdmin!
      .from("Lecture")
      .select(
        `
        id,
        title,
        description,
        duration,
        orderIndex,
        isPublished,
        cloudinaryPublicId,
        videoUrl,
        views,
        courseId,
        createdAt
      `,
      )
      .eq("isPublished", true)
      .in("courseId", enrolledCourseIds as any[])
      .order("createdAt", { ascending: false });

    if (error) throw error;

    // Enrich with course info
    const { data: courses } = await supabaseAdmin!
      .from("Course")
      .select("id, title, coverImage")
      .in("id", enrolledCourseIds as any[]);

    const courseMap = new Map((courses || []).map((c: any) => [c.id, c]));

    const enriched = (lectures || []).map((lec: any) => {
      const course = courseMap.get(lec.courseId);
      const streamVideoId = lec.cloudinaryPublicId;
      return {
        ...lec,
        courseTitle: course?.title || "Unknown",
        courseCover: course?.coverImage || null,
        hlsUrl: streamVideoId
          ? BunnyStreamService.getHlsUrl(streamVideoId)
          : null,
        embedUrl: streamVideoId
          ? BunnyStreamService.getEmbedUrl(streamVideoId)
          : null,
        thumbnailUrl: streamVideoId
          ? BunnyStreamService.getThumbnailUrl(streamVideoId)
          : null,
      };
    });

    return successResponse(
      { videos: enriched, total: enriched.length },
      "Video library retrieved",
    );
  } catch (error) {
    console.error("[VIDEO LIBRARY ERROR]", error);
    return handleApiError(error);
  }
}
