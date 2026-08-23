import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { EmailService } from "@/lib/email";
import PayPalService from "./paypal";

export type PaymentType = "local" | "diaspora";
export type LocalPaymentMethod = "telebirr" | "cb_birr" | "bank_transfer";

export interface ProcessPaymentParams {
  userId: string;
  courseId: string;
  amount: number;
  paymentType: PaymentType;
  paymentMethod?: LocalPaymentMethod;
  transactionId?: string;
}

export class PaymentService {
  private static async getOne(table: string, id: string, select = "*") {
    const { data, error } = await supabaseAdmin!
      .from(table)
      .select(select)
      .eq("id", id)
      .single();
    if (error || !data) throw new Error(`${table} not found`);
    // Database rows are intentionally dynamic because Supabase is queried by table name.
    return data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  static async processLocalPayment(params: ProcessPaymentParams) {
    const course = await this.getOne(
      "Course",
      params.courseId,
      "id, title, price",
    );
    const { data: existingEnrollment } = await supabaseAdmin!
      .from("Enrollment")
      .select("*, payment:Payment(*)")
      .eq("userId", params.userId)
      .eq("courseId", params.courseId)
      .maybeSingle();
    if (existingEnrollment?.status === "active")
      throw new Error("You are already enrolled in this course");
    const existingPayment = Array.isArray(existingEnrollment?.payment)
      ? existingEnrollment.payment[0]
      : existingEnrollment?.payment;
    if (existingPayment?.status === "pending")
      throw new Error("You have a pending payment for this course");
    let enrollment = existingEnrollment;
    if (enrollment) {
      const { data, error } = await supabaseAdmin!
        .from("Enrollment")
        .update({ status: "processing", updatedAt: new Date().toISOString() })
        .eq("id", enrollment.id)
        .select()
        .single();
      if (error) throw new Error("Failed to update enrollment");
      enrollment = data;
    } else {
      const { data, error } = await supabaseAdmin!
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
      if (error) throw new Error("Failed to create enrollment");
      enrollment = data;
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
      updatedAt: new Date().toISOString(),
    };
    const query = existingPayment
      ? supabaseAdmin!
          .from("Payment")
          .update(paymentPayload)
          .eq("id", existingPayment.id)
      : supabaseAdmin!.from("Payment").insert(paymentPayload);
    const { data: payment, error: paymentError } = await query
      .select()
      .single();
    if (paymentError || !payment) throw new Error("Failed to create payment");
    const { data: user } = await supabaseAdmin!
      .from("User")
      .select("email, fullName")
      .eq("id", params.userId)
      .maybeSingle();
    await EmailService.localPaymentSubmitted(user, course.title);
    return {
      success: true,
      payment,
      enrollment,
      message:
        "Payment submitted successfully. An admin will review and approve it shortly.",
    };
  }

  static async processDiasporaPayment(params: {
    userId: string;
    courseId: string;
    amount: number;
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
  }) {
    if (!PayPalService.isConfigured())
      throw new Error(
        "PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
      );
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
    if (existingEnrollment?.status === "active")
      throw new Error("You are already enrolled in this course");
    let enrollment = existingEnrollment;
    if (enrollment) {
      const { data, error } = await supabaseAdmin!
        .from("Enrollment")
        .update({ status: "processing", updatedAt: new Date().toISOString() })
        .eq("id", enrollment.id)
        .select()
        .single();
      if (error) throw new Error("Failed to update enrollment");
      enrollment = data;
    } else {
      const { data, error } = await supabaseAdmin!
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
      if (error) throw new Error("Failed to create enrollment");
      enrollment = data;
    }
    const paypalOrder = await PayPalService.getInstance().createOrder({
      amount: params.amount,
      currency: "USD",
      referenceId: `ENR-${enrollment.id}`,
      customId: enrollment.id,
      description: `Enrollment in ${course.title}`,
    });
    const { data: payment, error } = await supabaseAdmin!
      .from("Payment")
      .insert({
        enrollmentId: enrollment.id,
        userId: params.userId,
        courseId: params.courseId,
        amount: params.amount,
        currency: "USD",
        paymentType: "diaspora",
        paymentMethod: "paypal",
        status: "processing",
        paypalOrderId: paypalOrder.orderId,
        paypalStatus: paypalOrder.status,
        paymentGatewayResponse: paypalOrder,
      })
      .select()
      .single();
    if (error || !payment) {
      console.error("[PAYPAL] Payment record insert failed", {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      throw new Error("Failed to create PayPal payment");
    }
    return {
      success: true,
      checkoutUrl: paypalOrder.checkoutUrl,
      transactionId: paypalOrder.orderId,
      message: "Redirecting to PayPal...",
    };
  }

  static async capturePayPalPayment(orderId: string) {
    let capture;
    try {
      capture = await PayPalService.getInstance().captureOrder(orderId);
    } catch (error) {
      const existingOrder = await PayPalService.getInstance().getOrder(orderId);
      if (existingOrder.status !== "COMPLETED") throw error;
      capture = existingOrder;
    }
    if (capture.status !== "COMPLETED") {
      throw new Error(`PayPal payment status: ${capture.status || "unknown"}`);
    }
    return this.completePayPalPayment(orderId, capture);
  }

  static async completePayPalPayment(
    orderId: string,
    gatewayResponse: Record<string, unknown>,
  ) {
    const { data: payment } = await supabaseAdmin!
      .from("Payment")
      .select("*, user:User(email, fullName), course:Course(id, title)")
      .eq("paypalOrderId", orderId)
      .maybeSingle();
    if (!payment) throw new Error("PayPal payment not found");
    if (payment.status === "approved")
      return { success: true, message: "Payment already completed" };
    const course = Array.isArray(payment.course)
      ? payment.course[0]
      : payment.course;
    const user = Array.isArray(payment.user) ? payment.user[0] : payment.user;
    const { data: updatedPayment, error } = await supabaseAdmin!
      .from("Payment")
      .update({
        status: "approved",
        paypalStatus:
          typeof gatewayResponse.status === "string"
            ? gatewayResponse.status
            : "COMPLETED",
        approvedAt: new Date().toISOString(),
        paymentGatewayResponse: gatewayResponse,
      })
      .eq("id", payment.id)
      .eq("status", "processing")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!updatedPayment)
      return { success: true, message: "Payment already completed" };
    const { error: enrollmentError } = await supabaseAdmin!
      .from("Enrollment")
      .update({ status: "active", updatedAt: new Date().toISOString() })
      .eq("id", payment.enrollmentId);
    if (enrollmentError) throw enrollmentError;
    await EmailService.paypalPaymentCompleted(
      user,
      course?.title || "your course",
      course?.id || payment.courseId,
    );
    return { success: true, message: "PayPal payment completed successfully" };
  }

  static async cancelPayPalPayment(orderId: string) {
    const { data: payment } = await supabaseAdmin!
      .from("Payment")
      .select("*, user:User(email, fullName), course:Course(title)")
      .eq("paypalOrderId", orderId)
      .maybeSingle();
    if (!payment || payment.status !== "processing") return;
    const course = Array.isArray(payment.course)
      ? payment.course[0]
      : payment.course;
    const user = Array.isArray(payment.user) ? payment.user[0] : payment.user;
    const reason =
      "The PayPal checkout was cancelled before payment was completed.";
    await supabaseAdmin!
      .from("Payment")
      .update({
        status: "rejected",
        paypalStatus: "CANCELLED",
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason,
      })
      .eq("id", payment.id)
      .eq("status", "processing");
    await supabaseAdmin!
      .from("Enrollment")
      .update({ status: "cancelled", updatedAt: new Date().toISOString() })
      .eq("id", payment.enrollmentId);
    await EmailService.paypalPaymentFailed(
      user,
      course?.title || "your course",
      reason,
    );
  }

  static async approvePayment(
    paymentId: string,
    adminUserId: string,
    notes?: string,
  ) {
    const payment = await this.getOne(
      "Payment",
      paymentId,
      "*, enrollment:Enrollment(*)",
    );
    if (payment.status !== "pending")
      throw new Error("Payment is not in pending status");
    const { data: updated, error } = await supabaseAdmin!
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
    if (error) throw new Error("Failed to approve payment");
    await supabaseAdmin!
      .from("Enrollment")
      .update({ status: "active", updatedAt: new Date().toISOString() })
      .eq("id", payment.enrollmentId);
    return updated;
  }

  static async rejectPayment(
    paymentId: string,
    adminUserId: string,
    reason: string,
  ) {
    const payment = await this.getOne("Payment", paymentId);
    if (payment.status !== "pending")
      throw new Error("Payment is not in pending status");
    const { data: updated, error } = await supabaseAdmin!
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
    if (error) throw new Error("Failed to reject payment");
    await supabaseAdmin!
      .from("Enrollment")
      .update({ status: "cancelled", updatedAt: new Date().toISOString() })
      .eq("id", payment.enrollmentId);
    return updated;
  }

  static async getUserPayments(userId: string, page = 1, limit = 10) {
    const { data, count, error } = await supabaseAdmin!
      .from("Payment")
      .select("*, course:Course(id, title, coverImage)", { count: "exact" })
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (error) throw new Error("Failed to fetch payments");
    return {
      payments: data || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    };
  }

  static async getPendingPayments(page = 1, limit = 20) {
    const { data, count, error } = await supabaseAdmin!
      .from("Payment")
      .select(
        "*, user:User(id, fullName, email, username, phoneNumber), course:Course(id, title, coverImage)",
        { count: "exact" },
      )
      .eq("paymentType", "local")
      .eq("status", "pending")
      .order("createdAt", { ascending: true })
      .range((page - 1) * limit, page * limit - 1);
    if (error) throw new Error("Failed to fetch pending payments");
    return {
      payments: data || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    };
  }
}

export default PaymentService;
