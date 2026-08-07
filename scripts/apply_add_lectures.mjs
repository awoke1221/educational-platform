import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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

  const planned = [
    // Chapter 1
    {
      title: "Chapter 1 - Adonay_Class_02.mp4",
      cloudinaryPublicId: "9334ac94-5562-4a1a-bc35-c73941edb585",
    },
    {
      title: "Chapter 1 - Adonay_Class_01.mp4",
      cloudinaryPublicId: "092daed1-5722-4b1c-ac63-1f6ca4ba3522",
    },
    {
      title: "Chapter 1 - Adonay_Class_03.mp4",
      cloudinaryPublicId: "2a1fb9cc-9d92-49ed-896d-c1c4d67ce131",
    },
    // Chapter 2
    {
      title: "Chapter 2 - Adonay_Class_05.mp4",
      cloudinaryPublicId: "fe0ed3bf-d0c0-4b50-b4bd-8973247f31bb",
    },
    {
      title: "Chapter 2 - Adonay_Class_04.mp4",
      cloudinaryPublicId: "1a82c47b-383a-4576-b111-5278f0480323",
    },
    // Chapter 3
    {
      title: "Chapter 3 - Adonay_Class_06.mp4",
      cloudinaryPublicId: "e2010e4d-ee7d-4e48-aaa4-9d7e43a6b04b",
    },
    {
      title: "Chapter 3 - Adonay_Class_07.mp4",
      cloudinaryPublicId: "5a987674-e37d-4394-a300-680cbe618655",
    },
    // Chapter 4
    {
      title: "Chapter 4 - Adonay_Class_10.mov",
      cloudinaryPublicId: "3e2d05c2-d6a0-4491-83cc-efe7b2c327a3",
    },
    {
      title: "Chapter 4 - Adonay_Class_09.mp4",
      cloudinaryPublicId: "8d66f7eb-c4af-4e62-ba01-0ea829dd0a99",
    },
    {
      title: "Chapter 4 - Adonay_Class_08.mp4",
      cloudinaryPublicId: "34cabedc-3190-4e09-b44a-a303bf3f73e6",
    },
    // Chapter 5
    {
      title: "Chapter 5 - Adonay_Class_13.mp4",
      cloudinaryPublicId: "00e7742d-b0ef-4969-9c83-2941d7644d97",
    },
    {
      title: "Chapter 5 - Adonay_Class_12.mp4",
      cloudinaryPublicId: "aa072613-9905-4b52-8e5d-3a2090de8c70",
    },
    {
      title: "Chapter 5 - Adonay_Class_11.mp4",
      cloudinaryPublicId: "0180f4cc-e0a3-4301-980a-e55883383cd7",
    },
    {
      title: "Chapter 5 - Adonay_Class_14.mp4",
      cloudinaryPublicId: "23b82c76-d05a-4b3e-bcc3-03e1495dec26",
    },
    // Podcasts
    {
      title: "Podcasts - Ghost Podcast.mp4",
      cloudinaryPublicId: "37691ba3-6055-4c15-b894-adfc4041d8c3",
    },
    {
      title: "Podcasts - Nati barber.mov",
      cloudinaryPublicId: "b24ac484-9581-4eeb-9f32-690542475131",
    },
    {
      title: "Podcasts - Yuti Podcast.mp4",
      cloudinaryPublicId: "7fd4f942-e7cb-4360-95ce-fc036c490857",
    },
    {
      title: "Podcasts - Takur Podcast.mp4",
      cloudinaryPublicId: "5e7bb6d4-b2d2-4241-a570-66c622340fa8",
    },
    {
      title: "Podcasts - Nahom Podcast.mp4",
      cloudinaryPublicId: "c007140d-f413-4fa0-a74c-7276145689b1",
    },
    {
      title: "Podcasts - Haron Podcast.mp4",
      cloudinaryPublicId: "7839b95e-a700-4af6-903a-d7baa2bfd799",
    },
  ];

  // Get current max orderIndex
  const lecUrl = new URL(
    `/rest/v1/Lecture?select=orderIndex&courseId=eq.${COURSE_ID}`,
    SUPABASE_URL,
  ).toString();
  const res = await fetch(lecUrl, {
    headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    console.error(
      "Failed to fetch existing lectures",
      res.status,
      await res.text(),
    );
    process.exit(3);
  }
  const existing = await res.json();
  const maxIdx = existing.length
    ? Math.max(...existing.map((l) => l.orderIndex || 0))
    : 0;
  let idx = maxIdx + 1;

  for (const p of planned) {
    const lecture = {
      id: crypto.randomUUID(),
      courseId: COURSE_ID,
      title: p.title,
      description: null,
      videoUrl: "",
      cloudinaryPublicId: p.cloudinaryPublicId,
      duration: null,
      orderIndex: idx++,
      isPublished: true,
      videoSize: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const insertUrl = new URL("/rest/v1/Lecture", SUPABASE_URL).toString();
    const r = await fetch(insertUrl, {
      method: "POST",
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(lecture),
    });

    if (!r.ok) {
      console.error(
        "Failed to insert lecture",
        lecture.title,
        r.status,
        await r.text(),
      );
      process.exit(4);
    }

    const inserted = await r.json();
    console.log(
      `Inserted: [${inserted[0].orderIndex}] ${inserted[0].title} -> ${inserted[0].id}`,
    );
  }

  console.log("\nAll planned lectures inserted.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
