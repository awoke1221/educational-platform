// src/app/api/seed/route.ts
// Seed database with initial course and enrollment data

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { env } from "@/config/env";

function getBunnyStoragePathFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return url;
  }
}

const COURSES = [
  {
    id: "bunny-demo-1",
    title: "የዱር አንስታይ ጥናት",
    shortDescription: "ስለ ዝሆኖች ባህሪ እና ኑሮ የሚያጠና አስደሳች ኮርስ",
    description:
      "ስለ ዝሆኖች ባህሪ እና ኑሮ የሚያጠና አስደሳች ኮርስ። የዱር አንስታይ ፍቅር ያላቸው ሁሉ መመዝገብ ይኖርባቸዋል",
    coverImage: env.bunny.demoVideoUrl,
    price: 599,
    currency: "ETB",
    level: "beginner",
    category: "Science",
    instructorId: "adlms",
    duration: 60,
    videoCount: 1,
    enrollmentCount: 126,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bunny-demo-2",
    title: "ዘመናዊ ዳንስ ስልጠና",
    shortDescription: "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ",
    description:
      "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ። በዘመናዊ የአካል ብቃት እንቅስቃሴ ጤናዎን ይጠብቁ",
    coverImage: env.bunny.demoVideoUrl,
    price: 799,
    currency: "ETB",
    level: "intermediate",
    category: "Arts",
    instructorId: "adlms",
    duration: 60,
    videoCount: 1,
    enrollmentCount: 70,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bunny-demo-3",
    title: "የቪዲዮ ኤዲቲንግ መሰረቶች",
    shortDescription: "የቪዲዮ አርትዖት መሰረታዊ መርሀዎችን ይማሩ",
    description: "የቪዲዮ አርትዖት መሰረታዊ መርሀዎችን ይማሩ። ከመጀመሪያ እስከ መጨረሻ የቪዲዮ አርትዖት ስልጠና",
    coverImage: env.bunny.demoVideoUrl,
    price: 1299,
    currency: "ETB",
    level: "beginner",
    category: "Technology",
    instructorId: "adlms",
    duration: 60,
    videoCount: 1,
    enrollmentCount: 78,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bunny-demo-4",
    title: "የባህር ህይወት ጥናት",
    shortDescription: "ስለ ባህር ኤሊዎች እና የባህር ህይወት ጥበቃ የሚያጠና ትምህርታዊ ኮርስ",
    description:
      "ስለ ባህር ኤሊዎች እና የባህር ህይወት ጥበቃ የሚያጠና ትምህርታዊ ኮርስ። የባህር ስነ-ምህዳርን ይረዱ",
    coverImage: env.bunny.demoVideoUrl,
    price: 699,
    currency: "ETB",
    level: "intermediate",
    category: "Science",
    instructorId: "adlms",
    duration: 60,
    videoCount: 1,
    enrollmentCount: 40,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const LECTURES = COURSES.map((course, index) => ({
  id: `${course.id}-lecture-1`,
  courseId: course.id,
  title: `${course.title} የመግቢያ ቪዲዮ`,
  description: `እንኳን ደህና መጡ። እንዲሁ ጥናታዊ ኮርስ ዝግጅት ይጀምሩ።`,
  videoUrl: env.bunny.demoVideoUrl,
  cloudinaryPublicId: getBunnyStoragePathFromUrl(env.bunny.demoVideoUrl),
  duration: 60,
  orderIndex: 1,
  isPublished: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Seed endpoint disabled. No demo data will be created.",
    },
    { status: 404 },
  );
}
