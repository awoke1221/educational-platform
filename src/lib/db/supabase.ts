// src/lib/db/supabase.ts
// Supabase Database Integration with Advanced Features

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================
// Supabase Client (Anonymous - for frontend)
// ============================================
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[SUPABASE] Missing credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.",
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = getSupabaseClient();

// ============================================
// Supabase Admin Client (Service Role - for API routes)
// Uses REST API over HTTPS (IPv4 compatible)
// ============================================
function getSupabaseAdminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "[SUPABASE ADMIN] Missing credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.",
    );
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const supabaseAdmin = getSupabaseAdminClient();

// ============================================
// Prisma Client (Legacy - for backward compatibility)
// NOTE: Requires IPv6 to reach Supabase PostgreSQL directly.
// New routes should use supabaseAdmin (IPv4-compatible REST API)
// ============================================
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __prisma: PrismaClient | undefined;
}

let prismaInstance: PrismaClient | null = null;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL || "";
  const adapter = new PrismaPg(connectionString);

  return new PrismaClient({
    adapter,
    errorFormat: "pretty",
    log: ["warn", "error"],
  });
}

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    if (process.env.NODE_ENV !== "production" && global.__prisma) {
      prismaInstance = global.__prisma;
    } else {
      prismaInstance = createPrismaClient();
      if (process.env.NODE_ENV !== "production") {
        global.__prisma = prismaInstance;
      }
    }
  }
  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  },
});
