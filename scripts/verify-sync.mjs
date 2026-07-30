import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: course } = await supabase
  .from("Course")
  .select("id, title, videoCount, duration")
  .eq("id", "e5d469d6-c661-4d15-986c-7a3fa67bcaad")
  .single();

console.log("=== Course ===");
console.log("Title:", course.title);
console.log("Videos:", course.videoCount);
console.log("Duration:", Math.round(course.duration / 60) + " minutes");
console.log("");

const { data: lectures } = await supabase
  .from("Lecture")
  .select("title, orderIndex, duration, isPublished, cloudinaryPublicId")
  .eq("courseId", "e5d469d6-c661-4d15-986c-7a3fa67bcaad")
  .order("orderIndex");

console.log(`=== Lectures (${lectures.length}) ===`);
lectures.forEach((l, i) => {
  const dur = l.duration ? Math.round(l.duration / 60) + "m" : "?";
  const pub = l.isPublished ? "✅ Published" : "📝 Draft";
  const bunny = l.cloudinaryPublicId
    ? "(Bunny: " + l.cloudinaryPublicId.substring(0, 8) + "...)"
    : "";
  console.log(
    `  ${i + 1}. #${l.orderIndex} "${l.title}" | ${dur} | ${pub} ${bunny}`,
  );
});
