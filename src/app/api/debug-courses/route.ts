import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { successResponse, handleApiError } from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const clientStatus = db ? "initialized" : "null";

    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET";

    // Test 1: count only with head
    const { count: c1, error: e1 } = await db
      .from("Course")
      .select("*", { count: "exact", head: true });

    // Test 2: select specific columns
    const { data: d2, error: e2, count: c2 } = await db
      .from("Course")
      .select("id, title", { count: "exact", head: false });

    // Test 3: select all columns
    const { data: d3, error: e3 } = await db
      .from("Lecture")
      .select("*");

    // Test 4: check User table still works
    const { count: c4, error: e4 } = await db
      .from("User")
      .select("*", { count: "exact", head: true });

    return successResponse({
      clientStatus,
      supabaseUrl: rawUrl,
      tests: {
        courses_head: { count: c1, error: e1?.message || null },
        courses_select: { count: c2, error: e2?.message || null, items: d2 || [] },
        lectures: { count: d3?.length || 0, error: e3?.message || null },
        users: { count: c4, error: e4?.message || null },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
