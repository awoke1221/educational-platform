// src/lib/validators/schemas.ts
// Enterprise-Grade Data Validation with Zod

import { z } from "zod";

// ============================================
// AUTHENTICATION SCHEMAS
// ============================================

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must not exceed 50 characters")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Username can only contain letters, numbers, underscores, and hyphens",
      )
      .optional(),

    email: z.string().email("Invalid email address").toLowerCase().optional(),

    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(255, "Full name must not exceed 255 characters")
      .optional(),

    phoneNumber: z
      .string()
      .regex(/^\+?\d{7,15}$/, "Invalid phone number format"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must not exceed 128 characters")
      .optional(),

    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),

  password: z.string().min(1, "Password is required"),

  rememberMe: z.boolean().optional().default(false),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),

    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),

    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ============================================
// USER PROFILE SCHEMAS
// ============================================

export const updateProfileSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must not exceed 50 characters")
      .optional(),

    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(255, "Full name must not exceed 255 characters")
      .optional(),

    phoneNumber: z
      .string()
      .regex(/^(\+?\d{1,15})?$/, "Invalid phone number format")
      .optional(),

    profileImage: z.string().url("Invalid image URL").optional(),
  })
  .partial();

export const uploadProfileImageSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 5 * 1024 * 1024,
      "File size must not exceed 5MB",
    )
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "File must be an image (JPEG, PNG, or WebP)",
    ),
});

// ============================================
// COURSE SCHEMAS
// ============================================

export const createCourseSchema = z.object({
  lectures: z
    .array(
      z.object({
        title: z
          .string()
          .min(3, "Title must be at least 3 characters")
          .max(255, "Title must not exceed 255 characters"),
        description: z
          .string()
          .max(2000, "Description must not exceed 2000 characters")
          .optional(),
        orderIndex: z
          .number()
          .int("Order index must be an integer")
          .min(0, "Order index cannot be negative")
          .optional(),
        videoUrl: z.string().url("Invalid video URL").optional(),
        cloudinaryPublicId: z.string().optional(),
        duration: z
          .number()
          .int()
          .min(0, "Duration must be a positive integer")
          .optional(),
        videoSize: z
          .number()
          .int()
          .min(0, "Video size must be a positive integer")
          .optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .optional(),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(255, "Title must not exceed 255 characters"),

  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must not exceed 5000 characters"),

  shortDescription: z
    .string()
    .min(10, "Short description must be at least 10 characters")
    .max(500, "Short description must not exceed 500 characters")
    .optional(),

  coverImage: z.string().url("Invalid cover image URL").optional(),

  price: z
    .number()
    .min(0, "Price cannot be negative")
    .max(999999, "Price is too high"),

  level: z.enum(["beginner", "intermediate", "advanced"]),

  category: z
    .string()
    .min(1, "Category is required")
    .max(100, "Category must not exceed 100 characters"),

  tags: z.array(z.string()).optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

// ============================================
// LECTURE SCHEMAS
// ============================================

export const createLectureSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),

  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(255, "Title must not exceed 255 characters"),

  description: z
    .string()
    .max(2000, "Description must not exceed 2000 characters")
    .optional(),

  orderIndex: z
    .number()
    .int("Order index must be an integer")
    .min(0, "Order index cannot be negative")
    .optional(),
});

export const uploadLectureVideoSchema = z.object({
  lectureId: z.string().cuid("Invalid lecture ID"),

  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 5 * 1024 * 1024 * 1024,
      "File size must not exceed 5GB",
    )
    .refine(
      (file) => ["video/mp4", "video/webm", "video/ogg"].includes(file.type),
      "File must be a video (MP4, WebM, or OGG)",
    ),
});

// ============================================
// PAYMENT SCHEMAS
// ============================================

export const localPaymentSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),

  amount: z.number().min(1, "Amount must be greater than 0"),

  paymentMethod: z.enum(["telebirr", "cb_birr", "bank_transfer"]),

  transactionId: z
    .string()
    .min(1, "Transaction ID is required")
    .max(100, "Transaction ID is too long"),
});

export const uploadPaymentScreenshotSchema = z.object({
  paymentId: z.string().cuid("Invalid payment ID"),

  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      "File size must not exceed 10MB",
    )
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "File must be an image (JPEG, PNG, or WebP)",
    ),
});

export const diasporaPaymentSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),

  amount: z.number().min(1, "Amount must be greater than 0"),
});

// ============================================
// ENROLLMENT SCHEMAS
// ============================================

export const updateProgressSchema = z.object({
  lectureId: z.string().cuid("Invalid lecture ID"),

  watchDuration: z
    .number()
    .int("Watch duration must be an integer")
    .min(0, "Watch duration cannot be negative"),

  watchPercentage: z
    .number()
    .min(0, "Watch percentage cannot be negative")
    .max(100, "Watch percentage cannot exceed 100"),

  isCompleted: z.boolean().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CreateLectureInput = z.infer<typeof createLectureSchema>;
export type LocalPaymentInput = z.infer<typeof localPaymentSchema>;
export type DasporaPaymentInput = z.infer<typeof diasporaPaymentSchema>;
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
