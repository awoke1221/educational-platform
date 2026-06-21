// src/app/api/courses/samples/route.ts
// API endpoint to fetch demo courses (Bunny-based sample content)

import { NextResponse } from "next/server";
import { env } from "@/config/env";

// Demo courses with Bunny storage paths
const DEMO_COURSES = [
  {
    id: "bunny-demo-1",
    title: "የዱር አንስታይ ጥናት",
    shortDescription:
      "ስለ ዝሆኖች ባህሪ እና ኑሮ የሚያጠና አስደሳች ኮርስ። የዱር አንስታይ ፍቅር ያላቸው ሁሉ መመዝገብ ይኖርባቸዋል",
    level: "beginner",
    category: "Science",
    price: 599,
  },
  {
    id: "bunny-demo-2",
    title: "ዘመናዊ ዳንስ ስልጠና",
    shortDescription:
      "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ። በዘመናዊ የአካል ብቃት እንቅስቃሴ ጤናዎን ይጠብቁ",
    level: "intermediate",
    category: "Arts",
    price: 799,
  },
  {
    id: "bunny-demo-3",
    title: "የቪዲዮ ኤዲቲንግ መሰረቶች",
    shortDescription:
      "የቪዲዮ አርትዖት መሰረታዊ መርሀዎችን ይማሩ። ከመጀመሪያ እስከ መጨረሻ የቪዲዮ አርትዖት ስልጠና",
    level: "beginner",
    category: "Technology",
    price: 1299,
  },
  {
    id: "bunny-demo-4",
    title: "የባህር ህይወት ጥናት",
    shortDescription:
      "ስለ ባህር ኤሊዎች እና የባህር ህይወት ጥበቃ የሚያጠና ትምህርታዊ ኮርስ። የባህር ስነ-ምህዳርን ይረዱ",
    level: "intermediate",
    category: "Science",
    price: 699,
  },
];

export async function GET() {
  try {
    if (!env.bunny.demoVideoUrl) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "Demo video URL not configured",
        total: 0,
      });
    }

    const courses = DEMO_COURSES.map((course) => ({
      ...course,
      coverImage: env.bunny.demoVideoUrl,
      videoUrl: env.bunny.demoVideoUrl,
      videoDuration: 60,
      enrollmentCount: Math.floor(Math.random() * 150) + 20,
      instructor: { fullName: "AD LMS", id: "adlms", profileImage: null },
      videoCount: 1,
    }));

    return NextResponse.json({
      success: true,
      data: courses,
      message: "Demo courses retrieved successfully",
      total: courses.length,
    });
  } catch (error) {
    console.error("[DEMO COURSES] Failed:", error);
    return NextResponse.json({
      success: true,
      data: [],
      message: "No courses available",
      total: 0,
    });
  }
}
