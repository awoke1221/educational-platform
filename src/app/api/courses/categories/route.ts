// src/app/api/courses/categories/route.ts
// Course Categories & Levels API

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { successResponse, handleApiError } from "@/lib/utils/api";

// Helper: count courses with filters
async function countCourses(filters: Record<string, any>): Promise<number> {
  let query = supabaseAdmin!
    .from("Course")
    .select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters)) {
    query = query.eq(k, v) as any;
  }
  const { count, error } = await query;
  return error ? 0 : count || 0;
}

export async function GET(request: NextRequest) {
  try {
    const { data: courses, error } = await supabaseAdmin!
      .from("Course")
      .select("category")
      .eq("isPublished", true)
      .eq("isArchived", false)
      .neq("category", null);

    if (error) throw error;

    const categories = [
      ...new Set((courses || []).map((c: any) => c.category).filter(Boolean)),
    ].sort();

    const categoryCounts: Record<string, number> = {};
    for (const category of categories) {
      categoryCounts[category!] = await countCourses({
        category,
        isPublished: true,
        isArchived: false,
      });
    }

    const levels = [
      {
        value: "beginner",
        label: "Beginner",
        count: await countCourses({
          level: "beginner",
          isPublished: true,
          isArchived: false,
        }),
      },
      {
        value: "intermediate",
        label: "Intermediate",
        count: await countCourses({
          level: "intermediate",
          isPublished: true,
          isArchived: false,
        }),
      },
      {
        value: "advanced",
        label: "Advanced",
        count: await countCourses({
          level: "advanced",
          isPublished: true,
          isArchived: false,
        }),
      },
    ];

    return successResponse(
      {
        categories: categories.map((cat) => ({
          name: cat,
          count: categoryCounts[cat!] || 0,
        })),
        levels,
      },
      "Categories retrieved successfully",
    );
  } catch (error) {
    console.error("[CATEGORIES ERROR]", error);
    return handleApiError(error);
  }
}
