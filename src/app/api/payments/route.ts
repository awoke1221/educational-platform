// src/app/api/payments/route.ts
// Payment API Endpoints

import { NextRequest } from "next/server";
import { verifyAuth, requireAuth } from "@/lib/auth/middleware";
import {
  localPaymentSchema,
  diasporaPaymentSchema,
} from "@/lib/validators/schemas";
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
// GET /api/payments - User's Payment History
// ============================================

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const { page, limit } = parsePagination(request);

    const result = await PaymentService.getUserPayments(
      auth.userId,
      page,
      limit,
    );

    return paginatedResponse(
      result.payments,
      result.total,
      result.page,
      result.limit,
      "Payments retrieved successfully",
    );
  } catch (error) {
    console.error("[GET PAYMENTS ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// POST /api/payments - Create Payment
// ============================================

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const { paymentType } = body;

    if (!paymentType || !["local", "diaspora"].includes(paymentType)) {
      return errorResponse(
        "Invalid payment type. Must be 'local' or 'diaspora'",
        400,
      );
    }

    let result;

    if (paymentType === "local") {
      // ============================================
      // Local Payment (Telebirr, CB Birr, Bank Transfer)
      // ============================================
      const validation = localPaymentSchema.safeParse(body);
      if (!validation.success) {
        return errorResponse(
          "Validation failed",
          400,
          validation.error.flatten().fieldErrors,
        );
      }

      const { courseId, amount, paymentMethod, transactionId } =
        validation.data;

      result = await PaymentService.processLocalPayment({
        userId: auth.userId,
        courseId,
        amount,
        paymentType: "local",
        paymentMethod,
        transactionId,
      });

      return successResponse(result, result.message, 201);
    } else {
      // ============================================
      // Diaspora Payment (Laki Pay)
      // ============================================
      const validation = diasporaPaymentSchema.safeParse(body);
      if (!validation.success) {
        return errorResponse(
          "Validation failed",
          400,
          validation.error.flatten().fieldErrors,
        );
      }

      const { courseId, amount } = validation.data;

      const { data: user, error: userErr } = await supabaseAdmin!
        .from("User")
        .select("fullName, email, phoneNumber")
        .eq("id", auth.userId)
        .single();

      if (userErr || !user) return errorResponse("User not found", 404);

      result = await PaymentService.processDiasporaPayment({
        userId: auth.userId,
        courseId,
        amount,
        customerEmail: user.email,
        customerName: user.fullName,
        customerPhone: user.phoneNumber,
      });

      return successResponse(result, result.message, 201);
    }
  } catch (error: any) {
    console.error("[CREATE PAYMENT ERROR]", error);

    if (
      error.message?.includes("already enrolled") ||
      error.message?.includes("pending payment")
    ) {
      return errorResponse(error.message, 409);
    }

    return handleApiError(error);
  }
}

