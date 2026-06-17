// src/app/api/user/profile/route.ts
// User Profile API Endpoints

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, requireAuth } from "@/lib/auth/middleware";
import { updateProfileSchema } from "@/lib/validators/schemas";
import { prisma } from "@/lib/db/supabase";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/api";
import { validateRequest } from "@/lib/utils/request";

// ============================================
// GET - Retrieve User Profile
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    // Fetch user profile
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        profileImage: true,
        role: true,
        isActive: true,
        lastLogin: true,
        loginCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return successResponse(user, "Profile retrieved successfully");
  } catch (error) {
    console.error("[GET PROFILE ERROR]", error);
    return errorResponse("Failed to retrieve profile", 500);
  }
}

// ============================================
// PUT - Update User Profile
// ============================================

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    // Validate request body
    const validation = await validateRequest<Record<string, any>>(
      request,
      updateProfileSchema,
    );

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          errors: validation.errors,
        },
        { status: 400 },
      );
    }

    const updates = validation.data;

    // Check if username is being updated and ensure it's unique
    if (updates.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: updates.username.toLowerCase(),
          NOT: { id: auth.userId },
        },
      });

      if (existingUser) {
        return errorResponse("Username already in use", 409);
      }

      updates.username = updates.username.toLowerCase();
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        ...updates,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        profileImage: true,
        role: true,
        updatedAt: true,
      },
    });

    console.log(`[AUDIT] User ${auth.userId} updated profile`);

    return successResponse(updatedUser, "Profile updated successfully");
  } catch (error) {
    console.error("[UPDATE PROFILE ERROR]", error);
    return errorResponse("Failed to update profile", 500);
  }
}
