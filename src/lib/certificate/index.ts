// src/lib/certificate/index.ts
// Certificate Generation & Verification Service

import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/db/supabase";

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
  static generateCertificateNumber(): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `CERT-${dateStr}-${random}`;
  }

  static generateVerificationCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "V-";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static generateVerificationUrl(verificationCode: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/verify/${verificationCode}`;
  }

  static async issueCertificate(
    params: IssueCertificateParams,
  ): Promise<CertificateData> {
    const { enrollmentId, userId, courseId } = params;

    const { data: existing } = await supabaseAdmin!
      .from("Certificate")
      .select("*")
      .eq("enrollmentId", enrollmentId)
      .maybeSingle();

    if (existing) {
      return await this.getCertificateData(existing.id);
    }

    let certificateNumber = this.generateCertificateNumber();
    let verificationCode = this.generateVerificationCode();

    let retries = 0;
    while (retries < 3) {
      const { data: existingNumber } = await supabaseAdmin!
        .from("Certificate")
        .select("id")
        .eq("certificateNumber", certificateNumber)
        .maybeSingle();
      const { data: existingCode } = await supabaseAdmin!
        .from("Certificate")
        .select("id")
        .eq("verificationCode", verificationCode)
        .maybeSingle();

      if (!existingNumber && !existingCode) break;

      certificateNumber = this.generateCertificateNumber();
      verificationCode = this.generateVerificationCode();
      retries++;
    }

    const { data: certificate, error: createErr } = await supabaseAdmin!
      .from("Certificate")
      .insert({
        enrollmentId,
        userId,
        courseId,
        certificateNumber,
        verificationCode,
        verificationUrl: this.generateVerificationUrl(verificationCode),
        issuedDate: new Date().toISOString(),
        isValid: true,
      })
      .select()
      .single();
    if (createErr) throw new Error("Failed to create certificate");

    await supabaseAdmin!
      .from("Enrollment")
      .update({
        certificateIssued: true,
        certificateIssuedDate: new Date().toISOString(),
      })
      .eq("id", enrollmentId);

    console.log(
      `[CERTIFICATE] Issued: ${certificateNumber} for user ${userId}, course ${courseId}`,
    );

    return await this.getCertificateData(certificate.id);
  }

  static async getCertificateData(
    certificateId: string,
  ): Promise<CertificateData> {
    const { data: cert, error } = await supabaseAdmin!
      .from("Certificate")
      .select("*, user:User(fullName), course:Course(title, level, duration)")
      .eq("id", certificateId)
      .single();
    if (error || !cert) throw new Error("Certificate not found");

    const user = Array.isArray(cert.user) ? cert.user[0] : cert.user;
    const course = Array.isArray(cert.course) ? cert.course[0] : cert.course;

    return {
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      verificationCode: cert.verificationCode,
      verificationUrl: cert.verificationUrl || "",
      issuedDate: cert.issuedDate,
      isValid: cert.isValid,
      user: { fullName: user?.fullName || "" },
      course: {
        title: course?.title || "",
        level: course?.level || "",
        duration: course?.duration || 0,
      },
    };
  }

  static async verifyCertificate(verificationCode: string): Promise<{
    isValid: boolean;
    certificate?: CertificateData;
    error?: string;
  }> {
    const { data: certificate, error } = await supabaseAdmin!
      .from("Certificate")
      .select("*, user:User(fullName), course:Course(title, level, duration)")
      .eq("verificationCode", verificationCode)
      .maybeSingle();

    if (error || !certificate) {
      return { isValid: false, error: "Certificate not found." };
    }
    if (!certificate.isValid) {
      return { isValid: false, error: "This certificate has been revoked." };
    }

    const user = Array.isArray(certificate.user)
      ? certificate.user[0]
      : certificate.user;
    const course = Array.isArray(certificate.course)
      ? certificate.course[0]
      : certificate.course;

    return {
      isValid: true,
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        verificationCode: certificate.verificationCode,
        verificationUrl: certificate.verificationUrl || "",
        issuedDate: certificate.issuedDate,
        isValid: certificate.isValid,
        user: { fullName: user?.fullName || "" },
        course: {
          title: course?.title || "",
          level: course?.level || "",
          duration: course?.duration || 0,
        },
      },
    };
  }

  static async autoIssueOnCompletion(
    enrollmentId: string,
    userId: string,
    courseId: string,
  ): Promise<CertificateData | null> {
    try {
      const { data: enrollment } = await supabaseAdmin!
        .from("Enrollment")
        .select("*")
        .eq("id", enrollmentId)
        .maybeSingle();

      if (!enrollment || enrollment.status !== "completed") return null;

      if (enrollment.certificateIssued) {
        const { data: existing } = await supabaseAdmin!
          .from("Certificate")
          .select("*")
          .eq("enrollmentId", enrollmentId)
          .maybeSingle();
        if (existing) return await this.getCertificateData(existing.id);
      }

      return await this.issueCertificate({ enrollmentId, userId, courseId });
    } catch (error) {
      console.error("[CERTIFICATE] Auto-issue failed:", error);
      return null;
    }
  }

  static async getUserCertificates(userId: string, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: certificates,
      count,
      error,
    } = await supabaseAdmin!
      .from("Certificate")
      .select("*, course:Course(id, title, level, coverImage)", {
        count: "exact",
      })
      .eq("userId", userId)
      .order("issuedDate", { ascending: false })
      .range(from, to);

    if (error) throw new Error("Failed to fetch certificates");

    return {
      certificates: certificates || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    };
  }

  static async getCourseCertificate(
    userId: string,
    courseId: string,
  ): Promise<CertificateData | null> {
    const { data: enrollment } = await supabaseAdmin!
      .from("Enrollment")
      .select("id")
      .eq("userId", userId)
      .eq("courseId", courseId)
      .maybeSingle();

    if (!enrollment) return null;

    const { data: certificate } = await supabaseAdmin!
      .from("Certificate")
      .select("*")
      .eq("enrollmentId", enrollment.id)
      .maybeSingle();

    if (!certificate) return null;
    return await this.getCertificateData(certificate.id);
  }

  static async revokeCertificate(
    certificateId: string,
    reason?: string,
  ): Promise<boolean> {
    try {
      await supabaseAdmin!
        .from("Certificate")
        .update({ isValid: false })
        .eq("id", certificateId);

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
