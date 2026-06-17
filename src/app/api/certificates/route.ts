// src/app/api/certificates/route.ts
// Certificate API Endpoints

import { NextRequest } from "next/server";
import { verifyAuth, requireAuth, requireRole } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/supabase";
import CertificateService from "@/lib/certificate";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
} from "@/lib/utils/api";
import { parsePagination } from "@/lib/utils/request";

// ============================================
// GET /api/certificates - User's Certificates
// ============================================

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const { page, limit } = parsePagination(request);

    const result = await CertificateService.getUserCertificates(
      auth.userId,
      page,
      limit,
    );

    return paginatedResponse(
      result.certificates,
      result.total,
      result.page,
      result.limit,
      "Certificates retrieved successfully",
    );
  } catch (error) {
    console.error("[LIST CERTIFICATES ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// POST /api/certificates - Issue Certificate
// ============================================

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const { courseId } = body;

    if (!courseId) {
      return errorResponse("Course ID is required", 400);
    }

    // Find enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: auth.userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      return errorResponse("You are not enrolled in this course", 404);
    }

    // Check if course is completed
    if (enrollment.status !== "completed") {
      return errorResponse(
        "Course is not yet completed. Complete all lectures to earn your certificate.",
        400,
      );
    }

    // Issue certificate
    const certificate = await CertificateService.issueCertificate({
      enrollmentId: enrollment.id,
      userId: auth.userId,
      courseId,
    });

    console.log(
      `[AUDIT] Certificate issued: ${certificate.certificateNumber} for user ${auth.userId}`,
    );

    return successResponse(
      certificate,
      "Certificate issued successfully!",
      201,
    );
  } catch (error) {
    console.error("[ISSUE CERTIFICATE ERROR]", error);
    return handleApiError(error);
  }
}
