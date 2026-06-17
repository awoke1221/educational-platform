// src/app/api/certificates/[courseId]/route.ts
// Course Certificate API

import { NextRequest } from "next/server";
import { verifyAuth, requireAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/supabase";
import CertificateService from "@/lib/certificate";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// GET /api/certificates/[courseId] - Get Certificate for Course
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const { courseId } = await params;

    const certificate = await CertificateService.getCourseCertificate(
      auth.userId,
      courseId,
    );

    if (!certificate) {
      // Check if user is enrolled but course not yet completed
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: auth.userId,
            courseId,
          },
        },
        select: {
          status: true,
          completionPercentage: true,
        },
      });

      if (!enrollment) {
        return errorResponse("You are not enrolled in this course", 404);
      }

      return successResponse(
        {
          certificate: null,
          enrollment: {
            status: enrollment.status,
            progress: enrollment.completionPercentage,
          },
          message:
            enrollment.status === "completed"
              ? "Certificate not yet issued. Click issue to generate."
              : "Complete the course to earn your certificate.",
        },
        "No certificate found for this course",
      );
    }

    return successResponse(certificate, "Certificate retrieved successfully");
  } catch (error) {
    console.error("[GET COURSE CERTIFICATE ERROR]", error);
    return handleApiError(error);
  }
}
