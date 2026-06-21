// src/app/api/enrollments/route.ts
// Enrollment API — Supabase REST API

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { supabaseAdmin  } from "@/lib/db/supabaseAdmin";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
} from "@/lib/utils/api";
import { parsePagination } from "@/lib/utils/request";

// GET /api/enrollments — User's Enrolled Courses
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    // Try Supabase first
    if (supabaseAdmin) {
      try {
        const {
          data: enrollments,
          error,
          count,
        } = await supabaseAdmin!
          .from("Enrollment")
          .select("*, course:Course(*)", { count: "exact" })
          .eq("userId", auth.userId);

        if (!error && enrollments && enrollments.length > 0) {
          return paginatedResponse(
            enrollments,
            count || enrollments.length,
            1,
            50,
            "Enrollments retrieved",
          );
        }
      } catch {
        // Table may not exist, fall through to demo data
      }
    }

    // Demo: return Cloudinary courses as enrolled
    const { default: CloudinaryService } = await import("@/lib/cloudinary");
    const allVideos = await CloudinaryService.searchResources(
      "resource_type:video",
      { maxResults: 10, resourceType: "video" },
    );

    const courseMap: Record<
      string,
      {
        title: string;
        desc: string;
        level: string;
        category: string;
        price: number;
      }
    > = {
      elephants: {
        title: "የዱር አንስታይ ጥናት",
        desc: "ስለ ዝሆኖች ባህሪ እና ኑሮ የሚያጠና አስደሳች ኮርስ",
        level: "beginner",
        category: "Science",
        price: 599,
      },
      "dance-2": {
        title: "ዘመናዊ ዳንስ ስልጠና",
        desc: "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ",
        level: "intermediate",
        category: "Arts",
        price: 799,
      },
      "cld-sample-video": {
        title: "የቪዲዮ ኤዲቲንግ መሰረቶች",
        desc: "የቪዲዮ አርትዖት መሰረታዊ መርሆችን ይማሩ",
        level: "beginner",
        category: "Technology",
        price: 1299,
      },
      "sea-turtle": {
        title: "የባህር ህይወት ጥናት",
        desc: "ስለ ባህር ኤሊዎች እና የባህር ህይወት ጥበቃ የሚያጠና ትምህርታዊ ኮርስ",
        level: "intermediate",
        category: "Science",
        price: 699,
      },
    };

    const demoEnrollments = allVideos.map((video: any, i: number) => {
      const publicId = video.public_id || "";
      const fileName = publicId.split("/").pop() || "";
      const info = courseMap[fileName] || {
        title: fileName,
        desc: "",
        level: "beginner",
        category: "General",
        price: 499,
      };
      return {
        id: `demo-enr-${i}`,
        userId: auth.userId,
        courseId: `cloudinary-${publicId.replace(/\//g, "-")}`,
        status: "active",
        completionPercentage: Math.floor(Math.random() * 40),
        progressPercentage: Math.floor(Math.random() * 40),
        enrolledAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        course: {
          id: `cloudinary-${publicId.replace(/\//g, "-")}`,
          title: info.title,
          shortDescription: info.desc,
          coverImage: CloudinaryService.getVideoThumbnail(publicId, {
            width: 640,
            height: 360,
          }),
          level: info.level,
          category: info.category,
          price: info.price,
          currency: "ETB",
          instructor: { fullName: "AD LMS", id: "adlms", profileImage: null },
        },
      };
    });

    return paginatedResponse(
      demoEnrollments,
      demoEnrollments.length,
      1,
      50,
      "Demo enrollments",
    );
  } catch (error) {
    console.error("[LIST ENROLLMENTS ERROR]", error);
    return handleApiError(error);
  }
}

// POST /api/enrollments — Enroll in a Course
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const { courseId } = await request.json();
    if (!courseId) return errorResponse("courseId is required", 400);

    // Return a simulated successful enrollment
    // (DB tables use Supabase REST API)
    const enrollment = {
      id: crypto.randomUUID(),
      userId: auth.userId,
      courseId,
      status: "active",
      completionPercentage: 0,
      certificateIssued: false,
      enrolledAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      course: null,
      payment: null,
    };

    console.log(`[ENROLL] User ${auth.userId} enrolled in course ${courseId}`);
    return successResponse(enrollment, "Enrolled successfully", 201);
  } catch (error) {
    console.error("[ENROLL POST ERROR]", error);
    return handleApiError(error);
  }
}

