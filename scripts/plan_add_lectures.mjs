import fs from "node:fs/promises";
import path from "node:path";

function parseDotenv(text) {
  const lines = text.split(/\r?\n/);
  const obj = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    obj[key] = val;
  }
  return obj;
}

async function main() {
  const repoRoot = process.cwd();
  const envPath = path.join(repoRoot, ".env");
  const text = await fs.readFile(envPath, "utf8");
  const env = parseDotenv(text);
  const SUPABASE_URL = env.SUPABASE_URL;
  const API_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !API_KEY) {
    console.error("Missing SUPABASE_URL or API key in .env");
    process.exit(2);
  }

  const COURSE_ID = "e5d469d6-c661-4d15-986c-7a3fa67bcaad";

  const lecUrl = new URL(
    `/rest/v1/Lecture?select=id,title,orderIndex,cloudinaryPublicId&courseId=eq.${COURSE_ID}&order=orderIndex`,
    SUPABASE_URL,
  ).toString();
  const res = await fetch(lecUrl, {
    headers: {
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    console.error("Supabase API error", res.status, await res.text());
    process.exit(3);
  }
  const existing = await res.json();
  console.log(`Existing lectures for course ${COURSE_ID}: ${existing.length}`);
  existing.forEach((l) =>
    console.log(
      `  - [${l.orderIndex}] ${l.id} ${l.title} (${l.cloudinaryPublicId || ""})`,
    ),
  );

  // Planned additions per user's request
  const planned = [];
  // Chapter 1
  planned.push({
    group: "Chapter 1",
    videos: [
      {
        id: "9334ac94-5562-4a1a-bc35-c73941edb585",
        title: "Adonay_Class_02.mp4",
      },
      {
        id: "092daed1-5722-4b1c-ac63-1f6ca4ba3522",
        title: "Adonay_Class_01.mp4",
      },
      {
        id: "2a1fb9cc-9d92-49ed-896d-c1c4d67ce131",
        title: "Adonay_Class_03.mp4",
      },
    ],
  });
  // Chapter 2
  planned.push({
    group: "Chapter 2",
    videos: [
      {
        id: "fe0ed3bf-d0c0-4b50-b4bd-8973247f31bb",
        title: "Adonay_Class_05.mp4",
      },
      {
        id: "1a82c47b-383a-4576-b111-5278f0480323",
        title: "Adonay_Class_04.mp4",
      },
    ],
  });
  // Chapter 3
  planned.push({
    group: "Chapter 3",
    videos: [
      {
        id: "e2010e4d-ee7d-4e48-aaa4-9d7e43a6b04b",
        title: "Adonay_Class_06.mp4",
      },
      {
        id: "5a987674-e37d-4394-a300-680cbe618655",
        title: "Adonay_Class_07.mp4",
      },
    ],
  });
  // Chapter 4
  planned.push({
    group: "Chapter 4",
    videos: [
      {
        id: "3e2d05c2-d6a0-4491-83cc-efe7b2c327a3",
        title: "Adonay_Class_10.mov",
      },
      {
        id: "8d66f7eb-c4af-4e62-ba01-0ea829dd0a99",
        title: "Adonay_Class_09.mp4",
      },
      {
        id: "34cabedc-3190-4e09-b44a-a303bf3f73e6",
        title: "Adonay_Class_08.mp4",
      },
    ],
  });
  // Chapter 5
  planned.push({
    group: "Chapter 5",
    videos: [
      {
        id: "00e7742d-b0ef-4969-9c83-2941d7644d97",
        title: "Adonay_Class_13.mp4",
      },
      {
        id: "aa072613-9905-4b52-8e5d-3a2090de8c70",
        title: "Adonay_Class_12.mp4",
      },
      {
        id: "0180f4cc-e0a3-4301-980a-e55883383cd7",
        title: "Adonay_Class_11.mp4",
      },
      {
        id: "23b82c76-d05a-4b3e-bcc3-03e1495dec26",
        title: "Adonay_Class_14.mp4",
      },
    ],
  });
  // Podcasts (6 parts)
  planned.push({
    group: "Podcasts",
    videos: [
      {
        id: "37691ba3-6055-4c15-b894-adfc4041d8c3",
        title: "Ghost Podcast.mp4",
      },
      { id: "b24ac484-9581-4eeb-9f32-690542475131", title: "Nati barber.mov" },
      { id: "7fd4f942-e7cb-4360-95ce-fc036c490857", title: "Yuti Podcast.mp4" },
      {
        id: "5e7bb6d4-b2d2-4241-a570-66c622340fa8",
        title: "Takur Podcast.mp4",
      },
      {
        id: "c007140d-f413-4fa0-a74c-7276145689b1",
        title: "Nahom Podcast.mp4",
      },
      {
        id: "7839b95e-a700-4af6-903a-d7baa2bfd799",
        title: "Haron Podcast.mp4",
      },
    ],
  });

  // Compute starting orderIndex
  const startIndex =
    existing.length > 0
      ? Math.max(...existing.map((l) => l.orderIndex || 0)) + 1
      : 1;
  let idx = startIndex;
  const flatPlanned = [];
  for (const group of planned) {
    for (const v of group.videos) {
      flatPlanned.push({
        orderIndex: idx++,
        courseId: COURSE_ID,
        title: `${group.group} - ${v.title}`,
        cloudinaryPublicId: v.id,
        videoUrl: "",
        duration: null,
        isPublished: true,
      });
    }
  }

  console.log("\nPlanned lecture additions (preview):");
  flatPlanned.forEach((p) =>
    console.log(`  [${p.orderIndex}] ${p.title}  -> ${p.cloudinaryPublicId}`),
  );

  console.log("\nTo apply these, run: node scripts/apply_add_lectures.mjs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
