// src/app/api/auth/refresh/route.ts
// Refresh Token — Supabase Auth
//
// Exchanges a Supabase refresh token for a new access token via
// supabase.auth.refreshSession().

import { NextRequest, NextResponse } from "next/server";
import { refreshTokenSchema } from "@/lib/validators/schemas";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getSupabaseAnon } from "@/lib/db/supabaseAnonClient";
import { env } from "@/config/env";

export async function POST(request: NextRequest) {
  try {
    // ============================================
    // STEP 1: Get Refresh Token from Cookie or Body
    // ============================================
    let refreshToken =
      request.cookies.get("sb-refresh-token")?.value ||
      request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      const body = await request.json().catch(() => ({}));
      const validation = refreshTokenSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid refresh token" },
          { status: 401 },
        );
      }

      refreshToken = validation.data.refreshToken;
    }

    // ============================================
    // STEP 2: Exchange via Supabase Auth
    // ============================================
    const supabase = getSupabaseAnon();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      console.warn("[SECURITY] Invalid Supabase refresh token attempt");
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 },
      );
    }

    // ============================================
    // STEP 3: Verify User Still Exists and Active
    // ============================================
    const supabaseAdmin = getSupabaseAdmin();
    const { data: user } = await supabaseAdmin!
      .from("User")
      .select("id, email, role, isActive, isBanned")
      .eq("id", data.user.id)
      .single();

    if (!user || !user.isActive || user.isBanned) {
      return NextResponse.json(
        { error: "User account is no longer valid" },
        { status: 403 },
      );
    }

    // ============================================
    // STEP 4: Return New Session
    // ============================================
    const session = data.session;

    return NextResponse.json(
      {
        success: true,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in,
        expiresAt: session.expires_at,
      },
      {
        status: 200,
        headers: [
          [
            "Set-Cookie",
            `sb-access-token=${session.access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${session.expires_in}`,
          ],
          [
            "Set-Cookie",
            `sb-refresh-token=${session.refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${env.jwt.refreshTokenExpiry}`,
          ],
        ],
      },
    );
  } catch (error) {
    console.error("[REFRESH TOKEN ERROR]", error);

    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 },
    );
  }
}
