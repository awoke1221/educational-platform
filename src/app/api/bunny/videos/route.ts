// ============================================
// 🐰 Bunny Stream Video Library API
// ============================================
// Lists ALL Bunny Stream videos enriched with
// lecture/course association data.
// ============================================
// GET /api/bunny/videos
//   - Lists ALL Bunny Stream videos
//   - Cross-references with Lecture table
//   - Shows course association for each video
//
// GET /api/bunny/videos?orphans=true
//   - Lists ONLY videos NOT yet linked to any lecture
// ============================================

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { BunnyStreamService } from "@/lib/bunny";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);
    if (auth.role !== "admin" && auth.role !== "instructor") {
      return errorResponse("Access denied", 403);
    }

    if (!BunnyStreamService.isConfigured()) {
      return errorResponse("Bunny Stream is not configured", 500);
    }

    const orphansOnly = request.nextUrl.searchParams.get("orphans") === "true";

    // ── 1. Fetch ALL Bunny Stream videos ────────────
    const allVideos: any[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const result = await BunnyStreamService.listVideos(page, 100);
      allVideos.push(
        ...result.items.map((v) => ({
          guid: v.guid,
          title: v.title,
          length: v.length,
          status: v.status,
          views: v.views,
          dateUploaded: v.dateUploaded,
          encodeProgress: v.encodeProgress,
          hlsUrl: BunnyStreamService.getHlsUrl(v.guid),
          embedUrl: BunnyStreamService.getEmbedUrl(v.guid),
          thumbnailUrl: BunnyStreamService.getThumbnailUrl(v.guid),
        })),
      );
      totalPages = Math.ceil(result.totalItems / result.itemsPerPage);
      page++;
    } while (page <= totalPages);

    // ── 2. Fetch ALL existing lectures ──────────────
    const { data: allLectures } = await supabaseAdmin!
      .from("Lecture")
      .select("id, title, courseId, cloudinaryPublicId, orderIndex");

    // Build a map: cloudinaryPublicId → lecture info
    const lectureMap = new Map<string, any>();
    const linkedVideoIds = new Set<string>();

    if (allLectures) {
      for (const lec of allLectures) {
        if (lec.cloudinaryPublicId) {
          linkedVideoIds.add(lec.cloudinaryPublicId);
          lectureMap.set(lec.cloudinaryPublicId, lec);
        }
      }
    }

    // ── 3. Fetch course info for linked lectures ───
    const courseIds = Array.from(
      new Set(allLectures?.map((l: any) => l.courseId).filter(Boolean) || []),
    );

    let courseMap = new Map<string, any>();
    if (courseIds.length > 0) {
      const { data: courses } = await supabaseAdmin!
        .from("Course")
        .select("id, title")
        .in("id", courseIds as any[]);

      if (courses) {
        courseMap = new Map(courses.map((c: any) => [c.id, c]));
      }
    }

    // ── 4. Enrich videos with course/lecture info ──
    const enrichedVideos = allVideos.map((video) => {
      const lecture = lectureMap.get(video.guid);
      const isLinked = linkedVideoIds.has(video.guid);

      return {
        ...video,
        isLinked,
        lecture: lecture
          ? {
              id: lecture.id,
              title: lecture.title,
              orderIndex: lecture.orderIndex,
              courseId: lecture.courseId,
              courseTitle: courseMap.get(lecture.courseId)?.title || "Unknown",
            }
          : null,
      };
    });

    // ── 5. Filter orphans if requested ─────────────
    const resultVideos = orphansOnly
      ? enrichedVideos.filter((v) => !v.isLinked)
      : enrichedVideos;

    return successResponse(
      {
        videos: resultVideos,
        total: resultVideos.length,
        linked: enrichedVideos.filter((v) => v.isLinked).length,
        orphans: enrichedVideos.filter((v) => !v.isLinked).length,
      },
      "Video library retrieved successfully",
    );
  } catch (error) {
    console.error("[VIDEO LIBRARY ERROR]", error);
    return handleApiError(error);
  }
}
