import fs from "node:fs/promises";
import path from "node:path";

function parseDotenv(text) {
  const lines = text.split(/\r?\n/);
  const obj = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    obj[key] = val;
  }
  return obj;
}

async function main() {
  const repoRoot = process.cwd();
  const envPath = path.join(repoRoot, ".env");
  const text = await fs.readFile(envPath, "utf8");
  const env = parseDotenv(text);

  const SUPABASE_URL = env.SUPABASE_URL;
  const API_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !API_KEY) {
    console.error("Missing SUPABASE_URL or API key in .env");
    process.exit(2);
  }

  const url = new URL(
    "/rest/v1/Course?select=id,title",
    SUPABASE_URL,
  ).toString();
  const res = await fetch(url, {
    headers: {
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    console.error("Supabase API error", res.status, await res.text());
    process.exit(3);
  }

  const data = await res.json();
  console.log(`Courses found: ${data.length}`);
  for (const c of data) {
    console.log(`${c.id}  -  ${c.title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
