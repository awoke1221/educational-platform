// ============================================
// 🐰 Bunny Stream → Course Lecture Sync Script
// ============================================
// Run: node --require dotenv/config scripts/sync-bunny-videos.mjs
// ============================================

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

// ============================================
// Config
// ============================================
const TARGET_COURSE_ID = "e5d469d6-c661-4d15-986c-7a3fa67bcaad";
const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY;
const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;
const BUNNY_STREAM_HOSTNAME =
  process.env.BUNNY_STREAM_HOSTNAME || "video.bunnycdn.com";
const BUNNY_STREAM_CDN_HOSTNAME = process.env.BUNNY_STREAM_CDN_HOSTNAME || "";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ============================================
// Bunny Stream API Helpers
// ============================================
function getApiBase() {
  return `https://${BUNNY_STREAM_HOSTNAME}/library/${BUNNY_STREAM_LIBRARY_ID}`;
}

function getHeaders() {
  return {
    accept: "application/json",
    "content-type": "application/json",
    AccessKey: BUNNY_STREAM_API_KEY,
  };
}

function getHlsUrl(videoId) {
  if (!videoId) return "";
  if (BUNNY_STREAM_CDN_HOSTNAME) {
    return `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/playlist.m3u8`;
  }
  return `https://iframe.mediadelivery.net/${BUNNY_STREAM_LIBRARY_ID}/${videoId}/playlist.m3u8`;
}

function getThumbnailUrl(videoId) {
  if (!videoId) return "";
  if (BUNNY_STREAM_CDN_HOSTNAME) {
    return `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/thumbnail.jpg`;
  }
  return `https://iframe.mediadelivery.net/embed/${BUNNY_STREAM_LIBRARY_ID}/${videoId}/thumbnail.jpg`;
}

async function listAllVideos() {
  const allVideos = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `${getApiBase()}/videos?page=${page}&itemsPerPage=100`;
    const res = await fetch(url, { method: "GET", headers: getHeaders() });
    if (!res.ok)
      throw new Error(`Bunny API error: ${res.status} ${await res.text()}`);
    const result = await res.json();
    allVideos.push(...result.items);
    totalPages = Math.ceil(result.totalItems / result.itemsPerPage);
    page++;
  } while (page <= totalPages);

  return allVideos;
}

