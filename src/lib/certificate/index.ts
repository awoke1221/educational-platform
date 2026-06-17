// src/lib/certificate/index.ts
// Certificate Generation & Verification Service

import crypto from "node:crypto";
import { prisma } from "@/lib/db/supabase";

// ============================================
// Certificate Types
// ============================================

export interface CertificateData {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  verificationUrl: string;
  issuedDate: Date;
  expiresAt?: Date;
  isValid: boolean;
  user: {
    fullName: string;
  };
  course: {
    title: string;
    level: string;
    duration: number;
  };
}

export interface IssueCertificateParams {
  enrollmentId: string;
  userId: string;
  courseId: string;
}

// ============================================
// Certificate Service
// ============================================

export class CertificateService {
  /**
   * Generate a unique certificate number
   * Format: CERT-YYYYMMDD-XXXXXXXX (date + 8 random hex chars)
   */
  static generateCertificateNumber(): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `CERT-${dateStr}-${random}`;
  }

  /**
   * Generate a verification code
   * Format: V-XXXXXXXX (8 alphanumeric chars)
   */
  static generateVerificationCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I,O,0,1 to avoid confusion
    let code = "V-";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Generate verification URL
   */
  static generateVerificationUrl(verificationCode: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/verify/${verificationCode}`;
  }

  /**
   * Generate a certificate for a completed course
   */
  static async issueCertificate(
    params: IssueCertificateParams,
  ): Promise<CertificateData> {
    const { enrollmentId, userId, courseId } = params;

    // Check if certificate already exists
    const existing = await prisma.certificate.findUnique({
      where: { enrollmentId },
    });

    if (existing) {
      // Return existing certificate
      return await this.getCertificateData(existing.id);
    }

    // Generate unique identifiers
    let certificateNumber = this.generateCertificateNumber();
    let verificationCode = this.generateVerificationCode();

    // Ensure uniqueness (retry on collision)
    let retries = 0;
    while (retries < 3) {
      const existingNumber = await prisma.certificate.findUnique({
        where: { certificateNumber },
      });
      const existingCode = await prisma.certificate.findUnique({
        where: { verificationCode },
      });

      if (!existingNumber && !existingCode) break;

      certificateNumber = this.generateCertificateNumber();
      verificationCode = this.generateVerificationCode();
      retries++;
    }

    // Create certificate
    const certificate = await prisma.certificate.create({
      data: {
        enrollmentId,
        userId,
        courseId,
        certificateNumber,
        verificationCode,
        verificationUrl: this.generateVerificationUrl(verificationCode),
        issuedDate: new Date(),
        isValid: true,
      },
    });

    // Update enrollment
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        certificateIssued: true,
        certificateIssuedDate: new Date(),
      },
    });

    console.log(
      `[CERTIFICATE] Issued: ${certificateNumber} for user ${userId}, course ${courseId}`,
    );

    return await this.getCertificateData(certificate.id);
  }

  /**
   * Get full certificate data with user and course info
   */
  static async getCertificateData(
    certificateId: string,
  ): Promise<CertificateData> {
    const cert = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        user: { select: { fullName: true } },
        course: { select: { title: true, level: true, duration: true } },
      },
    });

    if (!cert) {
      throw new Error("Certificate not found");
    }

    return {
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      verificationCode: cert.verificationCode,
      verificationUrl: cert.verificationUrl || "",
      issuedDate: cert.issuedDate,
      isValid: cert.isValid,
      user: { fullName: cert.user.fullName },
      course: {
        title: cert.course.title,
        level: cert.course.level,
        duration: cert.course.duration || 0,
      },
    };
  }

  /**
   * Verify a certificate by verification code
   */
  static async verifyCertificate(verificationCode: string): Promise<{
    isValid: boolean;
    certificate?: CertificateData;
    error?: string;
  }> {
    const certificate = await prisma.certificate.findUnique({
      where: { verificationCode },
      include: {
        user: { select: { fullName: true } },
        course: { select: { title: true, level: true, duration: true } },
      },
    });

    if (!certificate) {
      return {
        isValid: false,
        error: "Certificate not found. Please check the verification code.",
      };
    }

    if (!certificate.isValid) {
      return {
        isValid: false,
        error: "This certificate has been revoked or is no longer valid.",
      };
    }

    return {
      isValid: true,
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        verificationCode: certificate.verificationCode,
        verificationUrl: certificate.verificationUrl || "",
        issuedDate: certificate.issuedDate,
        isValid: certificate.isValid,
        user: { fullName: certificate.user.fullName },
        course: {
          title: certificate.course.title,
          level: certificate.course.level,
          duration: certificate.course.duration || 0,
        },
      },
    };
  }

  /**
   * Auto-issue certificate when course is completed
   * Called from progress tracking when 100% completion detected
   */
  static async autoIssueOnCompletion(
    enrollmentId: string,
    userId: string,
    courseId: string,
  ): Promise<CertificateData | null> {
    try {
      // Verify course is actually completed
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
      });

      if (!enrollment || enrollment.status !== "completed") {
        return null;
      }

      if (enrollment.certificateIssued) {
        // Certificate already issued, return existing
        const existing = await prisma.certificate.findUnique({
          where: { enrollmentId },
        });
        if (existing) {
          return await this.getCertificateData(existing.id);
        }
      }

      // Issue new certificate
      return await this.issueCertificate({ enrollmentId, userId, courseId });
    } catch (error) {
      console.error("[CERTIFICATE] Auto-issue failed:", error);
      return null;
    }
  }

  /**
   * Get user's certificates
   */
  static async getUserCertificates(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { issuedDate: "desc" },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              level: true,
              coverImage: true,
            },
          },
        },
      }),
      prisma.certificate.count({ where: { userId } }),
    ]);

    return {
      certificates,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get certificate for a specific course enrollment
   */
  static async getCourseCertificate(
    userId: string,
    courseId: string,
  ): Promise<CertificateData | null> {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: { id: true },
    });

    if (!enrollment) return null;

    const certificate = await prisma.certificate.findUnique({
      where: { enrollmentId: enrollment.id },
    });

    if (!certificate) return null;

    return await this.getCertificateData(certificate.id);
  }

  /**
   * Revoke a certificate (admin function)
   */
  static async revokeCertificate(
    certificateId: string,
    reason?: string,
  ): Promise<boolean> {
    try {
      await prisma.certificate.update({
        where: { id: certificateId },
        data: { isValid: false },
      });

      console.log(
        `[CERTIFICATE] Revoked: ${certificateId}${reason ? ` - ${reason}` : ""}`,
      );

      return true;
    } catch (error) {
      console.error("[CERTIFICATE] Revoke failed:", error);
      return false;
    }
  }
}

export default CertificateService;
