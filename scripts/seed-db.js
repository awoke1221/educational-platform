// Seed database with courses via Supabase REST API
const https = require("https");
require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const API_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const BUNNY_DEMO_VIDEO =
  process.env.NEXT_PUBLIC_BUNNY_DEMO_VIDEO_URL ||
  "https://bunny-cdn.example.com/demo.mp4";

function getBunnyStoragePathFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return url;
  }
}

const LECTURES = [
  {
    id: "bunny-demo-1-lecture-1",
    courseId: "bunny-demo-1",
    title: "የዱር አንስታይ ጥናት የመግቢያ ቪዲዮ",
    description: "እንኳን ደህና መጡ። ይህን ቪዲዮ በማየት ትምህርቱን ይጀምሩ።",
    videoUrl: BUNNY_DEMO_VIDEO,
    cloudinaryPublicId: getBunnyStoragePathFromUrl(BUNNY_DEMO_VIDEO),
    duration: 60,
    orderIndex: 1,
    isPublished: true,
    videoSize: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bunny-demo-2-lecture-1",
    courseId: "bunny-demo-2",
    title: "ዘመናዊ ዳንስ ስልጠና የመግቢያ ቪዲዮ",
    description: "በዚህ ቪዲዮ በመጀምር የዳንስ መሠረታዊ እንቅስቃሴዎችን ይማሩ።",
    videoUrl: BUNNY_DEMO_VIDEO,
    cloudinaryPublicId: getBunnyStoragePathFromUrl(BUNNY_DEMO_VIDEO),
    duration: 60,
    orderIndex: 1,
    isPublished: true,
    videoSize: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bunny-demo-3-lecture-1",
    courseId: "bunny-demo-3",
    title: "የቪዲዮ ኤዲቲንግ መሰረቶች የመግቢያ ቪዲዮ",
    description: "ይህ ቪዲዮ የቪዲዮ ኤዲቲንግ መሰረታዊ ስርዓቶችን ይገልፃል።",
    videoUrl: BUNNY_DEMO_VIDEO,
    cloudinaryPublicId: getBunnyStoragePathFromUrl(BUNNY_DEMO_VIDEO),
    duration: 60,
    orderIndex: 1,
    isPublished: true,
    videoSize: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bunny-demo-4-lecture-1",
    courseId: "bunny-demo-4",
    title: "የባህር ህይወት ጥናት የመግቢያ ቪዲዮ",
    description: "በዚህ ቪዲዮ የባህር ኤሊዎችን እና የባህር ህይወትን ጥበቃ በቀላሉ ይማሩ።",
    videoUrl: BUNNY_DEMO_VIDEO,
    cloudinaryPublicId: getBunnyStoragePathFromUrl(BUNNY_DEMO_VIDEO),
    duration: 60,
    orderIndex: 1,
    isPublished: true,
    videoSize: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

if (!SUPABASE_URL || !API_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file");
  process.exit(1);
}
// update the configerations
const COURSES = [
  {
    id: "bunny-demo-1",
    title: "የዱር አንስታይ ጥናት",
    shortDescription: "ስለ ዝሆኖች ባህሪ እና ኑሮ የሚያጠና አስደሳች ኮርስ",
    description:
      "ይህ ኮርስ በቲክቶክ ላይ የግል ብራንድዎን እንዴት መገንባት እና ተፅዕኖ ፈጣሪ ይዘቶችን እንዴት መፍጠር እንደሚችሉ ያስተምራል። ከቪዲዮ አዘገጃጀት፣ የይዘት ስትራቴጂ፣ የተከታዮች እድገት እና የTikTok አልጎሪዝም አጠቃቀም ጀምሮ በመድረኩ ላይ ጠንካራ መገኘት እንዲፈጥሩ ያግዛል። ለጀማሪዎችም ሆነ ለይዘት ፈጣሪዎች ተስማሚ ነው።",
    coverImage: BUNNY_DEMO_VIDEO,
    price: 599,
    currency: "ETB",
    level: "beginner",
    category: "Science",
    instructorId: "adlms",
    duration: 60,
    videoCount: 1,
    enrollmentCount: 126,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bunny-demo-2",
    title: "ዘመናዊ ዳንስ ስልጠና",
    shortDescription: "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ",
    description:
      "ከመሰረታዊ እስከ ላቀ የዳንስ እንቅስቃሴዎችን ይማሩ። በዘመናዊ የአካል ብቃት እንቅስቃሴ ጤናዎን ይጠብቁ",
    coverImage: BUNNY_DEMO_VIDEO,
    price: 799,
    currency: "ETB",
    level: "intermediate",
    category: "Arts",
    instructorId: "adlms",
    duration: 60,
    videoCount: 1,
    enrollmentCount: 70,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bunny-demo-3",
    title: "የቪዲዮ ኤዲቲንግ መሰረቶች",
    shortDescription: "የቪዲዮ አርትዖት መሰረታዊ መርሀዎችን ይማሩ",
    description: "የቪዲዮ አርትዖት መሰረታዊ መርሀዎችን ይማሩ። ከመጀመሪያ እስከ መጨረሻ የቪዲዮ አርትዖት ስልጠና",
    coverImage: BUNNY_DEMO_VIDEO,
    price: 1299,
    currency: "ETB",
    level: "beginner",
    category: "Technology",
    instructorId: "adlms",
    duration: 60,
    videoCount: 1,
    enrollmentCount: 78,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bunny-demo-4",
    title: "የባህር ህይወት ጥናት",
    shortDescription: "ስለ ባህር ኤሊዎች እና የባህር ህይወት ጥበቃ የሚያጠና ትምህርታዊ ኮርስ",
    description:
      "ስለ ባህር ኤሊዎች እና የባህር ህይወት ጥበቃ የሚያጠና ትምህርታዊ ኮርስ። የባህር ስነ-ምህዳርን ይረዱ",
    coverImage: BUNNY_DEMO_VIDEO,
    price: 699,
    currency: "ETB",
    level: "intermediate",
    category: "Science",
    instructorId: "adlms",
    duration: 60,
    videoCount: 1,
    enrollmentCount: 40,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

  // 2. Create lectures for demo courses
  for (const lecture of LECTURES) {
    try {
      await supabaseRequest("POST", "/rest/v1/Lecture", lecture);
      console.log(`✅ Lecture created: ${lecture.title}`);
    } catch (e) {
      if (e.message.includes("409")) {
        console.log(`⏭️  Lecture exists: ${lecture.title}`);
      } else {
        console.log(`❌ Failed lecture: ${lecture.title} - ${e.message}`);
      }
    }
  }

  // 3. Create enrollment for test user
  try {
    const enrollment = {
      id: require("crypto").randomUUID(),
      userId: "e0dcfa25-0eb1-476f-a1cb-ae3deba51e17",
      courseId: "bunny-demo-1",
      status: "active",
      completionPercentage: 0,
      enrollmentDate: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await supabaseRequest("POST", "/rest/v1/Enrollment", enrollment);
    console.log(`✅ Enrollment created for user in course: የዱር አንስታይ ጥናት`);
  } catch (e) {
    console.log(`❌ Enrollment failed: ${e.message}`);
  }

  // 4. Verify
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
