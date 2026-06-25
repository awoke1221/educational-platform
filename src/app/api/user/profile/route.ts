// src/app/api/user/profile/route.ts
// User Profile API Endpoints

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, requireAuth } from "@/lib/auth/middleware";
import { updateProfileSchema } from "@/lib/validators/schemas";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
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
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    // Try by id first (fast path), then fall back to email for legacy
    // users whose User.id doesn't match their Supabase Auth ID.
    let { data: user, error } = await supabaseAdmin!
      .from("User")
      .select(
        `id, username, email, fullName, phoneNumber, profileImage, role, isActive, lastLogin, loginCount, createdAt,
         UserRegistration (
           pendingReceiptUrl, paymentMethod, paymentStatus
         )`,
      )
      .eq("id", auth.userId)
      .maybeSingle();

    if (!user && !error && auth.email) {
      // Fallback: look up by email for legacy records with mismatched IDs
      const result = await supabaseAdmin!
        .from("User")
        .select(
          `id, username, email, fullName, phoneNumber, profileImage, role, isActive, lastLogin, loginCount, createdAt,
           UserRegistration (
             pendingReceiptUrl, paymentMethod, paymentStatus
           )`,
        )
        .eq("email", auth.email.toLowerCase())
        .maybeSingle();
      user = result.data;
      error = result.error;
    }

    if (error || !user) {
      return errorResponse("User not found", 404);
    }

    // Flatten the nested UserRegistration data into the response
    const { UserRegistration: reg, ...profile } = user as any;
    const flattened = {
      ...profile,
      pendingReceiptUrl: reg?.pendingReceiptUrl ?? null,
      paymentMethod: reg?.paymentMethod ?? null,
      paymentStatus: reg?.paymentStatus ?? "none",
    };

    return successResponse(flattened, "Profile retrieved successfully");
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
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

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

    if (updates.username) {
      const { data: existingUser } = await supabaseAdmin!
        .from("User")
        .select("id")
        .eq("username", updates.username.toLowerCase())
        .neq("id", auth.userId)
        .maybeSingle();

      if (existingUser) {
        return errorResponse("Username already in use", 409);
      }

      updates.username = updates.username.toLowerCase();
    }

    const { data: updatedUser, error: updateErr } = await supabaseAdmin!
      .from("User")
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", auth.userId)
      .select(
        "id, username, email, fullName, phoneNumber, profileImage, role, updatedAt",
      )
      .single();

    if (updateErr) throw updateErr;

    console.log(`[AUDIT] User ${auth.userId} updated profile`);

    return successResponse(updatedUser, "Profile updated successfully");
  } catch (error) {
    console.error("[UPDATE PROFILE ERROR]", error);
    return errorResponse("Failed to update profile", 500);
  }
}
