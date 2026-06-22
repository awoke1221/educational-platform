import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { successResponse, handleApiError } from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const clientStatus = db ? "initialized" : "null";

    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET";

    // Test 1: simple select no count
    const { data: d1, error: e1 } = await db
      .from("Course")
      .select("*");

    // Test 2: select with count
    const { data: d2, error: e2, count: c2 } = await db
      .from("Course")
      .select("*", { count: "exact", head: false });

    // Test 3: explicit column select no count
    const { data: d3, error: e3 } = await db
      .from("Course")
      .select("id, title, isPublished");

    // Test 4: Lecture table
    const { data: d4, error: e4 } = await db
      .from("Lecture")
      .select("*");

    return successResponse({
      clientStatus,
      supabaseUrl: rawUrl,
      tests: {
        simple_select: { count: d1?.length || 0, error: e1?.message || null, items: d1 || [] },
        with_count: { count: c2, error: e2?.message || null, items: d2 || [] },
        columns_no_count: { count: d3?.length || 0, error: e3?.message || null, items: d3 || [] },
        lectures: { count: d4?.length || 0, error: e4?.message || null, items: d4 || [] },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
