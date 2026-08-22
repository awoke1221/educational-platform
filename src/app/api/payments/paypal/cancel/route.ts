import { NextRequest, NextResponse } from "next/server";
import PaymentService from "@/lib/payment";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("token");
  if (orderId) await PaymentService.cancelPayPalPayment(orderId);
  return NextResponse.redirect(
    new URL(
      `/payment/cancel${orderId ? "" : "?reason=missing_order"}`,
      request.url,
    ),
  );
}
