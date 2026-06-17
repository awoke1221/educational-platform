// src/app/api/courses/samples/route.ts
// API endpoint to fetch courses from Cloudinary videos

import { NextResponse } from "next/server";
import CloudinaryService from "@/lib/cloudinary";

// Map Cloudinary video public_ids to structured course data
function videoToCourse(video: any, index: number) {
  const publicId = video.public_id || "";
  const fileName = publicId.split("/").pop() || "";

  // Generate title & description from the video filename
  const courseMap: Record<
    string,
    {
      title: string;
      desc: string;
      level: string;
      category: string;
      price: number;
    }
  > = {
    elephants: {
      title: "የዱር አንስታይ ጥናት",
      desc: "ስለ ዝሆኖች ባህሪ እና ኑሮ የሚያጠና አስደሳች ኮርስ። የዱር አንስታይ ፍቅር ያላቸው ሁሉ መመዝገብ ይኖርባቸዋል",
      level: "beginner",
      category: "Science",
      price: 599,
    },
    "dance-2": {
      title: "ዘመናዊ ዳንስ ስልጠና",
      desc: "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ። በዘመናዊ የአካል ብቃት እንቅስቃሴ ጤናዎን ይጠብቁ",
      level: "intermediate",
      category: "Arts",
      price: 799,
    },
    "cld-sample-video": {
      title: "የቪዲዮ ኤዲቲንግ መሰረቶች",
      desc: "የቪዲዮ አርትዖት መሰረታዊ መርሆችን ይማሩ። ከመጀመሪያ እስከ መጨረሻ የቪዲዮ አርትዖት ስልጠና",
      level: "beginner",
      category: "Technology",
      price: 1299,
    },
    "sea-turtle": {
      title: "የባህር ህይወት ጥናት",
      desc: "ስለ ባህር ኤሊዎች እና የባህር ህይወት ጥበቃ የሚያጠና ትምህርታዊ ኮርስ። የባህር ስነ-ምህዳርን ይረዱ",
      level: "intermediate",
      category: "Science",
      price: 699,
    },
  };

  const mapped = courseMap[fileName] || {
    title: fileName
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase()),
    desc: `ስለ ${fileName.replace(/-/g, " ")} የሚያጠና አስደሳች ኮርስ`,
    level: "beginner",
    category: "General",
    price: 499,
  };

  return {
    id: `cloudinary-${publicId.replace(/\//g, "-")}`,
    title: mapped.title,
    shortDescription: mapped.desc,
    coverImage: CloudinaryService.getVideoThumbnail(publicId, {
      width: 640,
      height: 360,
    }),
    level: mapped.level,
    category: mapped.category,
    price: mapped.price,
    currency: "ETB",
    enrollmentCount: Math.floor(Math.random() * 150) + 20,
    instructor: { fullName: "AD LMS" },
    isFromCloudinary: true,
    cloudinaryPublicId: publicId,
    videoDuration: video.duration ? Math.round(video.duration) : 0,
    videoUrl: video.secure_url,
  };
}

export async function GET() {
  try {
    const allVideos = await CloudinaryService.searchResources(
      "resource_type:video",
      { maxResults: 50, resourceType: "video" },
    );

    const courses = allVideos.map(videoToCourse);

    return NextResponse.json({
      success: true,
      data: courses,
      message: "Cloudinary courses retrieved successfully",
      total: courses.length,
    });
  } catch (error) {
    console.error("[CLOUDINARY COURSES] Failed:", error);
    return NextResponse.json({
      success: true,
      data: [],
      message: "No courses available",
      total: 0,
    });
  }
}
