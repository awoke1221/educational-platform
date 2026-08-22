-- ============================================
-- Adonay tiktok academy Database Schema for Supabase
-- Go to: https://supabase.com/dashboard/project/gsiqibgpimazfivfrtxz/sql/new
-- ============================================

-- Step 1: Enable necessary extensions for UUID generation and cryptographic functions for password hashing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; 
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: Create schema 
CREATE SCHEMA IF NOT EXISTS "public";

-- Step 3: Migrations - Add Google OAuth columns if they don't exist
DO $$ 
BEGIN
    -- Add authProvider column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'authProvider'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'email';
    END IF;
    
    -- Add authProviderUserId column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'authProviderUserId'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "authProviderUserId" TEXT;
    END IF;
    
    -- Add authProviderIdentityId column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'authProviderIdentityId'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "authProviderIdentityId" TEXT;
    END IF;
END $$;

-- Users table 
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "passwordHash" TEXT NOT NULL,
    "profileImage" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'user',
    "authProvider" TEXT NOT NULL DEFAULT 'email',
    "authProviderUserId" TEXT,
    "authProviderIdentityId" TEXT,
    "lastLogin" TIMESTAMP(3),
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "pendingReceiptUrl" TEXT,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_authProvider_idx" ON "User"("authProvider");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- Courses table
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "coverImage" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "level" TEXT NOT NULL DEFAULT 'beginner',
    "duration" INTEGER,
    "videoCount" INTEGER NOT NULL DEFAULT 0,
    "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "tags" TEXT[],
    "totalModules" INTEGER NOT NULL DEFAULT 0,
    "completionRequirement" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Course_isPublished_idx" ON "Course"("isPublished");
CREATE INDEX "Course_instructorId_idx" ON "Course"("instructorId");
CREATE INDEX "Course_category_idx" ON "Course"("category");

-- Lectures table
CREATE TABLE "Lecture" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "duration" INTEGER,
    "orderIndex" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "videoSize" BIGINT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "downloadableResources" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Lecture_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lecture_courseId_idx" ON "Lecture"("courseId");
CREATE INDEX "Lecture_courseId_orderIndex_idx" ON "Lecture"("courseId", "orderIndex");

-- Enrollments table
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionDate" TIMESTAMP(3),
    "completionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "certificateIssued" BOOLEAN NOT NULL DEFAULT false,
    "certificateId" TEXT,
    "certificateIssuedDate" TIMESTAMP(3),
    "totalWatchTime" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");
CREATE INDEX "Enrollment_userId_idx" ON "Enrollment"("userId");
CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment"("courseId");
CREATE INDEX "Enrollment_status_idx" ON "Enrollment"("status");

-- User Progress table
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "watchDuration" INTEGER NOT NULL DEFAULT 0,
    "watchPercentage" DECIMAL(5,2) NOT NULL,
    "lastWatchedAt" TIMESTAMP(3),
    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProgress_enrollmentId_lectureId_key" ON "UserProgress"("enrollmentId", "lectureId");
CREATE INDEX "UserProgress_enrollmentId_idx" ON "UserProgress"("enrollmentId");
CREATE INDEX "UserProgress_lectureId_idx" ON "UserProgress"("lectureId");
CREATE INDEX "UserProgress_isCompleted_idx" ON "UserProgress"("isCompleted");

-- Payments table
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "paymentType" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transactionId" TEXT,
    "receiptScreenshotUrl" TEXT,
    "receiptScreenshotKey" TEXT,
    "payerName" TEXT,
    "payerPhone" TEXT,
    "lakiPayTransactionId" TEXT,
    "lakiPayStatus" TEXT,
    "paymentGatewayResponse" JSONB,
    "approvalNotes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_enrollmentId_key" ON "Payment"("enrollmentId");
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX "Payment_courseId_idx" ON "Payment"("courseId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_paymentType_idx" ON "Payment"("paymentType");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- Certificates table
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationCode" TEXT NOT NULL,
    "verificationUrl" TEXT,
    "certificateUrl" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");
CREATE UNIQUE INDEX "Certificate_verificationCode_key" ON "Certificate"("verificationCode");
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");
CREATE INDEX "Certificate_courseId_idx" ON "Certificate"("courseId");

-- Device Sessions table
CREATE TABLE "DeviceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceType" TEXT NOT NULL DEFAULT 'unknown',
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sessionToken" TEXT,
    CONSTRAINT "DeviceSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceSession_userId_deviceId_key" ON "DeviceSession"("userId", "deviceId");
CREATE INDEX "DeviceSession_userId_idx" ON "DeviceSession"("userId");
CREATE INDEX "DeviceSession_deviceId_idx" ON "DeviceSession"("deviceId");

-- Admin Approval Queue table
CREATE TABLE "AdminApprovalQueue" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "receiptScreenshotUrl" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AdminApprovalQueue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminApprovalQueue_paymentId_idx" ON "AdminApprovalQueue"("paymentId");
CREATE INDEX "AdminApprovalQueue_isReviewed_idx" ON "AdminApprovalQueue"("isReviewed");

-- ============================================
-- Step 4: Create Missing Indexes for Google OAuth Support
-- ============================================
CREATE INDEX IF NOT EXISTS "User_authProvider_idx" ON "User"("authProvider");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");

-- ============================================
-- Step 5: Verify Google OAuth Columns Exist
-- ============================================
-- This query shows the columns that were added:
-- SELECT 'Google OAuth Migration Complete!' as status;
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name='User' 
-- ORDER BY ordinal_position;

-- ============================================
-- Step 6: Course Reviews Table
-- ============================================
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    "comment" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Review_userId_courseId_key" ON "Review"("userId", "courseId");
CREATE INDEX IF NOT EXISTS "Review_courseId_idx" ON "Review"("courseId");
CREATE INDEX IF NOT EXISTS "Review_rating_idx" ON "Review"("rating");
CREATE INDEX IF NOT EXISTS "Review_isApproved_idx" ON "Review"("isApproved");
