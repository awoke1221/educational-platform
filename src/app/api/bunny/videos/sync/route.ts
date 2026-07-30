// ============================================
// 🐰 Bunny Stream → Course Lecture Sync
// ============================================
// POST /api/bunny/videos/sync
//   - Fetches ALL Bunny Stream videos
//   - Creates Lecture records for orphan videos
//   - Auto-groups by title prefix patterns
//   - Auto-publishes lectures
//
// POST /api/bunny/videos/sync?dryRun=true
//   - Previews what would be synced without
//     actually creating lectures
// ============================================

import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { verifyAuth } from "@/lib/auth/middleware";
import { BunnyStreamService } from "@/lib/bunny";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// Configuration
// ============================================

// The TikTok For Personal course — ALL orphan videos go here
const TARGET_COURSE_ID = "e5d469d6-c661-4d15-986c-7a3fa67bcaad";

// ============================================
// Helpers
// ============================================

/**
 * Extract a group label from a video title by finding common prefixes.
 * e.g. "Module 1 - Introduction" → { group: "Module", order: 1 }
 * e.g. "Day 1: Getting Started" → { group: "Day", order: 1 }
 * e.g. "Part 2 - Advanced" → { group: "Part", order: 2 }
 * e.g. "Setup Tutorial" → { group: "General", order: null }
 */
