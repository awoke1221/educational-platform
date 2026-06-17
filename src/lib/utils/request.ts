// src/lib/utils/request.ts
// Request Parsing and Validation Utilities

import { NextRequest } from "next/server";
import { ZodSchema } from "zod";

// ============================================
// Safe JSON Parser
// ============================================

export async function parseRequestJson(
  request: NextRequest,
): Promise<Record<string, any> | null> {
  try {
    return await request.json();
  } catch (error) {
    console.error("Failed to parse request JSON:", error);
    return null;
  }
}

// ============================================
// Validate Request with Zod Schema
// ============================================

export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema,
): Promise<
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> }
> {
  const body = await parseRequestJson(request);

  if (!body) {
    return {
      success: false,
      errors: { body: ["Invalid JSON body"] },
    };
  }

  const validation = schema.safeParse(body);

  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  return {
    success: true,
    data: validation.data as T,
  };
}

// ============================================
// Get Query Parameters
// ============================================

export function getQueryParams(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = request.nextUrl.searchParams;

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

// ============================================
// Get Single Query Parameter with Default
// ============================================

export function getQueryParam(
  request: NextRequest,
  key: string,
  defaultValue?: string,
): string | undefined {
  return request.nextUrl.searchParams.get(key) || defaultValue;
}

// ============================================
// Parse Pagination Parameters
// ============================================

export function parsePagination(request: NextRequest): {
  page: number;
  limit: number;
} {
  const page = Math.max(
    1,
    parseInt(getQueryParam(request, "page", "1") || "1"),
  );
  const limit = Math.min(
    100,
    Math.max(1, parseInt(getQueryParam(request, "limit", "10") || "10")),
  );

  return { page, limit };
}

// ============================================
// Get Bearer Token from Request
// ============================================

export function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7);
}

// ============================================
// Get All Headers as Object
// ============================================

export function getRequestHeaders(
  request: NextRequest,
): Record<string, string> {
  const headers: Record<string, string> = {};

  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return headers;
}

// ============================================
// Get Client IP Address
// ============================================

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("X-Forwarded-For")?.split(",")[0] ||
    request.headers.get("X-Client-IP") ||
    request.headers.get("CF-Connecting-IP") ||
    "Unknown"
  );
}

// ============================================
// Get User Agent
// ============================================

export function getUserAgent(request: NextRequest): string {
  return request.headers.get("User-Agent") || "Unknown";
}

// ============================================
// Get Request Method
// ============================================

export function getMethod(request: NextRequest): string {
  return request.method.toUpperCase();
}

// ============================================
// Get Request Path
// ============================================

export function getPath(request: NextRequest): string {
  return request.nextUrl.pathname;
}

// ============================================
// Is JSON Content Type
// ============================================

export function isJsonContentType(request: NextRequest): boolean {
  const contentType = request.headers.get("Content-Type") || "";
  return contentType.includes("application/json");
}
