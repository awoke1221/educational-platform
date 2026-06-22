import { env } from "@/config/env";
import BunnyService from "@/lib/bunny";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

const VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "ogv", "mov", "avi", "mkv"];

function isVideoFile(file: any) {
  const name = file.objectName || file.ObjectName || "";
  const isDir = file.isDirectory ?? file.IsDirectory ?? false;
  const extension = name.split(".").pop()?.toLowerCase();
  return !!extension && VIDEO_EXTENSIONS.includes(extension) && !isDir;
}

async function collectVideoFiles(rootPath: string) {
  // Each entry: { fileInfo, storagePath (full path within zone) }
  const results: { fileInfo: any; storagePath: string }[] = [];

  async function recurse(currentPath: string, depth: number = 0) {
    if (depth > 5) return; // safety limit
    try {
      const files = (await BunnyService.listFiles(currentPath)) as any[];
      for (const file of files) {
        const name = file.objectName || file.ObjectName || "";
        const isDir = file.isDirectory ?? file.IsDirectory ?? false;

        if (!isDir && isVideoFile(file)) {
          // The correct storage path is the current recursion path + object name
          const storagePath = currentPath ? `${currentPath}/${name}` : name;
          results.push({ fileInfo: file, storagePath });
        }
      }

      // Recurse into subfolders
      const subfolders = files
        .filter((f: any) => f.isDirectory ?? f.IsDirectory ?? false)
        .map((f: any) => f.objectName || f.ObjectName || "");

      for (const name of subfolders) {
        if (!name) continue;
        const nextPath = currentPath ? `${currentPath}/${name}` : name;
        await recurse(nextPath, depth + 1);
      }
    } catch {
      // skip inaccessible folders
    }
  }

  await recurse(rootPath);
  return results;
}

export async function GET(request: Request) {
  try {
    // If a specific URL/path is provided, use it to build a signed URL
    const url = new URL(request.url);
    const providedUrl = url.searchParams.get("url");
    const providedPath = url.searchParams.get("path");

    if (providedUrl || providedPath) {
      let storagePath = providedPath || "";
      if (providedUrl) {
        try {
          const parsed = new URL(providedUrl);
          // If the URL is a pull zone URL, strip host and use the pathname as storage path
          storagePath = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
        } catch {
          storagePath = providedUrl;
        }
      }

      if (!storagePath) return errorResponse("Invalid path/url provided", 400);

      const encodedPath = encodeURIComponent(storagePath);
      const requestUrl = new URL(request.url);
      const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
      const proxiedVideoUrl = `${baseUrl}/api/bunny/video-proxy?path=${encodedPath}`;
      const type = storagePath.split(".").pop()?.toLowerCase() || "mp4";

      return successResponse(
        {
          videoUrl: proxiedVideoUrl,
          poster: "",
          filename: storagePath.split("/").pop(),
          type,
          storagePath,
        },
        "Hero video retrieved successfully",
      );
    }

    const rootFolder =
      env.bunny.defaultFolder?.trim() || "educational-platform";
    const videoFiles = await collectVideoFiles(rootFolder);

    if (!videoFiles.length) {
      return errorResponse("No Bunny hero video found", 404);
    }

    // Sort by last modified time (newest first)
    const selected = videoFiles.sort((a, b) => {
      const aTime = new Date(
        a.fileInfo.LastChanged ||
          a.fileInfo.lastChanged ||
          a.fileInfo.DateCreated ||
          a.fileInfo.dateCreated ||
          0,
      ).getTime();
      const bTime = new Date(
        b.fileInfo.LastChanged ||
          b.fileInfo.lastChanged ||
          b.fileInfo.DateCreated ||
          b.fileInfo.dateCreated ||
          0,
      ).getTime();
      return bTime - aTime;
    })[0];

    const { storagePath } = selected;
    const objectName =
      selected.fileInfo.ObjectName || selected.fileInfo.objectName || "";
    const encodedStoragePath = encodeURIComponent(storagePath);

    // Use the proxy endpoint to serve the video (avoids CORS/ORB blocking).
    // The proxy now supports HTTP Range (byte-serving) so each chunk request
    // stays well within Vercel's serverless limits.
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const proxiedVideoUrl = `${baseUrl}/api/bunny/video-proxy?path=${encodedStoragePath}`;
    const type = objectName.split(".").pop()?.toLowerCase() || "mp4";

    return successResponse(
      {
        videoUrl: proxiedVideoUrl,
        poster: "",
        filename: objectName,
        type,
        storagePath,
      },
      "Hero video retrieved successfully",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
