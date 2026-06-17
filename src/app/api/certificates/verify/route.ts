// src/app/api/certificates/verify/route.ts
// Public Certificate Verification API

import { NextRequest } from "next/server";
import CertificateService from "@/lib/certificate";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// GET /api/certificates/verify?code=XXXX - Verify Certificate
// Public endpoint - no auth required
// ============================================

export async function GET(request: NextRequest) {
  try {
    const verificationCode = request.nextUrl.searchParams.get("code");

    if (!verificationCode) {
      return errorResponse("Verification code is required", 400);
    }

    // Normalize: trim and uppercase
    const code = verificationCode.trim().toUpperCase();

    const result = await CertificateService.verifyCertificate(code);

    if (!result.isValid) {
      return successResponse(
        {
          isValid: false,
          error: result.error,
        },
        "Certificate verification completed",
      );
    }

    return successResponse(
      {
        isValid: true,
        certificate: {
          certificateNumber: result.certificate!.certificateNumber,
          recipientName: result.certificate!.user.fullName,
          courseTitle: result.certificate!.course.title,
          courseLevel: result.certificate!.course.level,
          issuedDate: result.certificate!.issuedDate,
          verificationUrl: result.certificate!.verificationUrl,
        },
      },
      "Certificate is valid ✓",
    );
  } catch (error) {
    console.error("[VERIFY CERTIFICATE ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// POST /api/certificates/verify - Alternative verify via body
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.code) {
      return errorResponse("Verification code is required", 400);
    }

    const code = body.code.trim().toUpperCase();

    const result = await CertificateService.verifyCertificate(code);

    if (!result.isValid) {
      return successResponse(
        {
          isValid: false,
          error: result.error,
        },
        "Certificate verification completed",
      );
    }

    return successResponse(
      {
        isValid: true,
        certificate: {
          certificateNumber: result.certificate!.certificateNumber,
          recipientName: result.certificate!.user.fullName,
          courseTitle: result.certificate!.course.title,
          courseLevel: result.certificate!.course.level,
          issuedDate: result.certificate!.issuedDate,
          verificationUrl: result.certificate!.verificationUrl,
        },
      },
      "Certificate is valid ✓",
    );
  } catch (error) {
    console.error("[VERIFY CERTIFICATE POST ERROR]", error);
    return handleApiError(error);
  }
}
