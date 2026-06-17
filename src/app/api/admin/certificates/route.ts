// src/app/api/admin/certificates/route.ts
// Admin Certificate Management API

import { NextRequest } from "next/server";
import { verifyAuth, requireRole } from "@/lib/auth/middleware";
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
// GET /api/admin/certificates - List All Certificates
// ============================================

export async function GET(request: NextRequest) {
  try {
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;

    const { page, limit } = parsePagination(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // valid, revoked

    const where: Record<string, any> = {};

    if (status === "valid") {
      where.isValid = true;
    } else if (status === "revoked") {
      where.isValid = false;
    }

    if (search) {
      where.OR = [
        { certificateNumber: { contains: search, mode: "insensitive" } },
        { verificationCode: { contains: search, mode: "insensitive" } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { course: { title: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { issuedDate: "desc" },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              level: true,
            },
          },
        },
      }),
      prisma.certificate.count({ where }),
    ]);

    return paginatedResponse(
      certificates,
      total,
      page,
      limit,
      "Certificates retrieved successfully",
    );
  } catch (error) {
    console.error("[ADMIN CERTIFICATES ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// PATCH /api/admin/certificates - Revoke Certificate
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const { certificateId, action, reason } = body;

    if (!certificateId || !action) {
      return errorResponse("Certificate ID and action are required", 400);
    }

    if (action === "revoke") {
      const success = await CertificateService.revokeCertificate(
        certificateId,
        reason,
      );

      if (!success) {
        return errorResponse("Failed to revoke certificate", 500);
      }

      console.log(
        `[ADMIN] Certificate revoked: ${certificateId} by ${auth.userId}`,
      );

      return successResponse(null, "Certificate revoked successfully");
    }

    return errorResponse("Invalid action. Use: revoke", 400);
  } catch (error) {
    console.error("[ADMIN CERTIFICATE ACTION ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// DELETE /api/admin/certificates - Delete Certificate
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;

    const body = await request.json().catch(() => null);
    if (!body?.certificateId) {
      return errorResponse("Certificate ID is required", 400);
    }

    // Soft-delete: mark as invalid
    await CertificateService.revokeCertificate(
      body.certificateId,
      "Deleted by admin",
    );

    return successResponse(null, "Certificate has been revoked");
  } catch (error) {
    console.error("[DELETE CERTIFICATE ERROR]", error);
    return handleApiError(error);
  }
}
