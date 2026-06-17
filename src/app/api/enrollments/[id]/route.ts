// src/app/api/enrollments/[id]/route.ts
// Single Enrollment Detail API

import { NextRequest } from "next/server";
import { verifyAuth, requireAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/supabase";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// GET /api/enrollments/[id] - Enrollment Details with Progress
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            shortDescription: true,
            coverImage: true,
            price: true,
            level: true,
            category: true,
            duration: true,
            videoCount: true,
            instructor: {
              select: {
                id: true,
                fullName: true,
                profileImage: true,
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            currency: true,
            paymentType: true,
            paymentMethod: true,
            status: true,
            createdAt: true,
          },
        },
        certificate: {
          select: {
            id: true,
            certificateNumber: true,
            issuedDate: true,
            verificationUrl: true,
            isValid: true,
          },
        },
        userProgress: {
          include: {
            lecture: {
              select: {
                id: true,
                title: true,
                duration: true,
                orderIndex: true,
              },
            },
          },
          orderBy: {
            lecture: { orderIndex: "asc" },
          },
        },
      },
    });

    if (!enrollment) {
      return notFoundResponse("Enrollment");
    }

    // Only allow owner or admin to view
    if (enrollment.userId !== auth.userId && auth.role !== "admin") {
      return errorResponse("Access denied", 403);
    }

    // Calculate progress
    const totalLectures = enrollment.course.videoCount;
    const completedLectures = enrollment.userProgress.filter(
      (p) => p.isCompleted,
    ).length;

    const progressPercentage =
      totalLectures > 0
        ? Math.round((completedLectures / totalLectures) * 100)
        : 0;

    return successResponse(
      {
        ...enrollment,
        stats: {
          totalLectures,
          completedLectures,
          progressPercentage,
          totalWatchTime: enrollment.totalWatchTime,
        },
      },
      "Enrollment retrieved successfully",
    );
  } catch (error) {
    console.error("[GET ENROLLMENT ERROR]", error);
    return handleApiError(error);
  }
}
