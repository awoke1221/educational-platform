// src/app/api/enrollments/route.ts
// Enrollment API — Supabase REST API

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
} from "@/lib/utils/api";

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
        // If the enrollment table is unavailable, return an empty result set.
      }
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

    return errorResponse(
      "Direct enrollment is disabled. Use the payment and registration workflow.",
      400,
    );
  } catch (error) {
    console.error("[ENROLL POST ERROR]", error);
    return handleApiError(error);
  }
}
