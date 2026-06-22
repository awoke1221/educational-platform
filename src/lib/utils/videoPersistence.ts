// Video playback persistence utility
// Saves/resumes video position across navigations using localStorage

const VIDEO_POSITION_PREFIX = "video_pos_";
const VIDEO_COMPLETED_PREFIX = "video_done_";

/**
 * Save the current playback position for a lecture
 */
export function saveVideoPosition(
  lectureId: string,
  currentTime: number,
  duration: number,
): void {
  if (!lectureId || typeof window === "undefined") return;
  try {
    const data = { currentTime, duration, updatedAt: Date.now() };
    localStorage.setItem(
      VIDEO_POSITION_PREFIX + lectureId,
      JSON.stringify(data),
    );
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/**
 * Get the saved playback position for a lecture
 */
export function getVideoPosition(
  lectureId: string,
): { currentTime: number; duration: number } | null {
  if (!lectureId || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VIDEO_POSITION_PREFIX + lectureId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clear saved position (e.g., when video is completed)
 */
export function clearVideoPosition(lectureId: string): void {
  if (!lectureId || typeof window === "undefined") return;
  localStorage.removeItem(VIDEO_POSITION_PREFIX + lectureId);
}

/**
 * Mark a lecture as completed (so we don't resume it)
 */
export function markLectureCompleted(lectureId: string): void {
  if (!lectureId || typeof window === "undefined") return;
  try {
    localStorage.setItem(VIDEO_COMPLETED_PREFIX + lectureId, "true");
    clearVideoPosition(lectureId);
  } catch {
    // ignore
  }
}

/**
 * Check if a lecture was already completed
 */
export function isLectureCompleted(lectureId: string): boolean {
  if (!lectureId || typeof window === "undefined") return false;
  try {
    return localStorage.getItem(VIDEO_COMPLETED_PREFIX + lectureId) === "true";
  } catch {
    return false;
  }
}

/**
 * Clear all saved video data (useful for logout)
 */
export function clearAllVideoData(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key?.startsWith(VIDEO_POSITION_PREFIX) ||
        key?.startsWith(VIDEO_COMPLETED_PREFIX)
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}
