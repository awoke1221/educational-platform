// src/app/api/auth/google/route.ts
// Google OAuth — Supabase Auth
//
// This endpoint returns the Supabase OAuth URL that the frontend
// should redirect the user to. After the user completes the Google
// sign-in flow, Supabase redirects back to the callback route
// (/api/auth/callback) where the profile is created/updated.
//
// GET  /api/auth/google  →  returns { url } for the frontend to
//                            redirect the user to Google sign-in.

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getSupabaseAnon } from "@/lib/db/supabaseAnonClient";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAnon();

    const redirectTo =
      request.nextUrl.searchParams.get("redirectTo") ||
      `${new URL(request.url).origin}/api/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("[GOOGLE OAUTH ERROR]", error);
      return NextResponse.json(
        { error: "Failed to initiate Google sign-in" },
        { status: 500 },
      );
    }

    if (!data.url) {
      return NextResponse.json(
        { error: "No OAuth URL returned" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error("[GOOGLE OAUTH ERROR]", error);
    return NextResponse.json(
      { error: "Google authentication failed" },
      { status: 500 },
    );
  }
}

// ── POST: Complete Google sign-in (called from the callback page) ─────
// The callback page has already exchanged the OAuth code via Supabase
// client. This handler upserts the User profile and UserAuth record,
// then returns the session tokens in the format the frontend expects.
//
// Body: { email, fullName, profileImage, phoneNumber, providerUserId,
//         providerIdentityId, accessToken, refreshToken, expiresIn,
//         expiresAt, authUserId }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      fullName,
      profileImage,
      phoneNumber,
      providerUserId,
      providerIdentityId,
      accessToken: rawAccessToken,
      refreshToken: rawRefreshToken,
      expiresIn,
      expiresAt,
      authUserId: directAuthUserId,
    } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date().toISOString();

    // ── Look up existing user by email ─────────────────────────────
    const { data: existingUser } = await supabaseAdmin!
      .from("User")
      .select("id, loginCount, role")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      // ── Fix ID mismatch for legacy users ────────────────────
      // If the User record was created with a random UUID instead of
      // the real Supabase Auth ID, update all references to match.
      const correctUserId = directAuthUserId || null;
      if (correctUserId && userId !== correctUserId) {
        console.log(
          `[GOOGLE OAUTH] Fixing user ID mismatch: ${userId} → ${correctUserId}`,
        );

        // Update Enrollments
        await supabaseAdmin!
          .from("Enrollment")
          .update({ userId: correctUserId })
          .eq("userId", userId);

        // Update Payments
        await supabaseAdmin!
          .from("Payment")
          .update({ userId: correctUserId })
          .eq("userId", userId);

        // Update UserProgress
        await supabaseAdmin!
          .from("UserProgress")
          .update({ userId: correctUserId })
          .eq("userId", userId);

        // Update Certificates
        await supabaseAdmin!
          .from("Certificate")
          .update({ userId: correctUserId })
          .eq("userId", userId);

        // Update Reviews
        await supabaseAdmin!
          .from("Review")
          .update({ userId: correctUserId })
          .eq("userId", userId);

        // Update DeviceSessions
        await supabaseAdmin!
          .from("DeviceSession")
          .update({ userId: correctUserId })
          .eq("userId", userId);

        // Update AdminApprovalQueue
        await supabaseAdmin!
          .from("AdminApprovalQueue")
          .update({ userId: correctUserId })
          .eq("userId", userId);

        // Update UserAuth
        await supabaseAdmin!
          .from("UserAuth")
          .update({ userId: correctUserId })
          .eq("userId", userId);

        // Update UserRegistration
        await supabaseAdmin!
          .from("UserRegistration")
          .update({ userId: correctUserId })
          .eq("userId", userId);

        // Finally, delete the old User record (child records
        // already updated above, so no cascade needed here).
        await supabaseAdmin!.from("User").delete().eq("id", userId);

        // Create a new User record with the correct ID
        const username =
          email
            .split("@")[0]
            .replace(/[^a-zA-Z0-9_-]/g, "")
            .toLowerCase()
            .slice(0, 50) || `user_${crypto.randomBytes(3).toString("hex")}`;

        await supabaseAdmin!.from("User").insert({
          id: correctUserId,
          username,
          email: email.toLowerCase(),
          fullName: fullName || email.split("@")[0],
          profileImage: profileImage || null,
          phoneNumber: phoneNumber || "",
          role: existingUser.role || "user",
          isActive: true,
          loginCount: (existingUser.loginCount || 0) + 1,
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
        });

        userId = correctUserId;
      } else {
        // No ID mismatch — standard update
        await supabaseAdmin!
          .from("User")
          .update({
            fullName: fullName || email.split("@")[0],
            profileImage: profileImage || null,
            lastLogin: now,
            loginCount: (existingUser.loginCount || 0) + 1,
            updatedAt: now,
          })
          .eq("id", userId);
      }

      // Update UserAuth record
      await supabaseAdmin!.from("UserAuth").upsert(
        {
          userId,
          authProvider: "google",
          authProviderUserId: providerUserId || null,
          authProviderIdentityId: providerIdentityId || null,
          passwordHash: "",
          updatedAt: now,
        },
        { onConflict: "userId" },
      );
    } else {
      // We need the auth user's ID from Supabase Auth to link correctly.
      // The callback page now passes the real authUserId from the session.
      // If not provided, fall back to verifying the accessToken, and if
      // that also fails, generate a placeholder.
      let authUserId: string | null = null;

      if (directAuthUserId) {
        // Use the real Supabase Auth user ID from the callback page
        authUserId = directAuthUserId;
      } else if (rawAccessToken) {
        const supabase = getSupabaseAnon();
        const { data: userData } = await supabase.auth.getUser(rawAccessToken);
        if (userData?.user) {
          authUserId = userData.user.id;
        }
      }

      if (!authUserId) {
        // Fallback: generate a placeholder ID
        authUserId = crypto.randomUUID();
      }

      userId = authUserId;

      // Create new user profile
      const username =
        email
          .split("@")[0]
          .replace(/[^a-zA-Z0-9_-]/g, "")
          .toLowerCase()
          .slice(0, 50) || `user_${crypto.randomBytes(3).toString("hex")}`;

      await supabaseAdmin!
        .from("User")
        .insert({
          id: userId,
          username,
          email: email.toLowerCase(),
          fullName: fullName || email.split("@")[0],
          profileImage: profileImage || null,
          phoneNumber: phoneNumber || "",
          role: "user",
          isActive: true,
          loginCount: 1,
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
        })
        .select("id")
        .single();

      // Create UserAuth record
      await supabaseAdmin!.from("UserAuth").insert({
        id: crypto.randomUUID(),
        userId,
        passwordHash: "",
        authProvider: "google",
        authProviderUserId: providerUserId || null,
        authProviderIdentityId: providerIdentityId || null,
        createdAt: now,
        updatedAt: now,
      });

      // Create UserRegistration record
      await supabaseAdmin!
        .from("UserRegistration")
        .insert({
          id: crypto.randomUUID(),
          userId,
          isApproved: true,
          paymentStatus: "none",
        })
        .select("id")
        .maybeSingle();
    }

    // ── Return tokens in the format the frontend expects ──────────
    const googleHeaders = new Headers();
    if (rawAccessToken) {
      googleHeaders.append(
        "Set-Cookie",
        `sb-access-token=${rawAccessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${expiresIn || 3600}`,
      );
    }
    if (rawRefreshToken) {
      googleHeaders.append(
        "Set-Cookie",
        `sb-refresh-token=${rawRefreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Google sign-in successful",
        tokens: {
          accessToken: rawAccessToken || null,
          refreshToken: rawRefreshToken || null,
          expiresIn: expiresIn || 3600,
          expiresAt: expiresAt || null,
        },
        user: {
          id: userId,
          email: email.toLowerCase(),
          fullName: fullName || email.split("@")[0],
          role: "user",
        },
      },
      {
        status: 200,
        headers: googleHeaders,
      },
    );
  } catch (error) {
    console.error("[GOOGLE OAUTH POST ERROR]", error);
    return NextResponse.json(
      { error: "Google sign-in failed" },
      { status: 500 },
    );
  }
}
