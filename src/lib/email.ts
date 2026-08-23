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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const layout = ({
  preview,
  eyebrow,
  title,
  content,
  action,
}: {
  preview: string;
  eyebrow: string;
  title: string;
  content: string;
  action?: { label: string; href: string };
}) => `<!doctype html>
<html lang="en">
  <head><meta name="x-apple-disable-message-reformatting"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head>
  <body style="margin:0;background:#f3f5f7;color:#17212b;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f7;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e1e7eb;border-radius:12px;overflow:hidden">
          <tr><td style="background:#101b2d;padding:24px 32px">
            <div style="color:#f7c948;font-size:12px;line-height:1.4;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase">ADONAY TIKTOK ACADEMY</div>
            <div style="color:#ffffff;font-size:13px;line-height:1.5;margin-top:6px">Learn with purpose. Grow with confidence.</div>
          </td></tr>
          <tr><td style="padding:36px 32px 28px">
            <div style="color:#b42318;font-size:12px;line-height:1.4;font-weight:bold;letter-spacing:1px;text-transform:uppercase">${escapeHtml(eyebrow)}</div>
            <h1 style="margin:10px 0 18px;color:#101b2d;font-size:28px;line-height:1.2;font-weight:700">${escapeHtml(title)}</h1>
            <div style="font-size:16px;line-height:1.7;color:#465362">${content}</div>
            ${action ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px"><tr><td style="border-radius:6px;background:#b42318"><a href="${escapeHtml(action.href)}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold">${escapeHtml(action.label)}</a></td></tr></table>` : ""}
          </td></tr>
          <tr><td style="border-top:1px solid #e9edef;padding:22px 32px;color:#718096;font-size:13px;line-height:1.6">
            Need help? Reply to this email and our team will be happy to assist.<br><br>
            With care,<br><strong style="color:#344054">Adonay TikTok Academy</strong>
          </td></tr>
        </table>
        <div style="max-width:620px;padding:18px 20px 0;color:#8793a0;font-size:11px;line-height:1.5">This is an account notification from Adonay TikTok Academy.</div>
      </td></tr>
    </table>
  </body>
</html>`;

export const EmailService = {
  async localPaymentSubmitted(
    user: { email?: string; fullName?: string } | null,
    courseTitle: string,
  ) {
    await sendEmail(
      user?.email,
      "We received your payment receipt",
      layout({
        preview: `Your payment receipt for ${courseTitle} is now under review.`,
        eyebrow: "Payment received",
        title: "Your receipt is under review",
        content: `<p style="margin:0 0 16px">Hello ${escapeHtml(user?.fullName || "there")},</p><p style="margin:0">We have received your payment receipt for <strong style="color:#17212b">${escapeHtml(courseTitle)}</strong>. Our team will verify the details and update you as soon as the review is complete.</p><p style="margin:16px 0 0;color:#667085;font-size:14px">Your course access will be activated after approval. No further action is needed right now.</p>`,
      }),
    );
  },
  async localPaymentApproved(
    user: { email?: string; fullName?: string } | null,
    courseTitle: string,
    courseId: string,
  ) {
    await sendEmail(
      user?.email,
      "Your course is ready to start",
      layout({
        preview: `Your payment for ${courseTitle} was approved. Your course is ready.`,
        eyebrow: "Access approved",
        title: "Your learning journey starts now",
        content: `<p style="margin:0 0 16px">Congratulations ${escapeHtml(user?.fullName || "there")}!</p><p style="margin:0">Your payment for <strong style="color:#17212b">${escapeHtml(courseTitle)}</strong> has been approved. Your course access is active and your lessons are ready when you are.</p>`,
        action: {
          label: "Open my course",
          href: `${appUrl}/courses/${courseId}`,
        },
      }),
    );
  },
  async localPaymentRejected(
    user: { email?: string; fullName?: string } | null,
    courseTitle: string,
    reason?: string,
  ) {
    await sendEmail(
      user?.email,
      "Action needed: payment receipt review",
      layout({
        preview: `We need an updated payment receipt for ${courseTitle}.`,
        eyebrow: "Action needed",
        title: "Please review your payment receipt",
        content: `<p style="margin:0 0 16px">Hello ${escapeHtml(user?.fullName || "there")},</p><p style="margin:0">The payment receipt submitted for <strong style="color:#17212b">${escapeHtml(courseTitle)}</strong> could not be approved.</p>${reason ? `<div style="margin:20px 0;padding:14px 16px;border-left:3px solid #f7c948;background:#fff8e1;color:#5d4a12"><strong>Review note</strong><br>${escapeHtml(reason)}</div>` : ""}<p style="margin:16px 0 0">Please submit a clear, valid receipt so our team can review your payment again.</p>`,
      }),
    );
  },
  async paypalPaymentCompleted(
    user: { email?: string; fullName?: string } | null,
    courseTitle: string,
    courseId: string,
  ) {
    await sendEmail(
      user?.email,
      "PayPal payment confirmed",
      layout({
        preview: `Your PayPal payment for ${courseTitle} was completed successfully.`,
        eyebrow: "Payment confirmed",
        title: "Payment successful",
        content: `<p style="margin:0 0 16px">Congratulations ${escapeHtml(user?.fullName || "there")}!</p><p style="margin:0">Your PayPal payment for <strong style="color:#17212b">${escapeHtml(courseTitle)}</strong> was completed successfully. Your course access is active and ready.</p>`,
        action: {
          label: "Start learning",
          href: `${appUrl}/courses/${courseId}`,
        },
      }),
    );
  },
  async paypalPaymentFailed(
    user: { email?: string; fullName?: string } | null,
    courseTitle: string,
    reason: string,
  ) {
    await sendEmail(
      user?.email,
      "Action needed: PayPal payment was not completed",
      layout({
        preview: `Your PayPal payment for ${courseTitle} needs another attempt.`,
        eyebrow: "Payment not completed",
        title: "Let's complete your payment",
        content: `<p style="margin:0 0 16px">Hello ${escapeHtml(user?.fullName || "there")},</p><p style="margin:0">Your PayPal payment for <strong style="color:#17212b">${escapeHtml(courseTitle)}</strong> could not be completed.</p><div style="margin:20px 0;padding:14px 16px;border-left:3px solid #b42318;background:#fff4f2;color:#7a271a"><strong>Details</strong><br>${escapeHtml(reason)}</div><p style="margin:16px 0 0">Please try again or choose another payment method. Your course enrollment will remain available while you do so.</p>`,
      }),
    );
  },
};
