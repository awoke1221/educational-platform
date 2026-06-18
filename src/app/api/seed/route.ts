// src/app/api/seed/route.ts
// Seed database with initial course and enrollment data

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";

const COURSES = [
  {
    id: "cloudinary-samples-elephants",
    title: "የዱር አንስታይ ጥናት",
    shortDescription: "ስለ ዝሆኖች ባህሪ እና ኑሮ የሚያጠና አስደሳች ኮርስ",
    description:
      "ስለ ዝሆኖች ባህሪ እና ኑሮ የሚያጠና አስደሳች ኮርስ። የዱር አንስታይ ፍቅር ያላቸው ሁሉ መመዝገብ ይኖርባቸዋል",
    coverImage:
      "https://res.cloudinary.com/dikm1x43c/video/upload/c_fill,h_360,q_auto,w_640/f_auto/v1/samples/elephants",
    price: 599,
    currency: "ETB",
    level: "beginner",
    category: "Science",
    instructorId: "adlms",
    duration: 49,
    videoCount: 1,
    enrollmentCount: 126,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cloudinary-samples-dance-2",
    title: "ዘመናዊ ዳንስ ስልጠና",
    shortDescription: "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ",
    description:
      "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ። በዘመናዊ የአካል ብቃት እንቅስቃሴ ጤናዎን ይጠብቁ",
    coverImage:
      "https://res.cloudinary.com/dikm1x43c/video/upload/c_fill,h_360,q_auto,w_640/f_auto/v1/samples/dance-2",
    price: 799,
    currency: "ETB",
    level: "intermediate",
    category: "Arts",
    instructorId: "adlms",
    duration: 20,
    videoCount: 1,
    enrollmentCount: 70,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cloudinary-samples-cld-sample-video",
    title: "የቪዲዮ ኤዲቲንግ መሰረቶች",
    shortDescription: "የቪዲዮ አርትዖት መሰረታዊ መርሆችን ይማሩ",
    description: "የቪዲዮ አርትዖት መሰረታዊ መርሆችን ይማሩ። ከመጀመሪያ እስከ መጨረሻ የቪዲዮ አርትዖት ስልጠና",
    coverImage:
      "https://res.cloudinary.com/dikm1x43c/video/upload/c_fill,h_360,q_auto,w_640/f_auto/v1/samples/cld-sample-video",
    price: 1299,
    currency: "ETB",
    level: "beginner",
    category: "Technology",
    instructorId: "adlms",
    duration: 12,
    videoCount: 1,
    enrollmentCount: 78,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cloudinary-samples-sea-turtle",
    title: "የባህር ህይወት ጥናት",
    shortDescription: "ስለ ባህር ኤሊዎች እና የባህር ህይወት ጥበቃ የሚያጠና ትምህርታዊ ኮርስ",
    description:
      "ስለ ባህር ኤሊዎች እና የባህር ህይወት ጥበቃ የሚያጠና ትምህርታዊ ኮርስ። የባህር ስነ-ምህዳርን ይረዱ",
    coverImage:
      "https://res.cloudinary.com/dikm1x43c/video/upload/c_fill,h_360,q_auto,w_640/f_auto/v1/samples/sea-turtle",
    price: 699,
    currency: "ETB",
    level: "intermediate",
    category: "Science",
    instructorId: "adlms",
    duration: 15,
    videoCount: 1,
    enrollmentCount: 40,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "supabaseAdmin not configured" },
        { status: 500 },
      );
    }

    const results = { courses: 0, enrollment: 0, errors: [] as string[] };

    // Insert courses
    for (const course of COURSES) {
      const { error } = await supabaseAdmin!
        .from("Course")
        .upsert(course, { onConflict: "id" });
      if (error) {
        results.errors.push(`Course "${course.title}": ${error.message}`);
      } else {
        results.courses++;
      }
    }

    // Create enrollment for test user
    const { error: enrollError } = await supabaseAdmin!
      .from("Enrollment")
      .upsert(
        {
          id: crypto.randomUUID(),
          userId: "e0dcfa25-0eb1-476f-a1cb-ae3deba51e17",
          courseId: "cloudinary-samples-elephants",
          status: "active",
          completionPercentage: 0,
          enrolledAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    if (enrollError) {
      results.errors.push(`Enrollment: ${enrollError.message}`);
    } else {
      results.enrollment = 1;
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
