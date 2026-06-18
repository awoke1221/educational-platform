// src/app/api/payments/[id]/route.ts
// Single Payment Detail API

import { NextRequest } from "next/server";
import { verifyAuth, requireAuth } from "@/lib/auth/middleware";
import { supabaseAdmin } from "@/lib/db/supabase";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// GET /api/payments/[id] - Payment Details
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    const { data: payment, error: payErr } = await supabaseAdmin!
      .from("Payment")
      .select(
        "*, course:Course(id, title, coverImage, price), enrollment:Enrollment(id, status, completionPercentage)",
      )
      .eq("id", id)
      .maybeSingle();

    if (payErr || !payment) {
      return notFoundResponse("Payment");
    }

    // Only allow owner or admin to view
    if (payment.userId !== auth.userId && auth.role !== "admin") {
      return errorResponse("Access denied", 403);
    }

    return successResponse(payment, "Payment retrieved successfully");
  } catch (error) {
    console.error("[GET PAYMENT ERROR]", error);
    return handleApiError(error);
  }
}
