// src/config/env.ts
// Environment Configuration with Validation

// ============================================
// Required Environment Variables
// ============================================

const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "JWT_SECRET",
];

function normalizeUrl(value: string) {
  return value ? value.replace(/\/+$|^\s+|\s+$/g, "") : "";
}

function normalizeBunnyStorageZone(value: string) {
  const trimmedValue = value?.trim() || "";
  if (!trimmedValue) return "";

  try {
    const url = new URL(trimmedValue);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments.length > 0 ? segments[segments.length - 1] : trimmedValue;
  } catch {
    return trimmedValue;
  }
}

// ============================================
// Environment Configuration Object
// ============================================

export const env = {
  // ============================================
  // Supabase Configuration
  // ============================================
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },

  // ============================================
  // Database Configuration
  // ============================================
  database: {
    url: process.env.DATABASE_URL || "",
  },

  // ============================================
  // JWT Configuration
  // ============================================
  jwt: {
    secret: process.env.JWT_SECRET || "",
    accessTokenExpiry: parseInt(process.env.JWT_EXPIRATION || "900"), // 15 minutes
    refreshTokenExpiry: parseInt(
      process.env.REFRESH_TOKEN_EXPIRATION || "2592000",
    ), // 30 days
  },

  // ============================================
  // Cloudinary Configuration
  // ============================================
  cloudinary: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || "",
  },

  // ============================================
  // Bunny Storage + Pull Zone Configuration
  // ============================================
  bunny: {
    accessKey: process.env.BUNNY_ACCESS_KEY?.trim() || "",
    storageZone: normalizeBunnyStorageZone(
      process.env.BUNNY_STORAGE_ZONE || "",
    ),
    storageZoneName:
      process.env.BUNNY_STORAGE_ZONE_NAME?.trim() ||
      normalizeBunnyStorageZone(process.env.BUNNY_STORAGE_ZONE || ""),
    pullZoneUrl: normalizeUrl(
      process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL || "",
    ),
    pullZoneId: process.env.BUNNY_PULL_ZONE_ID?.trim() || "",
    pullZonePassword: process.env.BUNNY_PULL_ZONE_PASSWORD?.trim() || "",
    defaultFolder:
      process.env.NEXT_PUBLIC_BUNNY_DEFAULT_FOLDER?.trim() ||
      "educational-platform",
    demoVideoUrl: process.env.NEXT_PUBLIC_BUNNY_DEMO_VIDEO_URL?.trim() || "",
    apiUrl: process.env.BUNNY_API_URL?.trim() || "https://api.bunny.net",
    // Token authentication configuration
    tokenAuthEnabled: process.env.BUNNY_TOKEN_AUTH_ENABLED === "true",
    tokenAuthKey:
      process.env.BUNNY_TOKEN_AUTH_KEY?.trim() ||
      process.env.BUNNY_ACCESS_KEY?.trim() ||
      "",
    tokenExpirationMinutes: parseInt(
      process.env.BUNNY_TOKEN_EXPIRATION_MINUTES || "60",
    ),
    // Thumbnail configuration
    thumbnailWidth: parseInt(process.env.BUNNY_THUMBNAIL_WIDTH || "640"),
    thumbnailHeight: parseInt(process.env.BUNNY_THUMBNAIL_HEIGHT || "360"),
    // Upload limits
    maxVideoSize: parseInt(process.env.BUNNY_MAX_VIDEO_SIZE || "5368709120"), // 5GB
    maxFileSize: parseInt(process.env.BUNNY_MAX_FILE_SIZE || "10485760"), // 10MB
    allowedVideoTypes: [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
    ],
    allowedImageTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ],
  },

  // ============================================
  // Payment Gateway Configuration
  // ============================================
  payment: {
    lakiPay: {
      apiKey: process.env.LAKI_PAY_API_KEY || "",
      apiSecret: process.env.LAKI_PAY_API_SECRET || "",
      webhookSecret: process.env.LAKI_PAY_WEBHOOK_SECRET || "",
      baseUrl: process.env.LAKI_PAY_BASE_URL || "https://api.lakipay.com",
    },
    telebirr: {
      merchantCode: process.env.TELEBIRR_MERCHANT_CODE || "",
      merchantKey: process.env.TELEBIRR_MERCHANT_KEY || "",
    },
  },

  // ============================================
  // Email Configuration
  // ============================================

  // ============================================
  // Application Configuration
  // ============================================
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || "Educational Platform",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
    environment: process.env.NODE_ENV || "development",
    debug: process.env.DEBUG === "true",
  },

  // ============================================
  // Supabase Storage Configuration
  // ============================================
  storage: {
    receiptsBucket: process.env.SUPABASE_STORAGE_RECEIPTS_BUCKET || "receipts",
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },

  // ============================================
  // CORS Configuration
  // ============================================
  cors: {
    allowedOrigins: (
      process.env.ALLOWED_ORIGINS || "http://localhost:3000"
    ).split(","),
  },

  // ============================================
  // Security Configuration
  // ============================================
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12"),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "12"),
    passwordResetTokenExpiry: parseInt(
      process.env.PASSWORD_RESET_TOKEN_EXPIRY || "3600",
    ), // 1 hour
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5"),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || "900000"), // 15 minutes
  },

  // ============================================
  // Rate Limiting
  // ============================================
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== "false",
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  },

  // ============================================
  // Monitoring & Logging
  // ============================================
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN || "",
      enabled: !!process.env.SENTRY_DSN,
    },
    datadog: {
      apiKey: process.env.DATADOG_API_KEY || "",
      enabled: !!process.env.DATADOG_API_KEY,
    },
  },
};

// ============================================
// Validate Required Environment Variables
// ============================================

export function validateEnv() {
  const missing: string[] = [];

  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  if (missing.length > 0) {
    console.warn(
      `[CONFIG] Missing environment variables: ${missing.join(", ")}`,
    );

    // In development, continue with warnings
    // In production, throw error
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`,
      );
    }
  }

  return true;
}

// ============================================
// Export Environment Configuration
// ============================================

export default env;
