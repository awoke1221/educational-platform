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
  try {
    const repoRoot = process.cwd();
    const envPath = path.join(repoRoot, ".env");
    const text = await fs.readFile(envPath, "utf8");
    const env = parseDotenv(text);

    const apiKey = env.BUNNY_STREAM_API_KEY;
    const libraryId = env.BUNNY_STREAM_LIBRARY_ID;

    if (!apiKey || !libraryId) {
      console.error("Bunny Stream API key or library ID missing in .env");
      process.exit(2);
    }

    const url = `https://video.bunnycdn.com/library/${libraryId}/videos?page=1&itemsPerPage=200`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", AccessKey: apiKey },
    });
    if (!res.ok) {
      console.error("Bunny Stream API error", res.status, await res.text());
      process.exit(3);
    }
    const data = await res.json();
    if (!data || !data.items) {
      console.log("No videos returned", JSON.stringify(data, null, 2));
      return;
    }

    // Print simple list: guid and title
    for (const v of data.items) {
      console.log(
        `${v.guid}  -  ${v.title}  (length: ${v.length}s, uploaded: ${v.dateUploaded})`,
      );
    }
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
