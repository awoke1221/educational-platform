import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const from =
  process.env.RESEND_FROM_EMAIL ||
  "Adonay TikTok Academy <noreply@adonaytiktokacademy.com>";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function sendEmail(
  to: string | null | undefined,
  subject: string,
  html: string,
) {
  if (!to) return;
  if (!resend) {
    console.warn("[EMAIL] RESEND_API_KEY is not configured");
    return;
  }
  try {
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) console.error("[EMAIL] Resend error:", error);
  } catch (error) {
    console.error("[EMAIL] Send error:", error);
  }
}

const layout = (content: string) =>
  `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:auto"><h1 style="color:#991b1b">Adonay TikTok Academy</h1>${content}<p>Regards,<br>Adonay TikTok Academy</p></div>`;

export const EmailService = {
  async localPaymentSubmitted(
    user: { email?: string; fullName?: string } | null,
    courseTitle: string,
  ) {
    await sendEmail(
      user?.email,
      "Payment receipt received",
      layout(
        `<p>Hello ${user?.fullName || "there"},</p><p>We received your payment receipt for <strong>${courseTitle}</strong>. Your payment is <strong>pending verification</strong> by our admin team. Course access will be enabled after approval.</p>`,
      ),
    );
  },
  async localPaymentApproved(
    user: { email?: string; fullName?: string } | null,
    courseTitle: string,
    courseId: string,
  ) {
    await sendEmail(
      user?.email,
      "Your course access is approved",
      layout(
        `<p>Congratulations ${user?.fullName || ""}!</p><p>Your payment for <strong>${courseTitle}</strong> has been approved. Your course status is now open and you can start learning.</p><p><a href="${appUrl}/courses/${courseId}">Access your course</a></p>`,
      ),
    );
  },
  async localPaymentRejected(
    user: { email?: string; fullName?: string } | null,
    courseTitle: string,
    reason?: string,
  ) {
    await sendEmail(
      user?.email,
      "Payment receipt rejected",
      layout(
        `<p>Hello ${user?.fullName || "there"},</p><p>Unfortunately, the payment receipt submitted for <strong>${courseTitle}</strong> was rejected.</p>${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}<p>Please submit a valid receipt if you believe this was a mistake.</p>`,
      ),
    );
  },
  async paypalPaymentCompleted(
    user: { email?: string; fullName?: string } | null,
    courseTitle: string,
    courseId: string,
  ) {
    await sendEmail(
      user?.email,
      "PayPal payment successful",
      layout(
        `<p>Congratulations ${user?.fullName || ""}!</p><p>Your PayPal payment for <strong>${courseTitle}</strong> was completed successfully. Your course access is now open.</p><p><a href="${appUrl}/courses/${courseId}">Access your course</a></p>`,
      ),
    );
  },
  async paypalPaymentFailed(
    user: { email?: string; fullName?: string } | null,
    courseTitle: string,
    reason: string,
  ) {
    await sendEmail(
      user?.email,
      "PayPal payment failed",
      layout(
        `<p>Hello ${user?.fullName || "there"},</p><p>Your PayPal payment for <strong>${courseTitle}</strong> could not be completed.</p><p><strong>Details:</strong> ${reason}</p><p>Please try again or use another payment method.</p>`,
      ),
    );
  },
};
