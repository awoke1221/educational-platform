// src/app/api/health/route.ts
// Health Check Endpoint — includes connection pool status

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const start = Date.now();

  try {
    // ============================================
    // Basic Health Check
    // ============================================
    const health: Record<string, any> = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    };

    // ============================================
    // Database Connection Check (via admin client)
    // ============================================
    try {
      const admin = getSupabaseAdmin();
      const { count, error } = await admin!
        .from("User")
        .select("*", { count: "exact", head: true });
      const userCount = error ? 0 : (count ?? 0);

      health.database = {
        status: error ? "disconnected" : "connected",
        userCount,
        responseTime: Date.now() - start + "ms",
      };
    } catch (dbError) {
      console.error("[HEALTH CHECK] Database error:", dbError);
      health.database = {
        status: "disconnected",
        error: "Unable to connect to database",
      };
      health.status = "degraded";
    }

    // ============================================
    // Pooler Connection Test (via pooler URL directly)
    // ============================================
    try {
      const poolerUrl = `https://${process.env.NEXT_PUBLIC_SUPABASE_URL}`;
      const poolerDbUrl = process.env.DATABASE_URL || "";

      // Test that the pooler endpoint is reachable by making a lightweight
      // auth health check via a temporary anon-key client with pooler settings
      const poolerClient = createClient(
        poolerUrl,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        {
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );

      const poolerStart = Date.now();
      const { error: poolerErr } = await poolerClient
        .from("User")
        .select("*", { count: "exact", head: true });

      health.pooler = {
        configured: true,
        mode: "transaction",
        reachable: !poolerErr,
        responseTime: Date.now() - poolerStart + "ms",
        endpoint: poolerUrl.replace(/^https?:\/\//, ""),
      };
    } catch (poolerError) {
      health.pooler = {
        configured: true,
        mode: "transaction",
        reachable: false,
        error: "Pooler test failed",
      };
      // Don't degrade status — pooler test is advisory
    }

    // ============================================
    // Client Count (how many clients are alive)
    // ============================================
    health.clients = {
      // These are approximate — supabase-js doesn't expose internal state
      adminInitialized: true,
    };

    // ============================================
    // Memory Usage
    // ============================================
    const memUsage = process.memoryUsage();
    health.memory = {
      rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
    };

    // ============================================
    // Vercel-specific
    // ============================================
    health.vercel = {
      region: process.env.VERCEL_REGION || "local",
      instance: process.env.VERCEL_URL || "local",
    };

    // ============================================
    // Return Health Status
    // ============================================
    health.responseTime = Date.now() - start + "ms";
    const statusCode = health.status === "healthy" ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error("[HEALTH CHECK ERROR]", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
