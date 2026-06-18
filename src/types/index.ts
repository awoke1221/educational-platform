// src/types/index.ts
// Global TypeScript Types and Interfaces

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  passwordHash?: string;
  profileImage?: string;
  role: "user" | "instructor" | "admin";
  isActive: boolean;
  isApproved?: boolean;
  isBanned: boolean;
  lastLogin?: Date;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends Omit<User, "passwordHash"> {
  enrollmentCount?: number;
  completedCourses?: number;
}

// ============================================
// Course Types
// ============================================

export interface Course {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  coverImage: string;
  instructorId: string;
  price: number;
  currency: string;
  level: "beginner" | "intermediate" | "advanced";
  duration?: number;
  videoCount: number;
  enrollmentCount: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lecture {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  videoUrl?: string;
  cloudinaryPublicId?: string;
  duration?: number;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Enrollment Types
// ============================================

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: "active" | "completed" | "cancelled";
  completionPercentage: number;
  certificateIssued: boolean;
  enrolledAt: Date;
  completedAt?: Date;
}

// ============================================
// Payment Types
// ============================================

export interface Payment {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  currency: string;
  paymentMethod: "local" | "diaspora";
  paymentType?: "telebirr" | "cb_birr" | "bank_transfer" | "laki_pay";
  status: "pending" | "processing" | "approved" | "rejected";
  transactionId?: string;
  receiptUrl?: string;
  processedAt?: Date;
  createdAt: Date;
}

// ============================================
// Device Session Types
// ============================================

export interface DeviceSession {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceType: "mobile" | "tablet" | "desktop";
  userAgent: string;
  ipAddress: string;
  isActive: boolean;
  loginAt: Date;
  logoutAt?: Date;
}

// ============================================
// Certificate Types
// ============================================

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  verificationCode: string;
  verificationUrl: string;
  issuedAt: Date;
  expiresAt?: Date;
}

// ============================================
// Progress Types
// ============================================

export interface UserProgress {
  id: string;
  userId: string;
  lectureId: string;
  isCompleted: boolean;
  watchDuration: number;
  watchPercentage: number;
  completedAt?: Date;
}

// ============================================
// JWT Payload Types
// ============================================

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  deviceId?: string;
  iat?: number;
  exp?: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasMore: boolean;
}

// ============================================
// Request Body Types
// ============================================

export interface RegisterRequest {
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface CreateCourseRequest {
  title: string;
  description: string;
  shortDescription: string;
  price: number;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  tags: string[];
}

// ============================================
// Database Models
// ============================================

export type UserModel = User;
export type CourseModel = Course;
export type LectureModel = Lecture;
export type EnrollmentModel = Enrollment;
export type PaymentModel = Payment;
export type DeviceSessionModel = DeviceSession;
export type CertificateModel = Certificate;
export type UserProgressModel = UserProgress;
