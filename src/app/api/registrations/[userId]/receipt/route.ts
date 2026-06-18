import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { StorageService } from "@/lib/storage/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const { paymentMethod, paymentChannel, filename, fileBase64 } = body;

    // ── Validate required fields ──
    if (!userId || !fileBase64 || !filename) {
      return NextResponse.json(
        { error: "Missing required fields: userId, filename, fileBase64" },
        { status: 400 },
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // ── Validate file size (base64 length ~ 4/3 of binary size) ──
    const estimatedBytes = Math.ceil((fileBase64.length * 3) / 4);
    if (estimatedBytes > StorageService.maxFileSize) {
      return NextResponse.json(
        {
          error: `File too large (${(estimatedBytes / 1024 / 1024).toFixed(1)}MB). Maximum: ${StorageService.maxFileSize / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // ── Detect MIME type from base64 prefix or filename extension ──
    let mimeType = "image/png"; // default
    if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    } else if (filename.endsWith(".png")) {
      mimeType = "image/png";
    } else if (filename.endsWith(".webp")) {
      mimeType = "image/webp";
    } else if (filename.endsWith(".gif")) {
      mimeType = "image/gif";
    }

    // ── Upload to Supabase Storage ──
    const uploadResult = await StorageService.uploadReceipt(
      userId,
      fileBase64,
      filename,
      mimeType,
    );

    if (!uploadResult.success) {
      console.error("[RECEIPT] Storage upload failed:", uploadResult.error);
      return NextResponse.json(
        { error: uploadResult.error || "Failed to upload receipt image" },
        { status: 500 },
      );
    }

    // ── Persist receipt info on the User record ──
    const { error: updateError } = await supabaseAdmin
      .from("User")
      .update({
        pendingReceiptUrl: uploadResult.publicUrl,
        paymentMethod: paymentChannel || paymentMethod,
        paymentStatus: "submitted",
      })
      .eq("id", userId);

    if (updateError) {
      console.error("[RECEIPT] DB update error:", updateError);

      // Rollback: delete the uploaded file if DB update fails
      await StorageService.deleteFile(uploadResult.storagePath).catch((e) =>
        console.error("[RECEIPT] Rollback delete failed:", e),
      );

      return NextResponse.json(
        { error: "Failed to save receipt info" },
        { status: 500 },
      );
    }

    console.log(
      `[RECEIPT] User ${userId} submitted receipt: ${uploadResult.storagePath}`,
    );

    return NextResponse.json(
      {
        success: true,
        publicUrl: uploadResult.publicUrl,
        storagePath: uploadResult.storagePath,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[RECEIPT POST ERROR]", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
