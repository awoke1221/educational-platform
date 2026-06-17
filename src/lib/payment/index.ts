// src/lib/payment/index.ts
// Payment Service - Unified Payment Processing

import { prisma } from "@/lib/db/supabase";
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
  /**
   * Process a local payment (Telebirr, CB Birr, Bank Transfer)
   * These require admin approval before enrollment is activated
   */
  static async processLocalPayment(params: ProcessPaymentParams): Promise<{
    success: boolean;
    payment: any;
    enrollment: any;
    message: string;
  }> {
    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: { id: true, title: true, price: true },
    });

    if (!course) {
      throw new Error("Course not found");
    }

    // Check if user already has an active enrollment
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: params.userId,
          courseId: params.courseId,
        },
      },
      include: { payment: true },
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === "active") {
        throw new Error("You are already enrolled in this course");
      }
      if (existingEnrollment.payment?.status === "pending") {
        throw new Error("You have a pending payment for this course");
      }
    }

    // Create or update enrollment (pending)
    let enrollment;
    if (existingEnrollment) {
      enrollment = existingEnrollment;
    } else {
      enrollment = await prisma.enrollment.create({
        data: {
          userId: params.userId,
          courseId: params.courseId,
          status: "active", // Set active early, payment tracks approval
        },
      });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        enrollmentId: enrollment.id,
        userId: params.userId,
        courseId: params.courseId,
        amount: params.amount,
        currency: "ETB",
        paymentType: "local",
        paymentMethod: params.paymentMethod || "telebirr",
        status: "pending",
        transactionId: params.transactionId,
        receiptScreenshotUrl: params.receiptScreenshotUrl || null,
      },
    });

    // Log audit
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
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
      },
      message:
        "Payment submitted successfully. An admin will review and approve it shortly.",
    };
  }

  /**
   * Process a diaspora payment (Laki Pay)
   * These are processed immediately via Laki Pay
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
    // Check if Laki Pay is configured
    if (!LakiPayService.isConfigured()) {
      throw new Error(
        "Laki Pay is not configured. Please set LAKI_PAY_API_KEY and LAKI_PAY_API_SECRET.",
      );
    }

    // Verify course
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: { id: true, title: true, price: true },
    });

    if (!course) {
      throw new Error("Course not found");
    }

    // Check for existing enrollment
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: params.userId,
          courseId: params.courseId,
        },
      },
    });

    if (existingEnrollment?.status === "active") {
      throw new Error("You are already enrolled in this course");
    }

    // Create or update enrollment
    let enrollment;
    if (existingEnrollment) {
      enrollment = existingEnrollment;
    } else {
      enrollment = await prisma.enrollment.create({
        data: {
          userId: params.userId,
          courseId: params.courseId,
          status: "active",
        },
      });
    }

    // Initialize Laki Pay transaction
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

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        enrollmentId: enrollment.id,
        userId: params.userId,
        courseId: params.courseId,
        amount: params.amount,
        currency: "USD",
        paymentType: "diaspora",
        paymentMethod: "laki_pay",
        status: "processing",
        lakiPayTransactionId: lakiPayResponse.transactionId,
        paymentGatewayResponse: lakiPayResponse as any,
      },
    });

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
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { enrollment: true },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "pending") {
      throw new Error("Payment is not in pending status");
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "approved",
        approvedBy: adminUserId,
        approvedAt: new Date(),
        approvalNotes: notes || null,
      },
    });

    // Ensure enrollment is active
    await prisma.enrollment.update({
      where: { id: payment.enrollmentId },
      data: { status: "active" },
    });

    // Increment course enrollment count
    await prisma.course.update({
      where: { id: payment.courseId },
      data: { enrollmentCount: { increment: 1 } },
    });

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
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { enrollment: true },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "pending") {
      throw new Error("Payment is not in pending status");
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "rejected",
        approvedBy: adminUserId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Cancel enrollment
    await prisma.enrollment.update({
      where: { id: payment.enrollmentId },
      data: { status: "cancelled" },
    });

    console.log(
      `[PAYMENT] Payment rejected: ${paymentId} by admin ${adminUserId}`,
    );

    return updatedPayment;
  }

  /**
   * Handle Laki Pay webhook callback
   */
  static async handleWebhook(payload: any): Promise<void> {
    const { transactionId, status, merchantReference, metadata } = payload;

    // Find payment by Laki Pay transaction ID
    const payment = await prisma.payment.findFirst({
      where: { lakiPayTransactionId: transactionId },
      include: { enrollment: true },
    });

    if (!payment) {
      console.error(`[WEBHOOK] Payment not found for TX: ${transactionId}`);
      return;
    }

    if (status === "completed") {
      // Approve payment
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "approved",
          approvedAt: new Date(),
          lakiPayStatus: status,
          paymentGatewayResponse: payload,
        },
      });

      // Activate enrollment
      await prisma.enrollment.update({
        where: { id: payment.enrollmentId },
        data: { status: "active" },
      });

      // Increment enrollment count
      await prisma.course.update({
        where: { id: payment.courseId },
        data: { enrollmentCount: { increment: 1 } },
      });

      console.log(
        `[WEBHOOK] Payment completed: ${transactionId}, enrollment activated`,
      );
    } else if (status === "failed" || status === "cancelled") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "rejected",
          lakiPayStatus: status,
          rejectedAt: new Date(),
          rejectionReason: `Laki Pay: ${status}`,
        },
      });

      // Cancel enrollment
      await prisma.enrollment.update({
        where: { id: payment.enrollmentId },
        data: { status: "cancelled" },
      });

      console.log(`[WEBHOOK] Payment ${status}: ${transactionId}`);
    }
  }

  /**
   * Get user's payment history
   */
  static async getUserPayments(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              coverImage: true,
            },
          },
        },
      }),
      prisma.payment.count({ where: { userId } }),
    ]);

    return {
      payments,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get pending payments for admin review
   */
  static async getPendingPayments(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: {
          paymentType: "local",
          status: "pending",
        },
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              username: true,
              phoneNumber: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              coverImage: true,
            },
          },
        },
      }),
      prisma.payment.count({
        where: {
          paymentType: "local",
          status: "pending",
        },
      }),
    ]);

    return {
      payments,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}

export default PaymentService;
