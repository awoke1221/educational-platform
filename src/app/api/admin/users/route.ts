// src/app/api/admin/users/route.ts
// Admin User Management API — Supabase REST API

import { NextRequest } from "next/server";
import { verifyAuth, requireRole } from "@/lib/auth/middleware";
import { supabaseAdmin } from "@/lib/db/supabase";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
} from "@/lib/utils/api";
import { parsePagination } from "@/lib/utils/request";

// ============================================
// GET /api/admin/users - List All Users
// ============================================

export async function GET(request: NextRequest) {
  try {
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;
    if (!supabaseAdmin) return errorResponse("Database not configured", 500);

    const { page, limit } = parsePagination(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    let query = supabaseAdmin
      .from("User")
      .select("*", { count: "exact" })
      .order("createdAt", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(
        `fullName.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`,
      );
    }
    if (role && ["user", "instructor", "admin"].includes(role)) {
      query = query.eq("role", role);
    }
    if (status === "active") {
      query = query.eq("isActive", true).eq("isBanned", false);
    } else if (status === "banned") {
      query = query.eq("isBanned", true);
    } else if (status === "inactive") {
      query = query.eq("isActive", false).eq("isBanned", false);
    }

    const { data: users, error, count } = await query;

    if (error) {
      console.error("[ADMIN USERS ERROR]", error);
      return handleApiError(error);
    }

    return paginatedResponse(
      users || [],
      count || 0,
      page,
      limit,
      "Users retrieved",
    );
  } catch (error) {
    console.error("[ADMIN USERS ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// PATCH /api/admin/users - Manage User (ban, activate, changeRole)
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;
    if (!supabaseAdmin) return errorResponse("Database not configured", 500);

    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    if (!body) return errorResponse("Invalid JSON body", 400);

    const { userId, action, value, reason } = body;
    if (!userId || !action)
      return errorResponse("User ID and action are required", 400);

    if (userId === auth.userId && ["ban", "deactivate"].includes(action)) {
      return errorResponse("Cannot perform this action on yourself", 403);
    }

    let updateData: Record<string, any> = {};
    let responseMessage = "";

    switch (action) {
      case "ban":
        updateData = { isBanned: true, isActive: false };
        responseMessage = "User has been banned";
        break;
      case "unban":
        updateData = { isBanned: false, isActive: true };
        responseMessage = "User has been unbanned";
        break;
      case "activate":
        updateData = { isActive: true, isBanned: false };
        responseMessage = "User has been activated";
        break;
      case "deactivate":
        updateData = { isActive: false };
        responseMessage = "User has been deactivated";
        break;
      case "changeRole":
        if (!value || !["user", "instructor", "admin"].includes(value)) {
          return errorResponse(
            "Invalid role. Must be: user, instructor, or admin",
            400,
          );
        }
        updateData = { role: value };
        responseMessage = `User role changed to ${value}`;
        break;
      default:
        return errorResponse("Invalid action", 400);
    }

    const { error: updateError } = await supabaseAdmin
      .from("User")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      console.error("[ADMIN USER UPDATE ERROR]", updateError);
      return errorResponse("Failed to update user", 500);
    }

    console.log(
      `[ADMIN] User ${userId}: ${action} by ${auth.userId}${reason ? ` (${reason})` : ""}`,
    );
    return successResponse({ id: userId, ...updateData }, responseMessage);
  } catch (error) {
    console.error("[ADMIN USERS PATCH ERROR]", error);
    return handleApiError(error);
  }
}