// ============================================
// Grouping Helpers
// ============================================
function extractGroupInfo(title) {
  const patterns = [
    /^(Module|Chapter|Section|Part|Day|Lesson|Unit)\s*[#:]?\s*(\d+)\s*[-–:.]?\s*(.+)$/i,
    /^(\d+)[\s.)-]\s*(.+)$/,
    /^Video\s*[#:]?\s*(\d+)\s*[-–:.]?\s*(.+)$/i,
    /^TikTok\s*[#:]?\s*(\d+)\s*[-–:.]?\s*(.+)$/i,
    /^(\d+)\s*[-–]\s*(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const prefix = title.match(/^(\w+)/)?.[1] || "Module";
      return { group: prefix, order: parseInt(match[1]) };
    }
  }

  const keywordGroups = [
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

  for (const [regex, label] of keywordGroups) {
    if (regex.test(title)) return { group: label, order: null };
  }

  return { group: "General", order: null };
}

function cleanTitle(title) {
  return title
    .replace(
      /^(Module|Chapter|Section|Part|Day|Lesson|Unit)\s*[#:]?\s*\d+\s*[-–:.]?\s*/i,
      "",
    )
    .replace(/^\d+[\s.)-]\s*/, "")
    .replace(/^Video\s*[#:]?\s*\d+\s*[-–:.]?\s*/i, "")
    .replace(/^TikTok\s*[#:]?\s*\d+\s*[-–:.]?\s*/i, "")
    .replace(/^\d+\s*[-–]\s*/, "")
    .trim();
}

// ============================================
// Main
// ============================================
async function main() {
  console.log("🐰 Bunny Stream Video Sync");
  console.log("==========================");
  console.log("");

  // Check config
  if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID) {
    console.error(
      "❌ Bunny Stream not configured. Set BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID.",
    );
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Supabase not configured.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Fetch existing lectures
  console.log("📚 Fetching existing lectures...");
  const { data: existingLectures, error: lecErr } = await supabase
    .from("Lecture")
    .select("id, title, cloudinaryPublicId, orderIndex")
    .eq("courseId", TARGET_COURSE_ID)
    .order("orderIndex");

  if (lecErr) throw lecErr;
  console.log(`   Found ${existingLectures?.length || 0} existing lecture(s)`);

  const existingIds = new Set(
    (existingLectures || []).map((l) => l.cloudinaryPublicId).filter(Boolean),
  );

  // 2. Fetch course
  const { data: course } = await supabase
    .from("Course")
    .select("id, title, videoCount, duration")
    .eq("id", TARGET_COURSE_ID)
    .single();

  console.log(
    `   Course: "${course?.title}" (${course?.videoCount || 0} videos, ${course?.duration || 0}s)`,
  );
  console.log("");

  // 3. Fetch all Bunny Stream videos
  console.log("🎬 Fetching Bunny Stream videos...");
  const allVideos = await listAllVideos();
  console.log(`   Found ${allVideos.length} total Bunny video(s)`);
  console.log("");

  // 4. Find orphans
  const orphanVideos = allVideos.filter((v) => !existingIds.has(v.guid));
  console.log(`📦 Orphan videos (not yet in lectures): ${orphanVideos.length}`);
  console.log("");

  if (orphanVideos.length === 0) {
    console.log("🎉 All videos already synced! Nothing to do.");
    return;
  }

  // Print orphan videos
  console.log("Orphan videos to import:");
  orphanVideos.forEach((v, i) => {
    const { group, order } = extractGroupInfo(v.title);
    console.log(
      `   ${i + 1}. "${v.title}" (${group})${order ? ` [#${order}]` : ""} | ${v.length ? Math.round(v.length) + "s" : "?"}`,
    );
  });
  console.log("");

  // 5. Group and order
  const grouped = new Map();
  const ungrouped = [];

  for (const video of orphanVideos) {
    const { group, order } = extractGroupInfo(video.title);
    if (group === "General" && !order) {
      ungrouped.push({ video, group, order });
    } else {
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group).push({ video, group, order });
    }
  }

  // Sort within groups
  for (const [, items] of grouped) {
    items.sort((a, b) => {
      if (a.order !== null && b.order !== null) return a.order - b.order;
      if (a.order !== null) return -1;
      if (b.order !== null) return 1;
      return a.video.title.localeCompare(b.video.title);
    });
  }

  ungrouped.sort((a, b) => a.video.title.localeCompare(b.video.title));

  // Build ordered list
  const orderedItems = [];
  const groupKeys = Array.from(grouped.keys()).sort();
  for (const key of groupKeys) {
    const items = grouped.get(key);
    orderedItems.push({ isHeader: true, group: key });
    for (const item of items) {
      orderedItems.push({
        video: item.video,
        group: item.group,
        isHeader: false,
      });
    }
  }

  if (ungrouped.length > 0) {
    orderedItems.push({ isHeader: true, group: "Additional Videos" });
    for (const item of ungrouped) {
      orderedItems.push({
        video: item.video,
        group: item.group,
        isHeader: false,
      });
    }
  }

  // 6. Create lectures
  console.log("📝 Creating lectures...");
  const now = new Date().toISOString();
  let nextOrderIndex = existingLectures?.length || 0;
  let created = 0;
  let failed = 0;

  for (const item of orderedItems) {
    if (item.isHeader) continue; // Skip group headers

    const video = item.video;
    const lectureTitle = cleanTitle(video.title) || video.title;
    const duration = video.length ? Math.round(video.length) : null;

    try {
      const { data: lecture, error } = await supabase
        .from("Lecture")
        .insert({
          id: crypto.randomUUID(),
          courseId: TARGET_COURSE_ID,
          title: lectureTitle,
          description: `Imported from Bunny Stream. Original: "${video.title}"`,
          videoUrl: getHlsUrl(video.guid),
          cloudinaryPublicId: video.guid,
          duration: duration,
          orderIndex: nextOrderIndex,
          isPublished: true,
          videoSize: null,
          createdAt: now,
          updatedAt: now,
        })
        .select("id, title, orderIndex")
        .single();

      if (error) throw error;

      console.log(
        `   ✅ #${nextOrderIndex} "${lectureTitle}" (${duration ? duration + "s" : "?"})`,
      );
      created++;
      nextOrderIndex++;
    } catch (err) {
      console.error(`   ❌ "${video.title}": ${err.message}`);
      failed++;
    }
  }

  // 7. Update course metadata
  if (created > 0) {
    const { data: allLectures } = await supabase
      .from("Lecture")
      .select("duration")
      .eq("courseId", TARGET_COURSE_ID);

    const totalDuration = (allLectures || []).reduce(
      (sum, l) => sum + (l.duration || 0),
      0,
    );

    await supabase
      .from("Course")
      .update({
        videoCount: (existingLectures?.length || 0) + created,
        duration: totalDuration,
        updatedAt: now,
      })
      .eq("id", TARGET_COURSE_ID);
  }

  // Summary
  console.log("");
  console.log("=".repeat(50));
  console.log(`✅ Summary:`);
  console.log(`   Created: ${created} lecture(s)`);
  console.log(`   Failed: ${failed}`);
  console.log(
    `   Total lectures now: ${(existingLectures?.length || 0) + created}`,
  );
  console.log(`   Course: "${course?.title}"`);
  console.log("=".repeat(50));
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
