// src/app/api/courses/samples/route.ts
// This endpoint has been disabled to prevent demo course data from being exposed.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      data: [],
      message: "Demo course endpoint disabled",
      total: 0,
    },
    { status: 404 },
  );
}
