// src/lib/utils/api.ts
// API Error Handler and Response Utilities

import { NextResponse } from "next/server";
import { ZodError } from "zod";

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

// ============================================
// Success Response Handler
// ============================================

export function successResponse<T>(
  data: T,
  message: string = "Success",
  status: number = 200,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      statusCode: status,
    },
    { status },
  );
}

// ============================================
// Error Response Handler
// ============================================

export function errorResponse(
  error: string | Error,
  status: number = 500,
  errors?: Record<string, string[]>,
): NextResponse<ApiResponse> {
  const message = error instanceof Error ? error.message : error;

  return NextResponse.json(
    {
      success: false,
      error: message,
      errors,
      statusCode: status,
    },
    { status },
  );
}

// ============================================
// Validation Error Handler
// ============================================

export function validationErrorResponse(
  zodError: ZodError,
): NextResponse<ApiResponse> {
  const errors = zodError.flatten().fieldErrors;

  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      errors: errors as Record<string, string[]>,
      statusCode: 400,
    },
    { status: 400 },
  );
}

// ============================================
// 404 Not Found Response
// ============================================

export function notFoundResponse(
  resource: string = "Resource",
): NextResponse<ApiResponse> {
  return errorResponse(`${resource} not found`, 404);
}

// ============================================
// 409 Conflict Response
// ============================================

export function conflictResponse(
  message: string = "Resource already exists",
): NextResponse<ApiResponse> {
  return errorResponse(message, 409);
}

// ============================================
// 403 Forbidden Response
// ============================================

export function forbiddenResponse(
  message: string = "Access denied",
): NextResponse<ApiResponse> {
  return errorResponse(message, 403);
}

// ============================================
// 401 Unauthorized Response
// ============================================

export function unauthorizedResponse(
  message: string = "Authentication required",
): NextResponse<ApiResponse> {
  return errorResponse(message, 401);
}

// ============================================
// Generic Error Catch Handler
// ============================================

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error("[API ERROR]", error);

  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes("Unique constraint failed")) {
      return conflictResponse("This resource already exists");
    }

    if (error.message.includes("Record to update not found")) {
      return notFoundResponse();
    }

    return errorResponse(error.message, 500);
  }

  return errorResponse("An unexpected error occurred", 500);
}

// ============================================
// Paginated Response Handler
// ============================================

export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasMore: boolean;
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message: string = "Success",
): NextResponse<ApiResponse<PaginatedData<T>>> {
  const pages = Math.ceil(total / limit);
  const hasMore = page < pages;

  return successResponse(
    {
      data,
      total,
      page,
      limit,
      pages,
      hasMore,
    },
    message,
    200,
  );
}
