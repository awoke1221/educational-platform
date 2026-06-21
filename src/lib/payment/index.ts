// src/lib/payment/index.ts
// Payment Service - Unified Payment Processing

import { supabaseAdmin  } from "@/lib/db/supabaseAdmin";
import LakiPayService from "./lakiPay";

// ============================================
// Payment Types
// ============================================

export type PaymentType = "local" | "diaspora";
export type LocalPaymentMethod = "telebirr" | "cb_birr" | "bank_transfer";
export type PaymentStatus = "pending" | "processing" | "approved" | "rejected";

export interface ProcessPaymentParams {
  userId: string;
  courseId: string;
  amount: number;
  paymentType: PaymentType;
  paymentMethod?: LocalPaymentMethod;
  transactionId?: string;
  receiptScreenshotUrl?: string;
  metadata?: Record<string, any>;
}

// ============================================
// Payment Service
// ============================================

export class PaymentService {
  // Helper: get a single row, throw if not found
  private static async getOne(
    table: string,
    id: string,
    select = "*",
  ): Promise<Record<string, any>> {
    const { data, error } = await supabaseAdmin!
      .from(table)
      .select(select)
      .eq("id", id)
      .single();
    if (error || !data) throw new Error(`${table} not found`);
    return data as Record<string, any>;
  }

  // Helper: maybe get a single row
  private static async maybeOne(
    table: string,
    filters: Record<string, any>,
    select = "*",
  ): Promise<Record<string, any> | null> {
    let query = supabaseAdmin!.from(table).select(select);
    for (const [k, v] of Object.entries(filters)) {
      query = query.eq(k, v) as any;
    }
    const { data, error } = await query.maybeSingle();
    if (error) return null;
    return data as Record<string, any> | null;
  }

