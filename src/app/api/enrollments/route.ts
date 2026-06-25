// src/app/api/enrollments/route.ts
// Enrollment API — RLS-aware
//
// Uses the user-scoped Supabase client so that RLS policies
// automatically restrict results to the authenticated user's rows.

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { getUserClientFromRequest } from "@/lib/db/supabaseUserClient";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
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

    // ── Parse pagination params ─────────────────────────────────
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    // Count query (lightweight — no related data)
    const countQuery = supabase
      .from("Enrollment")
      .select("*", { count: "exact", head: true })
      .eq("userId", auth.userId);

    // Data query with range
    const dataQuery = supabase
      .from("Enrollment")
      .select(
        "*, course:Course(*), payment:Payment(id,status,paymentMethod,amount,currency,receiptScreenshotUrl,payerName,payerPhone)",
        { count: "exact" },
      )
      .eq("userId", auth.userId)
      .order("enrollmentDate", { ascending: false })
      .range(offset, offset + limit - 1);

    let [{ count }, { data: enrollments, error }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    // ── Fallback for legacy users with mismatched User.id ──────
    // If the RLS-scoped query returns empty but the user has a valid
    // email, try looking up by email via the admin client.
    if ((!enrollments || enrollments.length === 0) && auth.email) {
      const admin = getSupabaseAdmin();
      const { data: userByEmail } = await admin!
        .from("User")
        .select("id")
        .eq("email", auth.email.toLowerCase())
        .maybeSingle();

      if (userByEmail && userByEmail.id !== auth.userId) {
        // Found user by email with a different ID — legacy record.
        // Query enrollments using the admin client with the correct ID.
        const legacyResult = await admin!
          .from("Enrollment")
          .select(
            "*, course:Course(*), payment:Payment(id,status,paymentMethod,amount,currency,receiptScreenshotUrl,payerName,payerPhone)",
          )
          .eq("userId", userByEmail.id)
          .order("enrollmentDate", { ascending: false })
          .range(offset, offset + limit - 1);

        if (!legacyResult.error && legacyResult.data) {
          enrollments = legacyResult.data;
          // Re-count for legacy user
          const countRes = await admin!
            .from("Enrollment")
            .select("*", { count: "exact", head: true })
            .eq("userId", userByEmail.id);
          count = countRes.count;
        }
      }
    }

    if (error) {
      console.error("[LIST ENROLLMENTS ERROR]", error);
      return paginatedResponse([], 0, page, limit, "No enrollments found");
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
      page,
      limit,
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
