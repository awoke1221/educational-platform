import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { successResponse, handleApiError } from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  try {
    // Check if supabaseAdmin is initialized
    const clientStatus = supabaseAdmin ? "initialized" : "null";

    // Show the actual Supabase URL being used (partially masked)
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET";
    const maskedUrl = rawUrl.length > 20 
      ? rawUrl.substring(0, 20) + "..." + rawUrl.substring(rawUrl.length - 10)
      : rawUrl;

    // Try to query courses without filters
    const { data: allCourses, error: coursesErr, count } = await supabaseAdmin!
      .from("Course")
      .select("id, title, isPublished, isArchived", { count: "exact", head: false });

    // Try to query lectures
    const { data: lectures, error: lecturesErr } = await supabaseAdmin!
      .from("Lecture")
      .select("id, courseId, videoUrl");

    return successResponse({
      clientStatus,
      supabaseUrl: maskedUrl,
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
