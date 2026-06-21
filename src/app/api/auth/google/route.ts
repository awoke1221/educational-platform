// src/app/api/auth/google/route.ts
// Google social login endpoint

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { jwtService } from "@/lib/auth/jwt";
import crypto from "node:crypto";

const REQUIRED_FIELDS = ["email", "fullName"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const payload = {
      email: String(body.email || "")
        .trim()
        .toLowerCase(),
      fullName: String(body.fullName || "").trim(),
      phoneNumber: String(body.phoneNumber || "").trim(),
      profileImage: String(body.profileImage || "").trim() || null,
      providerUserId: String(body.providerUserId || "").trim() || null,
      providerIdentityId: String(body.providerIdentityId || "").trim() || null,
    };

    for (const field of REQUIRED_FIELDS) {
      if (!payload[field as keyof typeof payload]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured. Check environment variables." },
        { status: 500 },
      );
    }

    const { data: existingUser, error: findError } = await supabaseAdmin!
      .from("User")
      .select(
        "id, email, username, fullName, role, authProvider, authProviderUserId, authProviderIdentityId, isActive, isBanned, isApproved, profileImage, phoneNumber, loginCount",
      )
      .eq("email", payload.email)
      .maybeSingle();

    if (findError) {
      console.error("[GOOGLE AUTH FIND ERROR]", findError);
      return NextResponse.json(
        { error: "Database lookup failed" },
        { status: 500 },
      );
    }

    let user = existingUser;
    const now = new Date().toISOString();

    if (!user) {
      const usernameBase = payload.email
        .split("@")[0]
        .replace(/[^a-zA-Z0-9_-]/g, "");
      const usernameCandidate = usernameBase || `user${Date.now()}`;
      const username = `${usernameCandidate}_${crypto.randomBytes(3).toString("hex")}`;

      const { data: newUser, error: insertError } = await supabaseAdmin!
        .from("User")
        .insert({
          id: crypto.randomUUID(),
          username: username.toLowerCase(),
          email: payload.email,
          fullName: payload.fullName,
          phoneNumber: payload.phoneNumber || null,
          profileImage: payload.profileImage || null,
          authProvider: "google",
          authProviderUserId: payload.providerUserId || null,
          authProviderIdentityId: payload.providerIdentityId || null,
          passwordHash: "",
          role: "user",
          isActive: true,
          isApproved: true,
          loginCount: 1,
          lastLogin: now,
          updatedAt: now,
          createdAt: now,
        })
        .select(
          "id, email, username, fullName, role, authProvider, authProviderUserId, authProviderIdentityId, profileImage, phoneNumber, loginCount, isActive, isBanned, isApproved",
        )
        .single();

      if (insertError) {
        console.error("[GOOGLE AUTH INSERT ERROR]", insertError);
        return NextResponse.json(
          { error: "Failed to create user account" },
          { status: 500 },
        );
      }

      user = newUser;
    } else {
      if (!user.isActive || user.isBanned) {
        return NextResponse.json(
          { error: "Account is inactive or banned" },
          { status: 403 },
        );
      }

      if (!user.isApproved) {
        await supabaseAdmin!
          .from("User")
          .update({ isApproved: true, isActive: true, updatedAt: now })
          .eq("id", user.id);
      }

      await supabaseAdmin!
        .from("User")
        .update({
          fullName: payload.fullName,
          phoneNumber: payload.phoneNumber || null,
          profileImage: payload.profileImage || user.profileImage || null,
          authProvider: "google",
          authProviderUserId:
            payload.providerUserId || user.authProviderUserId || null,
          authProviderIdentityId:
            payload.providerIdentityId || user.authProviderIdentityId || null,
          updatedAt: now,
          lastLogin: now,
          loginCount: (user.loginCount || 0) + 1,
        })
        .eq("id", user.id);
    }

    const tokenPair = jwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          authProvider: user.authProvider,
          profileImage: user.profileImage,
          phoneNumber: user.phoneNumber,
        },
        tokens: tokenPair,
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": `refreshToken=${tokenPair.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`,
        },
      },
    );
  } catch (error) {
    console.error("[GOOGLE AUTH ERROR]", error);
    return NextResponse.json(
      { error: "Google authentication failed" },
      { status: 500 },
    );
  }
}
