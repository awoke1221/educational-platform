// ============================================
// Cloudinary Onboarding Script
// Tests: Upload, Metadata, and Transformation
//
// Reads credentials from .env file — the
// single source of truth for all config.
// ============================================

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const cloudinary = require("cloudinary").v2;

// ─── Step 1: Configure Cloudinary from .env ───
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── Main Function ───
async function main() {
  try {
    // ───────────────────────────────────────────
    // Step 2: Upload a sample image
    // ───────────────────────────────────────────
    console.log("📤 Uploading sample image...\n");

    const uploadResult = await cloudinary.uploader.upload(
      "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      { folder: "onboarding-test" },
    );

    console.log("✅ Upload successful!");
    console.log("   Secure URL:", uploadResult.secure_url);
    console.log("   Public ID: ", uploadResult.public_id);
    console.log("");

    // ───────────────────────────────────────────
    // Step 3: Get image metadata
    // ───────────────────────────────────────────
    console.log("📋 Image Metadata:");
    console.log("   Width:     ", uploadResult.width, "px");
    console.log("   Height:    ", uploadResult.height, "px");
    console.log("   Format:    ", uploadResult.format);
    console.log("   File Size: ", uploadResult.bytes, "bytes");
    console.log("");

    // ───────────────────────────────────────────
    // Step 4: Generate transformed URL
    //
    // f_auto — Automatically selects the best
    //          format (e.g. WebP, AVIF) based on
    //          the visitor's browser support.
    //
    // q_auto — Automatically optimizes quality
    //          to balance visual quality and
    //          smallest file size.
    // ───────────────────────────────────────────
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [
        { width: 400, height: 400, crop: "fill" },
        { fetch_format: "auto", quality: "auto" },
      ],
    });

    console.log("🖼️  Transformed Image:");
    console.log("   URL:", transformedUrl);
    console.log("");
    console.log(
      "✅ Done! Click link below to see optimized version of the image.",
    );
    console.log("   Check the size and the format.");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
