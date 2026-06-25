// src/app/api/enrollments/route.ts
// Enrollment API — RLS-aware
//
// Uses the user-scoped Supabase client so that RLS policies
// automatically restrict results to the authenticated user's rows.

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { getUserClientFromRequest } from "@/lib/db/supabaseUserClient";
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

    const supabase = getUserClientFromRequest(request);
    if (!supabase) {
      return errorResponse("Authentication required", 401);
    }

    const {
      data: enrollments,
      error,
      count,
    } = await supabase
      .from("Enrollment")
      .select(
        "*, course:Course(*), payment:Payment(id,status,paymentMethod,amount,currency,receiptScreenshotUrl,payerName,payerPhone)",
        { count: "exact" },
      )
      .order("enrollmentDate", { ascending: false });

    if (error) {
      console.error("[LIST ENROLLMENTS ERROR]", error);
      return paginatedResponse([], 0, 1, 50, "No enrollments found");
    }

    const normalized = (enrollments || []).map((enrollment: any) => {
      const payment = Array.isArray(enrollment.payment)
        ? enrollment.payment[0]
        : enrollment.payment;
      return {
        ...enrollment,
        paymentStatus: payment?.status,
        payment,
      };
    });

    return paginatedResponse(
      normalized,
      count || normalized.length,
      1,
      50,
      "Enrollments retrieved",
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

    return errorResponse(
      "Direct enrollment is disabled. Use the payment and registration workflow.",
      400,
    );
  } catch (error) {
    console.error("[ENROLL POST ERROR]", error);
    return handleApiError(error);
  }
}
