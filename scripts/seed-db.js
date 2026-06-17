// Seed database with courses via Supabase REST API
const https = require("https");
require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const API_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !API_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file");
  process.exit(1);
}
// update the configerations
const COURSES = [
  {
    id: "cloudinary-samples-elephants",
    title: "የዱር አንስታይ ጥናት",
    shortDescription: "ስለ ዝሆኖች ባህሪ እና ኑሮ የሚያጠና አስደሳች ኮርስ",
    description:
      "ስለ ዝሆኖች ባህሪ እና ኑሮ የሚያጠና አስደሳች ኮርስ። የዱር አንስታይ ፍቅር ያላቸው ሁሉ መመዝገብ ይኖርባቸዋል",
    coverImage:
      "https://res.cloudinary.com/dikm1x43c/video/upload/c_fill,h_360,q_auto,w_640/f_auto/v1/samples/elephants",
    price: 599,
    currency: "ETB",
    level: "beginner",
    category: "Science",
    instructorId: "adlms",
    duration: 49,
    videoCount: 1,
    enrollmentCount: 126,
    isPublished: true,
  },
  {
    id: "cloudinary-samples-dance-2",
    title: "ዘመናዊ ዳንስ ስልጠና",
    shortDescription: "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ",
    description:
      "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ። በዘመናዊ የአካል ብቃት እንቅስቃሴ ጤናዎን ይጠብቁ",
    coverImage:
      "https://res.cloudinary.com/dikm1x43c/video/upload/c_fill,h_360,q_auto,w_640/f_auto/v1/samples/dance-2",
    price: 799,
    currency: "ETB",
    level: "intermediate",
    category: "Arts",
    instructorId: "adlms",
    duration: 20,
    videoCount: 1,
    enrollmentCount: 70,
    isPublished: true,
  },
  {
    id: "cloudinary-samples-cld-sample-video",
    title: "የቪዲዮ ኤዲቲንግ መሰረቶች",
    shortDescription: "የቪዲዮ አርትዖት መሰረታዊ መርሆችን ይማሩ",
    description: "የቪዲዮ አርትዖት መሰረታዊ መርሆችን ይማሩ። ከመጀመሪያ እስከ መጨረሻ የቪዲዮ አርትዖት ስልጠና",
    coverImage:
      "https://res.cloudinary.com/dikm1x43c/video/upload/c_fill,h_360,q_auto,w_640/f_auto/v1/samples/cld-sample-video",
    price: 1299,
    currency: "ETB",
    level: "beginner",
    category: "Technology",
    instructorId: "adlms",
    duration: 12,
    videoCount: 1,
    enrollmentCount: 78,
    isPublished: true,
  },
  {
    id: "cloudinary-samples-sea-turtle",
    title: "የባህር ህይወት ጥናት",
    shortDescription: "ስለ ባህር ኤሊዎች እና የባህር ህይወት ጥበቃ የሚያጠና ትምህርታዊ ኮርስ",
    description:
      "ስለ ባህር ኤሊዎች እና የባህር ህይወት ጥበቃ የሚያጠና ትምህርታዊ ኮርስ። የባህር ስነ-ምህዳርን ይረዱ",
    coverImage:
      "https://res.cloudinary.com/dikm1x43c/video/upload/c_fill,h_360,q_auto,w_640/f_auto/v1/samples/sea-turtle",
    price: 699,
    currency: "ETB",
    level: "intermediate",
    category: "Science",
    instructorId: "adlms",
    duration: 15,
    videoCount: 1,
    enrollmentCount: 40,
    isPublished: true,
  },
];

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
    };

    if (data) options.headers["Content-Length"] = Buffer.byteLength(data);

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : null);
        } else {
          reject(new Error(`${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log("Seeding database...\n");

  // 1. Create courses
  for (const course of COURSES) {
    try {
      await supabaseRequest("POST", "/rest/v1/Course", course);
      console.log(`✅ Course created: ${course.title}`);
    } catch (e) {
      if (e.message.includes("409")) {
        console.log(`⏭️  Course exists: ${course.title}`);
      } else {
        console.log(`❌ Failed: ${course.title} - ${e.message}`);
      }
    }
  }

  // 2. Create enrollment for test user
  try {
    const enrollment = {
      id: require("crypto").randomUUID(),
      userId: "e0dcfa25-0eb1-476f-a1cb-ae3deba51e17",
      courseId: "cloudinary-samples-elephants",
      status: "active",
      completionPercentage: 0,
      enrolledAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    await supabaseRequest("POST", "/rest/v1/Enrollment", enrollment);
    console.log(`✅ Enrollment created for user in course: የዱር አንስታይ ጥናት`);
  } catch (e) {
    console.log(`❌ Enrollment failed: ${e.message}`);
  }

  // 3. Verify
  console.log("\n--- Verification ---");
  const courses = await supabaseRequest(
    "GET",
    "/rest/v1/Course?select=id,title&limit=5",
  );
  console.log(`Courses in DB: ${courses.length}`);
  courses.forEach((c) => console.log(`  - ${c.id}: ${c.title}`));

  const enrollments = await supabaseRequest(
    "GET",
    `/rest/v1/Enrollment?select=id,courseId,status&userId=eq.e0dcfa25-0eb1-476f-a1cb-ae3deba51e17&limit=5`,
  );
  console.log(`Enrollments: ${enrollments.length}`);
  enrollments.forEach((e) =>
    console.log(`  - Course: ${e.courseId}, Status: ${e.status}`),
  );
}

main().catch(console.error);
