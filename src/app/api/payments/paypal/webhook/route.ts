import { NextRequest, NextResponse } from "next/server";
import PaymentService from "@/lib/payment";
import PayPalService from "@/lib/payment/paypal";

const COMPLETED_EVENTS = new Set([
  "PAYMENT.CAPTURE.COMPLETED",
  "CHECKOUT.ORDER.COMPLETED",
]);

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headers = {
    "paypal-auth-algo": request.headers.get("paypal-auth-algo") || "",
    "paypal-cert-url": request.headers.get("paypal-cert-url") || "",
    "paypal-transmission-id":
      request.headers.get("paypal-transmission-id") || "",
    "paypal-transmission-sig":
      request.headers.get("paypal-transmission-sig") || "",
    "paypal-transmission-time":
      request.headers.get("paypal-transmission-time") || "",
  };

  try {
    const verified = await PayPalService.getInstance().verifyWebhookSignature(
      rawBody,
      headers,
    );
    if (!verified) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 },
      );
    }

    const event = JSON.parse(rawBody) as {
      event_type?: string;
      resource?: {
        id?: string;
        supplementary_data?: { related_ids?: { order_id?: string } };
      };
    };
    if (!event.event_type || !COMPLETED_EVENTS.has(event.event_type)) {
      return NextResponse.json({ received: true });
    }

    const orderId =
      event.resource?.supplementary_data?.related_ids?.order_id ||
      event.resource?.id;
    if (!orderId) {
      return NextResponse.json(
        { error: "Missing PayPal order ID" },
        { status: 400 },
      );
    }

    await PaymentService.completePayPalPayment(orderId, event.resource || {});
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[PAYPAL WEBHOOK ERROR]", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
