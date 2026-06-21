// src/app/api/courses/[courseId]/route.ts - Single Course CRUD

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { updateCourseSchema } from "@/lib/validators/schemas";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
} from "@/lib/utils/api";

async function canModify(
  id: string,
  userId: string,
  role: string,
): Promise<boolean> {
  if (role === "admin") return true;
  const { data: course } = await supabaseAdmin!
    .from("Course")
    .select("instructorId")
    .eq("id", id)
    .maybeSingle();
  return course?.instructorId === userId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;

    // Try DB first
    try {
      const { data: course } = await supabaseAdmin!
        .from("Course")
        .select("*, instructorId")
        .eq("id", courseId)
        .maybeSingle();
      if (course?.instructorId) {
        const { data: instr } = await supabaseAdmin!
          .from("User")
          .select("id, fullName, profileImage")
          .eq("id", course.instructorId)
          .maybeSingle();
        if (instr) course.instructor = instr;
      }
      if (course) {
        // Get lectures
        const { data: lectures } = await supabaseAdmin!
          .from("Lecture")
          .select("id, title, duration, orderIndex")
          .eq("courseId", courseId)
          .eq("isPublished", true)
          .order("orderIndex", { ascending: true });
        return successResponse(
          { ...course, lectures: lectures || [] },
          "Course retrieved successfully",
        );
      }
    } catch {
      /* DB unavailable, try Bunny demo fallback */
    }

    // Fallback: check if this is a Bunny demo course
    if (courseId.startsWith("bunny-demo-")) {
      const { env } = await import("@/config/env");

      const demoCourses: Record<string, any> = {
        "bunny-demo-1": {
          title: "የዱር አንስታይ ጥናት",
          desc: "ስለ ዝሆኖች ባህሪ እና ኑሮ የሚያጠና አስደሳች ኮርስ",
          level: "beginner",
          category: "Science",
          price: 599,
        },
        "bunny-demo-2": {
          title: "ዘመናዊ ዳንስ ስልጠና",
          desc: "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ",
          level: "intermediate",
          category: "Arts",
          price: 799,
        },
        "bunny-demo-3": {
          title: "የቪዲዮ ኤዲቲንግ መሰረቶች",
          desc: "የቪዲዮ አርትዖት መሰረታዊ መርሆችን ይማሩ",
          level: "beginner",
          category: "Technology",
          price: 1299,
        },
        "bunny-demo-4": {
          title: "የባህር ህይወት ጥናት",
          desc: "ስለ ባህር ኤሊዎች እና የባህር ህይወት ጥበቃ የሚያጠና ኮርስ",
          level: "intermediate",
          category: "Science",
          price: 699,
        },
      };

      const info = demoCourses[courseId] || demoCourses["bunny-demo-1"];

      if (env.bunny.demoVideoUrl) {
        return successResponse(
          {
            id: courseId,
            title: info.title,
            description: info.desc,
            shortDescription: info.desc,
            coverImage: env.bunny.demoVideoUrl,
            price: info.price,
            currency: "ETB",
            level: info.level,
            category: info.category,
            tags: [info.category],
            duration: 60,
            videoCount: 1,
            enrollmentCount: Math.floor(Math.random() * 150) + 20,
            isPublished: true,
            instructor: { id: "adlms", fullName: "AD LMS", profileImage: null },
            lectures: [
              {
                id: `lec-${courseId}`,
                title: info.title,
                duration: 60,
                orderIndex: 1,
              },
            ],
            _count: { lectures: 1, enrollments: 0 },
            videoUrl: env.bunny.demoVideoUrl,
          },
          "Demo course retrieved from Bunny",
        );
      }
    }

    return notFoundResponse("Course");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const auth = await verifyAuth(req);
    if (!auth) return errorResponse("Unauthorized", 401);
    if (!(await canModify(courseId, auth.userId, auth.role)))
      return errorResponse("Forbidden", 403);
    const body = await req.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);
    const validation = updateCourseSchema.safeParse(body);
    if (!validation.success)
      return errorResponse(
        "Validation failed",
        400,
        validation.error.flatten().fieldErrors,
      );
    const updates = validation.data;
    if (updates.title) {
      const { data: existing } = await supabaseAdmin!
        .from("Course")
        .select("id")
        .eq("title", updates.title)
        .neq("id", courseId)
        .maybeSingle();
      if (existing) return errorResponse("Title already exists", 409);
    }
    const { data: course, error: updateErr } = await supabaseAdmin!
      .from("Course")
      .update(updates)
      .eq("id", courseId)
      .select(
        "id, title, description, shortDescription, coverImage, price, level, category, tags, isPublished, updatedAt",
      )
      .single();
    if (updateErr) throw updateErr;
    return successResponse(course, "Course updated");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const auth = await verifyAuth(req);
    if (!auth) return errorResponse("Unauthorized", 401);
    if (!(await canModify(courseId, auth.userId, auth.role)))
      return errorResponse("Forbidden", 403);
    await supabaseAdmin!
      .from("Course")
      .update({
        isArchived: true,
        isPublished: false,
        deletedAt: new Date().toISOString(),
      })
      .eq("id", courseId);
    return successResponse(null, "Course archived");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const auth = await verifyAuth(req);
    if (!auth) return errorResponse("Unauthorized", 401);
    if (!(await canModify(courseId, auth.userId, auth.role)))
      return errorResponse("Forbidden", 403);
    const body = await req.json().catch(() => ({}));
    const { action } = body;
    let data: Record<string, any> = {};
    if (action === "publish") {
      const { data: c } = await supabaseAdmin!
        .from("Course")
        .select("*")
        .eq("id", courseId)
        .maybeSingle();
      if (!c) return notFoundResponse("Course");
      if (!c.coverImage) return errorResponse("Cover image required", 400);
      const { count } = await supabaseAdmin!
        .from("Lecture")
        .select("*", { count: "exact", head: true })
        .eq("courseId", courseId);
      if ((count || 0) === 0)
        return errorResponse("At least one lecture required", 400);
      data = { isPublished: true };
    } else if (action === "unpublish") {
      data = { isPublished: false };
    } else if (action === "cover") {
      data = { coverImage: body.coverImage };
    } else {
      return errorResponse("Invalid action", 400);
    }
    const { data: course, error: patchErr } = await supabaseAdmin!
      .from("Course")
      .update(data)
      .eq("id", courseId)
      .select("id, title, isPublished, coverImage")
      .single();
    if (patchErr) throw patchErr;
    return successResponse(course, "Updated");
  } catch (error) {
    return handleApiError(error);
  }
}
