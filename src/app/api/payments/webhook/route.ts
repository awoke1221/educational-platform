// src/app/api/payments/webhook/route.ts
// Laki Pay Webhook Handler

import { NextRequest, NextResponse } from "next/server";
import PaymentService from "@/lib/payment";
import LakiPayService from "@/lib/payment/lakiPay";

// ============================================
// POST /api/payments/webhook - Laki Pay Webhook
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature =
      request.headers.get("x-lakipay-signature") ||
      request.headers.get("X-Webhook-Signature") ||
      "";

    console.log("[WEBHOOK] Received Laki Pay webhook:", {
      event: body.event,
      transactionId: body.transaction_id || body.transactionId,
      status: body.status,
    });

    // Verify webhook signature
    const lakiPay = LakiPayService.getInstance();
    const isValid = lakiPay.verifyWebhookSignature(body, signature);

    if (!isValid && process.env.NODE_ENV === "production") {
      console.warn("[WEBHOOK] Invalid signature received");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Normalize payload
    const payload = {
      transactionId: body.transaction_id || body.transactionId,
      status: body.status?.toLowerCase(),
      merchantReference: body.merchant_reference || body.merchantReference,
      amount: body.amount,
      currency: body.currency,
      paymentMethod: body.payment_method || body.paymentMethod,
      paidAt: body.paid_at || body.paidAt,
      metadata: body.metadata || {},
      signature,
    };

    // Process the webhook
    await PaymentService.handleWebhook(payload);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error);

    // Always return 200 to acknowledge receipt
    return NextResponse.json(
      { received: true, error: "Processing error" },
      { status: 200 },
    );
  }
}
