// Update course description with the TikTok Academy Amharic description
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const NEW_DESCRIPTION = `ይህ ኮርስ በቲክቶክ ላይ የግል ብራንድዎን እንዴት መገንባት እና ተፅዕኖ ፈጣሪ ይዘቶችን እንዴት መፍጠር እንደሚችሉ ያስተምራል። ከቪዲዮ አዘገጃጀት፣ የይዘት ስትራቴጂ፣ የተከታዮች እድገት እና የTikTok አልጎሪዝም አጠቃቀም ጀምሮ በመድረኩ ላይ ጠንካራ መገኘት እንዲፈጥሩ ያግዛል። ለጀማሪዎችም ሆነ ለይዘት ፈጣሪዎች ተስማሚ ነው።`;

async function main() {
  // Get all published courses
  const { data: courses, error: fetchError } = await supabase
    .from("Course")
    .select("id, title, description")
    .eq("isPublished", true)
    .eq("isArchived", false);

  if (fetchError) {
    console.error("Error fetching courses:", fetchError.message);
    process.exit(1);
  }

  if (!courses || courses.length === 0) {
    console.log("No published courses found.");
    process.exit(0);
  }

  console.log(`Found ${courses.length} course(s):`);
  courses.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.title} (${c.id})`);
  });

  // Update the first (or only) course with the new description
  const targetCourse = courses[0];
  console.log(`\nUpdating description for: ${targetCourse.title}`);

  const { error: updateError } = await supabase
    .from("Course")
    .update({
      description: NEW_DESCRIPTION,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", targetCourse.id);

  if (updateError) {
    console.error("Error updating course:", updateError.message);
    process.exit(1);
  }

  console.log("✅ Course description updated successfully!");
}

main().catch(console.error);
