// src/proxy.ts
// Next.js 16 Proxy for Authentication and CORS
// Replaces the deprecated middleware.ts convention

import { NextRequest, NextResponse } from "next/server";

// ============================================
// Protected Routes Configuration
// ============================================

const protectedPaths = [
  "/api/user/",
  "/api/course/enrolled/",
  "/api/progress/",
  "/api/certificate/",
  "/api/payments/",
];

const publicPaths = ["/api/auth/register", "/api/auth/login", "/api/health"];

// ============================================
// CORS Configuration
// ============================================

const corsHeaders = {
  "Access-Control-Allow-Origin":
    process.env.ALLOWED_ORIGINS || "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "3600",
};

// ============================================
// CORS Preflight Handler
// ============================================

function handleCors(request: NextRequest): NextResponse | null {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  return null;
}

// ============================================
// Main Proxy Function
// ============================================

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS Preflight
  const corsResponse = handleCors(request);
  if (corsResponse) {
    return corsResponse;
  }

  // Skip API Routes for Now (let handlers deal with auth)
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();

    // Add CORS headers to all responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  // Handle Frontend Routes
  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// ============================================
// Proxy Configuration
// ============================================

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
