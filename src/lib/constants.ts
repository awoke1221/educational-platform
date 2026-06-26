// src/lib/constants.ts
// Application Constants

// ============================================
// User Roles
// ============================================

export const USER_ROLES = {
  USER: "user",
  INSTRUCTOR: "instructor",
  ADMIN: "admin",
} as const;

// ============================================
// Course Levels
// ============================================

export const COURSE_LEVELS = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
} as const;

// ============================================
// Payment Methods
// ============================================

export const PAYMENT_METHODS = {
  LOCAL: "local",
  DIASPORA: "diaspora",
} as const;

export const LOCAL_PAYMENT_TYPES = {
  TELEBIRR: "telebirr",
  CB_BIRR: "cb_birr",
  BANK_TRANSFER: "bank_transfer",
} as const;

export const DIASPORA_PAYMENT_TYPES = {
  LAKI_PAY: "laki_pay",
} as const;

// ============================================
// Payment Statuses
// ============================================

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

// ============================================
// Enrollment Statuses
// ============================================

export const ENROLLMENT_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

// ============================================
// Device Types
// ============================================

export const DEVICE_TYPES = {
  MOBILE: "mobile",
  TABLET: "tablet",
  DESKTOP: "desktop",
} as const;

// ============================================
// API Endpoints
// ============================================

export const API_ENDPOINTS = {
  // Auth
  REGISTER: "/api/auth/register",
  LOGIN: "/api/auth/login",
  LOGOUT: "/api/auth/logout",
  REFRESH: "/api/auth/refresh",

  // User
  PROFILE: "/api/user/profile",
  DEVICES: "/api/user/devices",

  // Health
  HEALTH: "/api/health",
} as const;

// ============================================
// Coming Soon
// ============================================

export const COMMINGSOON_SOURCE = {
  HOMEPAGE: "homepage",
  COURSES: "courses",
  REGISTER: "register",
} as const;

export const COMMINGSOON_LOCATION_TYPE = {
  LOCAL: "local",
  DIASPORA: "diaspora",
} as const;

// ============================================
// HTTP Status Codes
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================
// Error Messages
// ============================================

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  ACCOUNT_INACTIVE: "Account is inactive",
  ACCOUNT_BANNED: "Account has been banned",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access denied",
  NOT_FOUND: "Resource not found",
  VALIDATION_FAILED: "Validation failed",
  INTERNAL_ERROR: "An internal error occurred",
  DATABASE_ERROR: "Database error",
  DUPLICATE_EMAIL: "Email already registered",
  DUPLICATE_USERNAME: "Username already taken",
  PASSWORD_MISMATCH: "Passwords do not match",
  WEAK_PASSWORD: "Password does not meet security requirements",
} as const;

// ============================================
// Validation Rules
// ============================================

export const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },
  PASSWORD: {
    MIN_LENGTH: 12,
    MAX_LENGTH: 128,
  },
  FULL_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 255,
  },
  COURSE_TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 255,
  },
  COURSE_DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 5000,
  },
  MAX_DEVICES: 2,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
} as const;

// ============================================
// Token Expiration
// ============================================

export const TOKEN_EXPIRATION = {
  ACCESS_TOKEN: 900, // 15 minutes in seconds
  REFRESH_TOKEN: 2592000, // 30 days in seconds
  PASSWORD_RESET: 3600, // 1 hour in seconds
} as const;

// ============================================
// File Upload Limits
// ============================================

export const FILE_LIMITS = {
  PROFILE_IMAGE: 5 * 1024 * 1024, // 5MB
  PAYMENT_SCREENSHOT: 10 * 1024 * 1024, // 10MB
  LECTURE_VIDEO: 5 * 1024 * 1024 * 1024, // 5GB
} as const;

// ============================================
// Supported File Types
// ============================================

export const SUPPORTED_FILE_TYPES = {
  IMAGE: ["image/jpeg", "image/png", "image/webp"],
  VIDEO: ["video/mp4", "video/webm", "video/ogg"],
} as const;

// ============================================
// Regex Patterns
// ============================================

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  USERNAME: /^[a-zA-Z0-9_-]+$/,
  URL: /^https?:\/\/.+/,
} as const;

// ============================================
// Pagination
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// ============================================
// Cache Keys
// ============================================

export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  COURSE_DETAILS: (courseId: string) => `course:${courseId}:details`,
  USER_ENROLLMENTS: (userId: string) => `user:${userId}:enrollments`,
} as const;