function extractGroupInfo(
  title: string,
  index: number,
): { group: string; order: number | null } {
  // Try to extract numbered prefixes
  const patterns = [
    /^(?:Module|Module|ምዕራፍ|Chapter|Section|Part|Day|Lesson|ክፍል)\s*[#:]?\s*(\d+)\s*[-–:.]?\s*(.+)$/i,
    /^(\d+)[\s.)-]\s*(.+)$/, // "1. Introduction" or "1) Introduction"
    /^Video\s*[#:]?\s*(\d+)\s*[-–:.]?\s*(.+)$/i,
    /^TikTok\s*[#:]?\s*(\d+)\s*[-–:.]?\s*(.+)$/i,
    /^(\d+)\s*[-–]\s*(.+)$/, // "1 - Introduction"
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      // Determine group from prefix
      const prefix = title.match(/^(\w+)/)?.[1] || "Module";
      return { group: prefix, order: num };
    }
  }

  // Check for keyword-based groups
  const keywordGroups: [RegExp, string][] = [
    [/intro/i, "Introduction"],
    [/setup|install/i, "Setup"],
    [/basic|beginner|starter/i, "Basics"],
    [/advanced|expert|pro/i, "Advanced"],
    [/tips?|trick|hack/i, "Tips & Tricks"],
    [/tutorial|guide|how.?to/i, "Tutorials"],
    [/strategy|plan/i, "Strategies"],
    [/content|creation|create/i, "Content Creation"],
    [/edit/i, "Editing"],
    [/analytics|insight/i, "Analytics"],
    [/promot|market|grow/i, "Promotion & Growth"],
    [/monetiz|earn|money/i, "Monetization"],
  ];

  for (const [pattern, group] of keywordGroups) {
    if (pattern.test(title)) {
      return { group, order: null };
    }
  }

  return { group: "General", order: null };
}

/**
 * Clean a video title to make it a good lecture title.
 * Removes numbering prefixes that are redundant in a sequence.
 */
function cleanLectureTitle(title: string): string {
  return title
    .replace(
      /^(?:Module|ምዕራፍ|Chapter|Section|Part|Day|Lesson|ክፍል)\s*[#:]?\s*\d+\s*[-–:.]?\s*/i,
      "",
    )
    .replace(/^\d+[\s.)-]\s*/, "")
    .replace(/^Video\s*[#:]?\s*\d+\s*[-–:.]?\s*/i, "")
    .replace(/^TikTok\s*[#:]?\s*\d+\s*[-–:.]?\s*/i, "")
    .replace(/^\d+\s*[-–]\s*/, "")
    .trim();
}

// ============================================
// POST — Sync Bunny Stream videos to lectures
// ============================================

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);
    if (auth.role !== "admin" && auth.role !== "instructor") {
      return errorResponse("Access denied — admin or instructor only", 403);
    }

    if (!BunnyStreamService.isConfigured()) {
      return errorResponse("Bunny Stream is not configured", 500);
    }

    const isDryRun = request.nextUrl.searchParams.get("dryRun") === "true";

    // ── 1. Fetch ALL Bunny Stream videos ────────────
    const allVideos: any[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const result = await BunnyStreamService.listVideos(page, 100);
      allVideos.push(...result.items);
      totalPages = Math.ceil(result.totalItems / result.itemsPerPage);
      page++;
    } while (page <= totalPages);

    // ── 2. Fetch existing lectures for target course ─
    const { data: existingLectures, error: lecFetchErr } = await supabaseAdmin!
      .from("Lecture")
      .select("id, title, cloudinaryPublicId, orderIndex")
      .eq("courseId", TARGET_COURSE_ID)
      .order("orderIndex", { ascending: true });

    if (lecFetchErr) throw lecFetchErr;

    const existingIds = new Set(
      (existingLectures || [])
        .map((l: any) => l.cloudinaryPublicId)
        .filter(Boolean),
    );

    // ── 3. Identify orphan videos ──────────────────
    const orphanVideos = allVideos.filter((v: any) => !existingIds.has(v.guid));

    if (orphanVideos.length === 0) {
      return successResponse(
        {
          synced: 0,
          totalVideos: allVideos.length,
          existingLectures: existingLectures?.length || 0,
          message:
            "🎉 All Bunny Stream videos are already synced to the course!",
        },
        "All videos already synced",
      );
    }

    // ── 4. Auto-group videos by title patterns ─────
    const grouped = new Map<string, any[]>();
    const ungrouped: any[] = [];

    for (const video of orphanVideos) {
      const { group, order } = extractGroupInfo(video.title, 0);
      if (group === "General" && !order) {
        ungrouped.push({ video, group: "General", order: null });
      } else {
        const key = group;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push({ video, group, order });
      }
    }

    // Sort within each group by extracted order or alphabetically
    for (const [, items] of grouped) {
      items.sort((a, b) => {
        if (a.order !== null && b.order !== null) return a.order - b.order;
        if (a.order !== null) return -1;
        if (b.order !== null) return 1;
        return a.video.title.localeCompare(b.video.title);
      });
    }

    // Sort ungrouped alphabetically
    ungrouped.sort((a, b) => a.video.title.localeCompare(b.video.title));

    // ── 5. Build ordered list of items to create ───
    const orderedItems: { video: any; group: string }[] = [];

    // Interleave groups: all items from all groups in order
    const groupKeys = Array.from(grouped.keys()).sort();
    for (const key of groupKeys) {
      const items = grouped.get(key)!;
      const groupLabel = items[0]?.group || key;
      // Add a descriptive group header as first item
      orderedItems.push({
        video: null as any,
        group: groupLabel,
      });
      for (const item of items) {
        orderedItems.push({
          video: item.video,
          group: item.group,
        });
      }
    }

    // Add ungrouped items at the end
    if (ungrouped.length > 0) {
      orderedItems.push({
        video: null as any,
        group: "Additional Videos",
      });
      for (const item of ungrouped) {
        orderedItems.push({
          video: item.video,
          group: item.group,
        });
      }
    }

    // ── 6. Calculate starting orderIndex ───────────
    let nextOrderIndex = existingLectures?.length || 0;

    // Dry run — return preview only
    if (isDryRun) {
      const preview = orderedItems
        .filter((item) => item.video !== null)
        .map((item, i) => ({
          title: cleanLectureTitle(item.video.title),
          originalTitle: item.video.title,
          group: item.group,
          duration: item.video.length ? Math.round(item.video.length) : null,
          videoId: item.video.guid,
          orderIndex: nextOrderIndex + i + 1,
          thumbnailUrl: BunnyStreamService.getThumbnailUrl(item.video.guid),
        }));

      return successResponse(
        {
          dryRun: true,
          totalVideos: allVideos.length,
          existingLectures: existingLectures?.length || 0,
          orphansFound: orphanVideos.length,
          willCreate: orderedItems.filter((item) => item.video !== null).length,
          groups: groupKeys,
          preview,
        },
        "Dry run — no lectures were created. Review the preview below.",
      );
    }

    // ── 7. Create lectures for orphan videos ───────
    const now = new Date().toISOString();
    const createdLectures: any[] = [];
    const errors: { title: string; error: string }[] = [];
    let orderCounter = 0;

    for (const item of orderedItems) {
      // Skip group headers (no video)
      if (!item.video) continue;

      const video = item.video;
      const lectureTitle = cleanLectureTitle(video.title);
      const lectureDuration = video.length ? Math.round(video.length) : null;

      try {
        const { data: lecture, error: createErr } = await supabaseAdmin!
          .from("Lecture")
          .insert({
            id: crypto.randomUUID(),
            courseId: TARGET_COURSE_ID,
            title: lectureTitle || video.title,
            description: `Auto-imported from Bunny Stream. Original title: "${video.title}"`,
            videoUrl: BunnyStreamService.getHlsUrl(video.guid),
            cloudinaryPublicId: video.guid,
            duration: lectureDuration,
            orderIndex: nextOrderIndex + orderCounter,
            isPublished: true,
            videoSize: null,
            createdAt: now,
            updatedAt: now,
          })
          .select("id, title, orderIndex, isPublished, cloudinaryPublicId")
          .single();

        if (createErr) throw createErr;

        createdLectures.push(lecture);
        orderCounter++;
      } catch (err: any) {
        errors.push({
          title: video.title,
          error: err.message || "Unknown error",
        });
      }
    }

    // ── 8. Update course metadata ──────────────────
    if (createdLectures.length > 0) {
      // Recalculate total duration
      const { data: allCourseLectures } = await supabaseAdmin!
        .from("Lecture")
        .select("duration")
        .eq("courseId", TARGET_COURSE_ID);

      const totalDuration = (allCourseLectures || []).reduce(
        (sum: number, l: any) => sum + (l.duration || 0),
        0,
      );

      await supabaseAdmin!
        .from("Course")
        .update({
          videoCount: (existingLectures?.length || 0) + createdLectures.length,
          duration: totalDuration,
          updatedAt: now,
        })
        .eq("id", TARGET_COURSE_ID);
    }

    // ── 9. Build group summary ────────────────────
    const groupSummary = groupKeys.map((key) => ({
      group: key,
      count: grouped.get(key)?.length || 0,
    }));

    return successResponse(
      {
        synced: createdLectures.length,
        failed: errors.length,
        totalVideos: allVideos.length,
        existingLectures: existingLectures?.length || 0,
        totalLecturesNow:
          (existingLectures?.length || 0) + createdLectures.length,
        groups: groupSummary,
        errors: errors.length > 0 ? errors : undefined,
        courseId: TARGET_COURSE_ID,
        message: `✅ Successfully synced ${createdLectures.length} video(s) to the course!`,
      },
      `Synced ${createdLectures.length} video(s) to TikTok For Personal`,
    );
  } catch (error) {
    console.error("[BUNNY SYNC ERROR]", error);
    return handleApiError(error);
  }
}
