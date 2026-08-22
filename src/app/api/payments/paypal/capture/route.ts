import { NextRequest, NextResponse } from "next/server";
import PaymentService from "@/lib/payment";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("token");
  if (!orderId)
    return NextResponse.redirect(
      new URL("/payment/cancel?reason=missing_order", request.url),
    );
  try {
    await PaymentService.capturePayPalPayment(orderId);
    return NextResponse.redirect(new URL("/payment/success", request.url));
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "PayPal transaction failed";
    return NextResponse.redirect(
      new URL(
        `/payment/cancel?reason=${encodeURIComponent(reason)}`,
        request.url,
      ),
    );
  }
}
