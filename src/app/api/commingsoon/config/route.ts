// src/app/api/commingsoon/config/route.ts
// GET — Serve coming soon configuration (launch date, academy name)

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    launchDate:
      process.env.NEXT_PUBLIC_COURSE_LAUNCH_DATE || "2026-07-26T00:00:00",
    academyName: "Adony TikTok Academy",
    taglineAm: "በቅርቡ ይጀምራል!",
    taglineEn: "Coming Soon",
  });
}
