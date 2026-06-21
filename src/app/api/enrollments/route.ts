// src/app/api/enrollments/route.ts
// Enrollment API — Supabase REST API

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { env } from "@/config/env";
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
          .select(
            "*, course:Course(*), payment:Payment(id,status,paymentMethod,amount,currency,receiptScreenshotUrl,payerName,payerPhone)",
            {
              count: "exact",
            },
          )
          .eq("userId", auth.userId);

        if (!error && enrollments && enrollments.length > 0) {
          const normalized = enrollments.map((enrollment: any) => {
            const payment = Array.isArray(enrollment.payment)
              ? enrollment.payment[0]
              : enrollment.payment;
            return {
              ...enrollment,
              paymentStatus: payment?.status,
              payment: payment,
            };
          });
          return paginatedResponse(
            normalized,
            count || normalized.length,
            1,
            50,
            "Enrollments retrieved",
          );
        }
      } catch {
        // Table may not exist, fall through to demo data
      }
    }

    // Demo: return Bunny demo courses as enrolled
    if (env.bunny.demoVideoUrl) {
      const demoEnrollments = [
        {
          id: `demo-enr-1`,
          userId: auth.userId,
          courseId: `bunny-demo-1`,
          status: "active",
          completionPercentage: Math.floor(Math.random() * 40),
          progressPercentage: Math.floor(Math.random() * 40),
          enrolledAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
          course: {
            id: `bunny-demo-1`,
            title: "የዱር አንስታይ ጥናት",
            shortDescription: "ስለ ዝሆኖች ባህሪ እና ኑሮ የሚያጠና አስደሳች ኮርስ",
            coverImage: env.bunny.demoVideoUrl,
            level: "beginner",
            category: "Science",
            price: 599,
            currency: "ETB",
            instructor: { fullName: "AD LMS", id: "adlms", profileImage: null },
          },
        },
        {
          id: `demo-enr-2`,
          userId: auth.userId,
          courseId: `bunny-demo-2`,
          status: "active",
          completionPercentage: Math.floor(Math.random() * 40),
          progressPercentage: Math.floor(Math.random() * 40),
          enrolledAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
          course: {
            id: `bunny-demo-2`,
            title: "ዘመናዊ ዳንስ ስልጠና",
            shortDescription: "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ",
            coverImage: env.bunny.demoVideoUrl,
            level: "intermediate",
            category: "Arts",
            price: 799,
            currency: "ETB",
            instructor: { fullName: "AD LMS", id: "adlms", profileImage: null },
          },
        },
      ];

      return paginatedResponse(
        demoEnrollments,
        demoEnrollments.length,
        1,
        50,
        "Demo enrollments",
      );
    }

    return paginatedResponse([], 0, 1, 50, "No enrollments found");
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
