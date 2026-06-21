// src/app/api/admin/payments/route.ts
// Admin Payment Management API

import { NextRequest } from "next/server";
import { verifyAuth, requireRole } from "@/lib/auth/middleware";
import { supabaseAdmin  } from "@/lib/db/supabaseAdmin";
import PaymentService from "@/lib/payment";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
} from "@/lib/utils/api";
import { parsePagination } from "@/lib/utils/request";

// ============================================
// GET /api/admin/payments - List Payments
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;

    const { page, limit } = parsePagination(request);
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status"); // pending, approved, rejected, all
    const paymentType = searchParams.get("type"); // local, diaspora

    // Build where clause
    const where: Record<string, any> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (paymentType) {
      where.paymentType = paymentType;
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = supabaseAdmin!
      .from("Payment")
      .select(
        "*, user:User(id, fullName, email, username, phoneNumber), course:Course(id, title, coverImage, price), enrollment:Enrollment(id, status)",
        { count: "exact" },
      );

    if (status && status !== "all") query = query.eq("status", status);
    if (paymentType) query = query.eq("paymentType", paymentType);

    const {
      data: payments,
      count,
      error,
    } = await query.order("createdAt", { ascending: false }).range(from, to);

    if (error) throw error;

    return paginatedResponse(
      payments || [],
      count || 0,
      page,
      limit,
      "Payments retrieved successfully",
    );
  } catch (error) {
    console.error("[ADMIN PAYMENTS ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// PATCH /api/admin/payments - Approve/Reject Payment
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    // Verify admin role
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const { paymentId, action, notes, reason } = body;

    if (!paymentId) {
      return errorResponse("Payment ID is required", 400);
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return errorResponse("Action must be 'approve' or 'reject'", 400);
    }

    let result;

    if (action === "approve") {
      result = await PaymentService.approvePayment(
        paymentId,
        auth.userId,
        notes,
      );
    } else {
      if (!reason) {
        return errorResponse("Rejection reason is required", 400);
      }
      result = await PaymentService.rejectPayment(
        paymentId,
        auth.userId,
        reason,
      );
    }

    return successResponse(
      result,
      `Payment ${action === "approve" ? "approved" : "rejected"} successfully`,
    );
  } catch (error: any) {
    console.error("[ADMIN PAYMENT ACTION ERROR]", error);

    if (error.message?.includes("not found")) {
      return errorResponse(error.message, 404);
    }
    if (error.message?.includes("not in pending")) {
      return errorResponse(error.message, 409);
    }

    return handleApiError(error);
  }
}

// ============================================
// POST /api/admin/payments - Upload receipt screenshot
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;

    const formData = await request.formData();
    const paymentId = formData.get("paymentId") as string;
    const receiptUrl = formData.get("receiptUrl") as string;

    if (!paymentId || !receiptUrl) {
      return errorResponse("Payment ID and receipt URL are required", 400);
    }

    const { data: payment, error: updateErr } = await supabaseAdmin!
      .from("Payment")
      .update({ receiptScreenshotUrl: receiptUrl })
      .eq("id", paymentId)
      .select("id, status, receiptScreenshotUrl")
      .single();

    if (updateErr) throw updateErr;

    return successResponse(payment, "Receipt uploaded successfully");
  } catch (error) {
    console.error("[UPLOAD RECEIPT ERROR]", error);
    return handleApiError(error);
  }
}

