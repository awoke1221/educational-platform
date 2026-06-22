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

    const { data: course, error: courseErr } = await supabaseAdmin!
      .from("Course")
      .select("*, instructorId")
      .eq("id", courseId)
      .maybeSingle();

    if (courseErr) throw courseErr;
    if (!course) return notFoundResponse("Course");

    const { data: instr, error: instrErr } = await supabaseAdmin!
      .from("User")
      .select("id, fullName, profileImage")
      .eq("id", course.instructorId)
      .maybeSingle();

    if (instrErr) throw instrErr;
    if (instr) course.instructor = instr;

    const { data: lectures, error: lecturesErr } = await supabaseAdmin!
      .from("Lecture")
      .select("id, title, duration, orderIndex")
      .eq("courseId", courseId)
      .eq("isPublished", true)
      .order("orderIndex", { ascending: true });

    if (lecturesErr) throw lecturesErr;

    return successResponse(
      { ...course, lectures: lectures || [] },
      "Course retrieved successfully",
    );
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
