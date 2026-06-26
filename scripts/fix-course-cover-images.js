// ============================================
// Fix Course Cover Images Script
// Uploads local cover images to Bunny CDN and
// updates the database with the correct URL.
// ============================================
// Usage: node scripts/fix-course-cover-images.js
// ============================================

const fs = require("fs");
const path = require("path");
const https = require("https");
require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
});

// ─── Config ───────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE; // https://ny.storage.bunnycdn.com/adonaytiktokacadamy
const PULL_ZONE_URL = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL; // https://adonaytiktokacadamy.b-cdn.net/

// ─── Courses to fix ──────────────────────────────────
// Maps course title -> local image file path (relative to project root)
const COURSES_TO_FIX = [
  {
    title: "TikTok For Personal",
    imagePath: "public/tiktok for persenal image.jpg",
    useExact: true,
  },
  {
    title: "TikTok For Business",
    imagePath: "public/tiktok for business course image.jpg",
    useExact: true,
  },
];

// ─── Helpers ─────────────────────────────────────────

function extractStorageZoneName(storageZoneUrl) {
  try {
    const url = new URL(storageZoneUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1];
  } catch {
    return storageZoneUrl;
  }
}

function extractStorageApiBase(storageZoneUrl) {
  try {
    const url = new URL(storageZoneUrl);
    return `${url.protocol}//${url.hostname}`;
  } catch {
    return "https://ny.storage.bunnycdn.com";
  }
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return mimeMap[ext] || "image/jpeg";
}

/**
 * Upload a file to Bunny Storage
 */
async function uploadToBunny(buffer, mimeType, storagePath) {
  const storageZoneName = extractStorageZoneName(BUNNY_STORAGE_ZONE);
  const storageApiBase = extractStorageApiBase(BUNNY_STORAGE_ZONE);

  const cleaned = storagePath.replace(/^\/+/, "");
  const encoded = cleaned
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  const url = `${storageApiBase}/${encodeURIComponent(storageZoneName)}/${encoded}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: BUNNY_ACCESS_KEY,
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Bunny upload failed (${response.status}): ${text}`);
  }

  // Build the CDN URL
  const base = PULL_ZONE_URL.endsWith("/")
    ? PULL_ZONE_URL
    : `${PULL_ZONE_URL}/`;
  const cdnUrl = `${base}${encoded}`;

  console.log(`  ✅ Uploaded to Bunny: ${cdnUrl}`);
  return cdnUrl;
}

/**
 * Query Supabase for a course by title
 */
async function findCourseByTitle(title, useExact) {
  const op = useExact ? "eq" : "ilike";
  const val = useExact ? title : `%${title}%`;
  const url = `${SUPABASE_URL}/rest/v1/Course?title=${op}.${encodeURIComponent(val)}&select=id,title,coverImage`;

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase query failed (${response.status}): ${text}`);
  }

  const courses = await response.json();
  return courses && courses.length > 0 ? courses[0] : null;
}

/**
 * Update a course's coverImage in Supabase
 */
async function updateCourseCoverImage(courseId, coverImageUrl) {
  const url = `${SUPABASE_URL}/rest/v1/Course?id=eq.${courseId}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      coverImage: coverImageUrl,
      updatedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase update failed (${response.status}): ${text}`);
  }

  console.log(`  ✅ Database updated for course ${courseId}`);
}

// ─── Main ────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  Fix Course Cover Images");
  console.log("=".repeat(60));
  console.log();

  // Validate env vars
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing Supabase configuration in .env");
    process.exit(1);
  }
  if (!BUNNY_ACCESS_KEY || !BUNNY_STORAGE_ZONE || !PULL_ZONE_URL) {
    console.error("❌ Missing Bunny configuration in .env");
    process.exit(1);
  }

  for (const courseEntry of COURSES_TO_FIX) {
    console.log(`\n📦 Processing: "${courseEntry.title}"`);
    console.log(`   Local image: ${courseEntry.imagePath}`);

    // 1. Check local file exists
    const fullPath = path.resolve(__dirname, "..", courseEntry.imagePath);
    if (!fs.existsSync(fullPath)) {
      console.error(`   ❌ Local image not found at: ${fullPath}`);
      continue;
    }

    // 2. Find course in database
    console.log("   🔍 Searching database...");
    let course;
    try {
      course = await findCourseByTitle(courseEntry.title, courseEntry.useExact);
    } catch (err) {
      console.error(`   ❌ Failed to query database: ${err.message}`);
      continue;
    }

    if (!course) {
      console.error(
        `   ❌ Course "${courseEntry.title}" not found in database`,
      );
      continue;
    }

    console.log(`   ✅ Found course: ${course.id}`);
    console.log(`   Current coverImage: ${course.coverImage || "(empty)"}`);

    // 4. Upload image to Bunny
    console.log("   📤 Uploading to Bunny CDN...");
    const buffer = fs.readFileSync(fullPath);
    const mimeType = getMimeType(courseEntry.imagePath);
    const filename = path.basename(courseEntry.imagePath);
    const storagePath = `educational-platform/covers/fix/${Date.now()}-${filename}`;

    let cdnUrl;
    try {
      cdnUrl = await uploadToBunny(buffer, mimeType, storagePath);
    } catch (err) {
      console.error(`   ❌ Upload failed: ${err.message}`);
      continue;
    }

    // 5. Update database
    console.log("   💾 Updating database...");
    try {
      await updateCourseCoverImage(course.id, cdnUrl);
    } catch (err) {
      console.error(`   ❌ Database update failed: ${err.message}`);
      continue;
    }

    console.log(`   ✅ Done! Cover image updated for "${courseEntry.title}"`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("  All courses processed!");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err.message);
  process.exit(1);
});