  /**
   * Process a local payment (Telebirr, CB Birr, Bank Transfer)
   */
  static async processLocalPayment(params: ProcessPaymentParams): Promise<{
    success: boolean;
    payment: any;
    enrollment: any;
    message: string;
  }> {
    // Verify course exists
    const course = await this.getOne(
      "Course",
      params.courseId,
      "id, title, price",
    );

    // Check if user already has an active enrollment
    const { data: existingEnrollment, error: enrollErr } = await supabaseAdmin!
      .from("Enrollment")
      .select("*, payment:Payment(*)")
      .eq("userId", params.userId)
      .eq("courseId", params.courseId)
      .maybeSingle();

    if (!enrollErr && existingEnrollment) {
      if (existingEnrollment.status === "active") {
        throw new Error("You are already enrolled in this course");
      }
      const pay = Array.isArray(existingEnrollment.payment)
        ? existingEnrollment.payment[0]
        : existingEnrollment.payment;
      if (pay?.status === "pending") {
        throw new Error("You have a pending payment for this course");
      }
    }

    // Create or keep enrollment
    let enrollment;
    if (existingEnrollment) {
      if (existingEnrollment.status === "active") {
        throw new Error("You are already enrolled in this course");
      }
      if (existingEnrollment.status !== "processing") {
        const { data: updatedEnroll, error: updateEnrollErr } =
          await supabaseAdmin!
            .from("Enrollment")
            .update({
              status: "processing",
              updatedAt: new Date().toISOString(),
            })
            .eq("id", existingEnrollment.id)
            .select()
            .single();
        if (updateEnrollErr) throw new Error("Failed to update enrollment");
        enrollment = updatedEnroll;
      } else {
        enrollment = existingEnrollment;
      }
    } else {
      const { data: newEnroll, error: createErr } = await supabaseAdmin!
        .from("Enrollment")
        .insert({
          userId: params.userId,
          courseId: params.courseId,
          status: "processing",
          enrollmentDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();
      if (createErr) throw new Error("Failed to create enrollment");
      enrollment = newEnroll;
    }

    // Create or update payment record
    const { data: existingPayment } = await supabaseAdmin!
      .from("Payment")
      .select("*")
      .eq("enrollmentId", enrollment.id)
      .maybeSingle();

    if (existingPayment && existingPayment.status === "pending") {
      throw new Error("You have a pending payment for this course");
    }

    const paymentPayload = {
      enrollmentId: enrollment.id,
      userId: params.userId,
      courseId: params.courseId,
      amount: params.amount,
      currency: "ETB",
      paymentType: "local",
      paymentMethod: params.paymentMethod || "telebirr",
      status: "pending",
      transactionId: params.transactionId || null,
      receiptScreenshotUrl: params.receiptScreenshotUrl || null,
      updatedAt: new Date().toISOString(),
    };

    const paymentRecord = existingPayment
      ? await supabaseAdmin!
          .from("Payment")
          .update(paymentPayload)
          .eq("id", existingPayment.id)
          .select()
          .single()
      : await supabaseAdmin!
          .from("Payment")
          .insert(paymentPayload)
          .select()
          .single();

    if (!paymentRecord || paymentRecord.error) {
      throw new Error("Failed to create payment");
    }
    const payment = paymentRecord.data || paymentRecord;

    console.log(
      `[PAYMENT] Local payment created: ${payment.id} for course ${params.courseId}`,
    );

    return {
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        transactionId: payment.transactionId,
      },
      enrollment: { id: enrollment.id, status: enrollment.status },
      message:
        "Payment submitted successfully. An admin will review and approve it shortly.",
    };
  }

  /**
   * Process a diaspora payment (Laki Pay)
   */
  static async processDiasporaPayment(params: {
    userId: string;
    courseId: string;
    amount: number;
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
  }): Promise<{
    success: boolean;
    checkoutUrl: string;
    transactionId: string;
    message: string;
  }> {
    if (!LakiPayService.isConfigured()) {
      throw new Error(
        "Laki Pay is not configured. Please set LAKI_PAY_API_KEY and LAKI_PAY_API_SECRET.",
      );
    }

    const course = await this.getOne(
      "Course",
      params.courseId,
      "id, title, price",
    );

    const { data: existingEnrollment } = await supabaseAdmin!
      .from("Enrollment")
      .select("*")
      .eq("userId", params.userId)
      .eq("courseId", params.courseId)
      .maybeSingle();

    if (existingEnrollment?.status === "active") {
      throw new Error("You are already enrolled in this course");
    }

    let enrollment = existingEnrollment;
    if (existingEnrollment) {
      if (existingEnrollment.status !== "processing") {
        const { data: updatedEnrollment, error: updateEnrollErr } =
          await supabaseAdmin!
            .from("Enrollment")
            .update({
              status: "processing",
              updatedAt: new Date().toISOString(),
            })
            .eq("id", existingEnrollment.id)
            .select()
            .single();
        if (updateEnrollErr) throw new Error("Failed to update enrollment");
        enrollment = updatedEnrollment;
      }
    } else {
      const { data: newEnroll, error: createErr } = await supabaseAdmin!
        .from("Enrollment")
        .insert({
          userId: params.userId,
          courseId: params.courseId,
          status: "processing",
          enrollmentDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();
      if (createErr) throw new Error("Failed to create enrollment");
      enrollment = newEnroll;
    }

    const merchantReference = `ENR-${enrollment.id}-${Date.now()}`;
    const lakiPay = LakiPayService.getInstance();

    const lakiPayResponse = await lakiPay.initializePayment({
      amount: params.amount,
      currency: "USD",
      merchantReference,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      description: `Enrollment in ${course.title}`,
      metadata: {
        enrollmentId: enrollment.id,
        courseId: params.courseId,
        userId: params.userId,
      },
    });

    const { data: payment, error: payErr } = await supabaseAdmin!
      .from("Payment")
      .insert({
        enrollmentId: enrollment.id,
        userId: params.userId,
        courseId: params.courseId,
        amount: params.amount,
        currency: "USD",
        paymentType: "diaspora",
        paymentMethod: "laki_pay",
        status: "processing",
        lakiPayTransactionId: lakiPayResponse.transactionId,
        paymentGatewayResponse: lakiPayResponse,
      })
      .select()
      .single();
    if (payErr) throw new Error("Failed to create payment");

    console.log(
      `[PAYMENT] Diaspora payment initiated: ${payment.id}, LakiPay TX: ${lakiPayResponse.transactionId}`,
    );

    return {
      success: true,
      checkoutUrl: lakiPayResponse.checkoutUrl,
      transactionId: lakiPayResponse.transactionId,
      message: "Redirecting to payment gateway...",
    };
  }

  /**
   * Approve a local payment (admin action)
   */
  static async approvePayment(
    paymentId: string,
    adminUserId: string,
    notes?: string,
  ): Promise<any> {
    const payment = await this.getOne(
      "Payment",
      paymentId,
      "*, enrollment:Enrollment(*)",
    );

    if (payment.status !== "pending") {
      throw new Error("Payment is not in pending status");
    }

    const { data: updatedPayment, error: upErr } = await supabaseAdmin!
      .from("Payment")
      .update({
        status: "approved",
        approvedBy: adminUserId,
        approvedAt: new Date().toISOString(),
        approvalNotes: notes || null,
      })
      .eq("id", paymentId)
      .select()
      .single();
    if (upErr) throw new Error("Failed to approve payment");

    await supabaseAdmin!
      .from("Enrollment")
      .update({ status: "active" })
      .eq("id", payment.enrollmentId);

    // Increment course enrollment count
    const enroll = Array.isArray(payment.enrollment)
      ? payment.enrollment[0]
      : payment.enrollment;
    const courseId = enroll?.courseId || payment.courseId;
    const { data: course } = await supabaseAdmin!
      .from("Course")
      .select("enrollmentCount")
      .eq("id", courseId)
      .single();
    if (course) {
      await supabaseAdmin!
        .from("Course")
        .update({ enrollmentCount: (course.enrollmentCount || 0) + 1 })
        .eq("id", courseId);
    }

    console.log(
      `[PAYMENT] Payment approved: ${paymentId} by admin ${adminUserId}`,
    );
    return updatedPayment;
  }

  /**
   * Reject a local payment (admin action)
   */
  static async rejectPayment(
    paymentId: string,
    adminUserId: string,
    reason: string,
  ): Promise<any> {
    const payment = await this.getOne("Payment", paymentId, "*");

    if (payment.status !== "pending") {
      throw new Error("Payment is not in pending status");
    }

    const { data: updatedPayment, error: upErr } = await supabaseAdmin!
      .from("Payment")
      .update({
        status: "rejected",
        approvedBy: adminUserId,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason,
      })
      .eq("id", paymentId)
      .select()
      .single();
    if (upErr) throw new Error("Failed to reject payment");

    await supabaseAdmin!
      .from("Enrollment")
      .update({ status: "cancelled" })
      .eq("id", payment.enrollmentId);

    console.log(
      `[PAYMENT] Payment rejected: ${paymentId} by admin ${adminUserId}`,
    );
    return updatedPayment;
  }

  /**
   * Handle Laki Pay webhook callback
   */
  static async handleWebhook(payload: any): Promise<void> {
    const { transactionId, status } = payload;

    const { data: payment } = await supabaseAdmin!
      .from("Payment")
      .select("*, enrollment:Enrollment(*)")
      .eq("lakiPayTransactionId", transactionId)
      .maybeSingle();

    if (!payment) {
      console.error(`[WEBHOOK] Payment not found for TX: ${transactionId}`);
      return;
    }

    if (status === "completed") {
      await supabaseAdmin!
        .from("Payment")
        .update({
          status: "approved",
          approvedAt: new Date().toISOString(),
          lakiPayStatus: status,
          paymentGatewayResponse: payload,
        })
        .eq("id", payment.id);

      await supabaseAdmin!
        .from("Enrollment")
        .update({ status: "active" })
        .eq("id", payment.enrollmentId);

      const enroll = Array.isArray(payment.enrollment)
        ? payment.enrollment[0]
        : payment.enrollment;
      const courseId = enroll?.courseId || payment.courseId;
      const { data: course } = await supabaseAdmin!
        .from("Course")
        .select("enrollmentCount")
        .eq("id", courseId)
        .single();
      if (course) {
        await supabaseAdmin!
          .from("Course")
          .update({ enrollmentCount: (course.enrollmentCount || 0) + 1 })
          .eq("id", courseId);
      }

      console.log(
        `[WEBHOOK] Payment completed: ${transactionId}, enrollment activated`,
      );
    } else if (status === "failed" || status === "cancelled") {
      await supabaseAdmin!
        .from("Payment")
        .update({
          status: "rejected",
          lakiPayStatus: status,
          rejectedAt: new Date().toISOString(),
          rejectionReason: `Laki Pay: ${status}`,
        })
        .eq("id", payment.id);

      await supabaseAdmin!
        .from("Enrollment")
        .update({ status: "cancelled" })
        .eq("id", payment.enrollmentId);

      console.log(`[WEBHOOK] Payment ${status}: ${transactionId}`);
    }
  }

  /**
   * Get user's payment history
   */
  static async getUserPayments(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const from = skip;
    const to = skip + limit - 1;

    const {
      data: payments,
      count,
      error,
    } = await supabaseAdmin!
      .from("Payment")
      .select("*, course:Course(id, title, coverImage)", { count: "exact" })
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .range(from, to);

    if (error) throw new Error("Failed to fetch payments");

    return {
      payments: payments || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Get pending payments for admin review
   */
  static async getPendingPayments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const from = skip;
    const to = skip + limit - 1;

    const {
      data: payments,
      count,
      error,
    } = await supabaseAdmin!
      .from("Payment")
      .select(
        "*, user:User(id, fullName, email, username, phoneNumber), course:Course(id, title, coverImage)",
        { count: "exact" },
      )
      .eq("paymentType", "local")
      .eq("status", "pending")
      .order("createdAt", { ascending: true })
      .range(from, to);

    if (error) throw new Error("Failed to fetch pending payments");

    return {
      payments: payments || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    };
  }
}

export default PaymentService;

