// src/app/api/courses/categories/route.ts
// Course Categories & Levels API

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/supabase";
import { successResponse, handleApiError } from "@/lib/utils/api";

// ============================================
// GET /api/courses/categories - Get All Categories
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Get distinct categories from published courses
    const courses = await prisma.course.findMany({
      where: {
        isPublished: true,
        isArchived: false,
        category: { not: null },
      },
      select: {
        category: true,
      },
      distinct: ["category"],
    });

    const categories = courses
      .map((c) => c.category)
      .filter(Boolean)
      .sort();

    // Get course counts per category
    const categoryCounts: Record<string, number> = {};
    for (const category of categories) {
      categoryCounts[category!] = await prisma.course.count({
        where: {
          category,
          isPublished: true,
          isArchived: false,
        },
      });
    }

    // Also return available levels
    const levels = [
      {
        value: "beginner",
        label: "Beginner",
        count: await prisma.course.count({
          where: { level: "beginner", isPublished: true, isArchived: false },
        }),
      },
      {
        value: "intermediate",
        label: "Intermediate",
        count: await prisma.course.count({
          where: {
            level: "intermediate",
            isPublished: true,
            isArchived: false,
          },
        }),
      },
      {
        value: "advanced",
        label: "Advanced",
        count: await prisma.course.count({
          where: { level: "advanced", isPublished: true, isArchived: false },
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
