// src/app/api/health/route.ts
// Health Check Endpoint

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/supabase";

export async function GET(request: NextRequest) {
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
    // Database Connection Check
    // ============================================
    try {
      // Try a simple database query
      const userCount = await prisma.user.count();

      health.database = {
        status: "connected",
        userCount,
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
    // Memory Usage
    // ============================================
    const memUsage = process.memoryUsage();
    health.memory = {
      rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
    };

    // ============================================
    // Return Health Status
    // ============================================
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
