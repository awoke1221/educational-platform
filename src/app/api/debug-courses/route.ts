import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { successResponse, handleApiError } from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const clientStatus = db ? "initialized" : "null";

    // Show the actual Supabase URL being used
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET";

    // Try to query courses without filters
    const { data: allCourses, error: coursesErr, count } = await db
      .from("Course")
      .select("id, title, isPublished, isArchived", { count: "exact", head: false });

    // Try to query lectures
    const { data: lectures, error: lecturesErr } = await db
      .from("Lecture")
      .select("id, courseId, videoUrl");

    return successResponse({
      clientStatus,
      supabaseUrl: rawUrl,
      courses: {
        count,
        error: coursesErr?.message || null,
        items: allCourses || [],
      },
      lectures: {
        count: lectures?.length || 0,
        error: lecturesErr?.message || null,
        sample: lectures?.slice(0, 3) || [],
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
