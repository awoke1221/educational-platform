"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, Reorder } from "framer-motion";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { handleAuthError } from "@/lib/utils/auth-error";

// ============================================
// Types
// ============================================

interface Course {
  id: string;
  title: string;
  description: string;
  shortDescription: string | null;
  coverImage: string;
  price: string;
  level: string;
  category: string | null;
  isPublished: boolean;
  isArchived: boolean;
  videoCount: number;
  enrollmentCount: number;
  duration: number | null;
  instructor: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  orderIndex: number;
  isPublished: boolean;
  videoUrl: string | null;
  cloudinaryPublicId: string | null;
  videoSize: string | null;
  views: number;
  createdAt: string;
}

// ============================================
// Upload State Interface
// ============================================

interface UploadState {
  isUploading: boolean;
  progress: number;
  lectureId: string | null;
  error: string | null;
}

// ============================================
// Bunny Storage State
// ============================================

interface BunnyFileItem {
  objectName: string;
  length: number;
  lastChanged: string;
  isDirectory: boolean;
  contentType: string;
  path: string;
}

// ============================================
// Helper: Format file size
// ============================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ============================================
// Main Admin Course Detail Page
// ============================================

export default function AdminCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();

  // Auth & Data
  const [token, setToken] = useState("");
  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "lectures" | "settings" | "storage"
  >("lectures");

  // Lecture Creation
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLectureTitle, setNewLectureTitle] = useState("");
  const [newLectureDesc, setNewLectureDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Video Upload
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    lectureId: null,
    error: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bunny Storage
  const [bunnyFiles, setBunnyFiles] = useState<BunnyFileItem[]>([]);
  const [bunnyLoading, setBunnyLoading] = useState(false);
  const [bunnyStats, setBunnyStats] = useState<any>(null);
  const [showVideoPreview, setShowVideoPreview] = useState<string | null>(null);

  // Course Editing
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    shortDescription: "",
    price: "",
    level: "beginner",
    category: "",
    coverImage: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Sync edit form when course loads
  useEffect(() => {
    if (course) {
      setEditForm({
        title: course.title,
        description: course.description,
        shortDescription: course.shortDescription || "",
        price: String(course.price),
        level: course.level,
        category: course.category || "",
        coverImage: course.coverImage || "",
      });
    }
  }, [course]);

  // ============================================
  // Auth Check
  // ============================================

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/auth/login");
      return;
    }
    setToken(t);
  }, [router]);

  // ============================================
  // Fetch Course & Lectures
  // ============================================

  const fetchData = useCallback(async () => {
    if (!token || !courseId) return;
    setLoading(true);
    setLoadError("");

    try {
      const [courseResult, lecturesResult] = await Promise.all([
        authFetchJson(`/api/courses/${courseId}`, { method: "GET" }),
        authFetchJson(`/api/courses/${courseId}/lectures`, { method: "GET" }),
      ]);

      // Handle authentication errors
      if (
        courseResult.response.status === 401 ||
        courseResult.response.status === 403
      ) {
        handleAuthError(courseResult.response.status, router);
        return;
      }
      if (
        lecturesResult.response.status === 401 ||
        lecturesResult.response.status === 403
      ) {
        handleAuthError(lecturesResult.response.status, router);
        return;
      }

      const courseData = courseResult.data;
      if (courseResult.response.ok && courseData.success) {
        setCourse(courseData.data);
        setLoadError("");
      } else {
        setLoadError(courseData.error || "Failed to load course");
      }

      const lecturesData = lecturesResult.data;
      if (lecturesResult.response.ok && lecturesData.success) {
        setLectures(lecturesData.data.lectures || []);
      }
    } catch (err: any) {
      console.error("[ADMIN COURSE] Fetch error:", err);
      setLoadError(err?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // Create Lecture
  // ============================================

  const handleCreateLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newLectureTitle.trim()) return;

    setCreating(true);
    try {
      const result = await authFetchJson(`/api/courses/${courseId}/lectures`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newLectureTitle.trim(),
          description: newLectureDesc.trim() || undefined,
        }),
      });

      const data = result.data;
      if (result.response.ok && data.success) {
        const created = data.data;
        setNewLectureTitle("");
        setNewLectureDesc("");
        setShowCreateForm(false);
        // Refresh list then open upload dialog for the new lecture
        fetchData().then(() => {
          // auto-open upload for the created lecture
          if (created?.id) handleUploadVideo(created.id);
        });
      }
    } catch (err) {
      console.error("[ADMIN COURSE] Create lecture error:", err);
    } finally {
      setCreating(false);
    }
  };

  // ============================================
  // Upload Video to Cloudinary
  // ============================================

  const handleUploadVideo = async (lectureId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/webm,video/ogg";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate
      const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
      if (file.size > maxSize) {
        setUploadState({
          isUploading: false,
          progress: 0,
          lectureId: null,
          error: "Video is too large. Maximum size is 5GB.",
        });
        return;
      }

      if (!["video/mp4", "video/webm", "video/ogg"].includes(file.type)) {
        setUploadState({
          isUploading: false,
          progress: 0,
          lectureId: null,
          error: "Allowed formats: MP4, WebM, OGG only.",
        });
        return;
      }

      setUploadState({
        isUploading: true,
        progress: 0,
        lectureId,
        error: null,
      });

      try {
        // Upload via the API route
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "video");

        const uploadResponse = await authFetchJson("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadResult = uploadResponse.data;
        if (!uploadResponse.response.ok || !uploadResult.success) {
          throw new Error(uploadResult.error || "Upload failed");
        }

        const { publicId, url, duration } = uploadResult.data;

        // Now attach the video to the lecture
        const attachResult = await authFetchJson(
          `/api/courses/${courseId}/lectures/${lectureId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "video",
              videoUrl: url,
              cloudinaryPublicId: publicId,
              duration: Math.round(duration || 0),
              videoSize: file.size,
            }),
          },
        );

        const attachData = attachResult.data;
        if (!attachResult.response.ok || !attachData.success) {
          throw new Error(attachData.error || "Failed to attach video");
        }

        // Success
        setUploadState({
          isUploading: false,
          progress: 100,
          lectureId,
          error: null,
        });

        fetchData();

        // Reset after 3 seconds
        setTimeout(() => {
          setUploadState({
            isUploading: false,
            progress: 0,
            lectureId: null,
            error: null,
          });
        }, 3000);
      } catch (err: any) {
        setUploadState({
          isUploading: false,
          progress: 0,
          lectureId,
          error: err.message || "Upload failed",
        });
      }
    };
    input.click();
  };

  // ============================================
  // Delete Lecture
  // ============================================

  const handleDeleteLecture = async (lectureId: string) => {
    if (!confirm("Are you sure? This lecture will be deleted.")) return;

    try {
      const result = await authFetchJson(
        `/api/courses/${courseId}/lectures/${lectureId}`,
        {
          method: "DELETE",
        },
      );

      // Handle authentication errors
      if (result.response.status === 401 || result.response.status === 403) {
        handleAuthError(result.response.status, router);
        return;
      }

      const data = result.data;
      if (result.response.ok && data.success) {
        fetchData();
      }
    } catch (err) {
      console.error("[ADMIN COURSE] Delete error:", err);
    }
  };

  // ============================================
  // Reorder Lectures (Drag & Drop)
  // ============================================

  const [isReordering, setIsReordering] = useState(false);

  const handleReorder = async (reorderedLectures: Lecture[]) => {
    // Optimistically update local state
    setLectures(reorderedLectures);
    setIsReordering(true);

    try {
      const lectureIds = reorderedLectures.map((l) => l.id);
      await authFetchJson(`/api/courses/${courseId}/lectures/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureIds }),
      });
    } catch (err) {
      console.error("[REORDER] Error:", err);
      fetchData(); // Revert on error
    } finally {
      setTimeout(() => setIsReordering(false), 1000);
    }
  };

  // ============================================
  // Update Course
  // ============================================

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const body: Record<string, any> = {};
      if (editForm.title !== course?.title) body.title = editForm.title.trim();
      if (editForm.description !== course?.description)
        body.description = editForm.description.trim();
      if (editForm.shortDescription !== (course?.shortDescription || ""))
        body.shortDescription = editForm.shortDescription.trim() || null;
      if (editForm.price !== String(course?.price))
        body.price = parseFloat(editForm.price) || 0;
      if (editForm.level !== course?.level) body.level = editForm.level;
      if (editForm.category !== (course?.category || ""))
        body.category = editForm.category.trim() || null;
      if (editForm.coverImage !== (course?.coverImage || ""))
        body.coverImage = editForm.coverImage.trim() || null;

      if (Object.keys(body).length === 0) {
        setSaveMessage({ type: "success", text: "No changes to save." });
        setSaving(false);
        return;
      }

      const result = await authFetchJson(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Handle authentication errors
      if (result.response.status === 401 || result.response.status === 403) {
        handleAuthError(result.response.status, router);
        return;
      }

      if (result.response.ok && result.data.success) {
        setSaveMessage({
          type: "success",
          text: "✅ Course updated successfully!",
        });
        fetchData(); // Refresh
      } else {
        setSaveMessage({
          type: "error",
          text: result.data.error || "Failed to update course",
        });
      }
    } catch (err: any) {
      setSaveMessage({
        type: "error",
        text: err.message || "An error occurred",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  // ============================================
  // Publish / Unpublish / Archive
  // ============================================

  const handlePublishAction = async (
    action: "publish" | "unpublish" | "archive",
  ) => {
    if (!token) return;
    try {
      await authFetchJson("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, action }),
      });
      fetchData();
    } catch (err) {
      console.error("[ADMIN COURSE] Action error:", err);
    }
  };

  // ============================================
  // Fetch Bunny Storage for this course
  // ============================================

  const fetchBunnyStorage = useCallback(async () => {
    if (!token) return;
    setBunnyLoading(true);
    try {
      const folder = `educational-platform/courses/${courseId}`;
      const result = await authFetchJson(
        `/api/bunny/storage?path=${encodeURIComponent(folder)}`,
        {
          method: "GET",
        },
      );
      if (result.response.ok && result.data.success) {
        setBunnyFiles(result.data.data.files || []);
        setBunnyStats({
          totalFiles: result.data.data.totalFiles,
          totalSize: result.data.data.totalSizeFormatted,
        });
      }
    } catch (err) {
      console.error("[BUNNY STORAGE] Fetch error:", err);
    } finally {
      setBunnyLoading(false);
    }
  }, [token, courseId]);

  // ============================================
  // Delete Bunny file
  // ============================================

  const handleDeleteBunnyFile = async (storagePath: string) => {
    if (!confirm("Delete this file from Bunny Storage?")) return;
    try {
      const result = await authFetchJson("/api/bunny/storage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: [storagePath] }),
      });
      if (result.response.ok) {
        fetchBunnyStorage();
      }
    } catch (err) {
      console.error("[BUNNY DELETE] Error:", err);
    }
  };

  // ============================================
  // Loading State
  // ============================================

  if (!token) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <p className="text-gray-700 font-medium mb-2">
          {loadError || "Course not found"}
        </p>
        <p className="text-gray-400 text-sm mb-6">
          {loadError
            ? "There was a problem loading this course. Check your connection and try again."
            : "The course may have been deleted or you may not have permission to view it."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => fetchData()}
            className="bg-gradient-to-r from-[#0f1b3a] to-[#1b2a4a] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#1b2a4a]/20 hover:-translate-y-0.5 transition-all duration-300"
          >
            Retry
          </button>
          <Link
            href="/admin/courses"
            className="text-primary hover:underline text-sm"
          >
            ← Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // Helpers
  // ============================================

  const levelLabels: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/courses"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-primary">{course.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-7">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                course.isPublished
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {course.isPublished ? "Published" : "Draft"}
            </span>
            <span className="text-xs text-gray-400">
              {course.instructor?.fullName || "Unknown Instructor"}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-400">
              {levelLabels[course.level] || course.level}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-400">
              {Number(course.price).toLocaleString()} ETB
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setActiveTab("lectures");
              setShowCreateForm(true);
            }}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#0f1b3a] to-[#1b2a4a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#1b2a4a]/20 hover:-translate-y-0.5 transition-all duration-300 shadow-sm"
            title="Add a new lecture with video"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Lecture
          </button>
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-xs text-white bg-primary/80 px-3 py-2 rounded-lg hover:bg-primary transition-colors"
            target="_blank"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            View
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("lectures")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "lectures"
              ? "border-[#1b2a4a] text-[#1b2a4a] font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Lectures ({lectures.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "settings"
              ? "border-[#1b2a4a] text-[#1b2a4a] font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => {
            setActiveTab("storage");
            fetchBunnyStorage();
          }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "storage"
              ? "border-secondary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🐰 Storage
        </button>
      </div>

      {/* ============================================ */}
      {/* LECTURES TAB */}
      {/* ============================================ */}
      {activeTab === "lectures" && (
        <div>
          {/* Guidance */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-800">
                  How to add video content
                </h4>
                <ol className="mt-1 text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>
                    <strong>Add a lecture</strong> by clicking the button below
                  </li>
                  <li>
                    <strong>Upload a video</strong> by clicking the{" "}
                    <span className="inline-flex items-center gap-0.5">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </span>{" "}
                    icon next to each lecture
                  </li>
                  <li>
                    <strong>Publish the course</strong> from the Settings tab
                    when ready
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Add Lecture Button */}
          <div className="mb-6">
            {showCreateForm ? (
              <form
                onSubmit={handleCreateLecture}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4"
              >
                <h3 className="font-semibold text-gray-900">አዲስ ምዕራፍ ይፍጠሩ</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    የምዕራፍ ርዕስ *
                  </label>
                  <input
                    type="text"
                    value={newLectureTitle}
                    onChange={(e) => setNewLectureTitle(e.target.value)}
                    placeholder="ለምሳሌ፡ መግቢያ እና መሰረታዊ ፅንሰ ሀሳቦች"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    መግለጫ (አማራጭ)
                  </label>
                  <textarea
                    value={newLectureDesc}
                    onChange={(e) => setNewLectureDesc(e.target.value)}
                    placeholder="ስለ ምዕራፉ አጭር መግለጫ..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    ሰርዝ
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newLectureTitle.trim()}
                    className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creating ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        በመፍጠር ላይ...
                      </span>
                    ) : (
                      "ምዕራፍ ፍጠር"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-[#0f1b3a] to-[#1b2a4a] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#1b2a4a]/20 hover:-translate-y-0.5 transition-all duration-300"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                አዲስ ምዕራፍ ጨምር
              </button>
            )}
          </div>

          {/* Lectures List with Drag & Drop */}
          <div>
            {/* Reorder indicator */}
            {lectures.length > 1 && (
              <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8h16M4 16h16"
                  />
                </svg>
                {isReordering ? (
                  <span className="text-secondary font-medium">
                    Saving order...
                  </span>
                ) : (
                  <span>Drag ⋮⋮ to reorder lectures</span>
                )}
              </div>
            )}

            {lectures.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <svg
                  className="w-12 h-12 text-gray-300 mx-auto mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-500 text-sm mb-1">ምንም ምዕራፎች የሉም</p>
                <p className="text-gray-400 text-xs">
                  ከላይ ያለውን ቁልፍ ተጭነው የመጀመሪያውን ምዕራፍ ይፍጠሩ
                </p>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={lectures}
                onReorder={handleReorder}
                className="space-y-2"
                as="div"
              >
                {lectures
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((lecture, index) => {
                    const isUploading =
                      uploadState.isUploading &&
                      uploadState.lectureId === lecture.id;
                    const isUploaded =
                      !uploadState.isUploading &&
                      uploadState.progress === 100 &&
                      uploadState.lectureId === lecture.id;
                    const hasError =
                      uploadState.error && uploadState.lectureId === lecture.id;

                    return (
                      <Reorder.Item
                        key={lecture.id}
                        value={lecture}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:border-secondary/30 transition-colors"
                        whileDrag={{
                          scale: 1.02,
                          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                          zIndex: 50,
                        }}
                      >
                        <div className="p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-4">
                            {/* Drag Handle + Info */}
                            <div className="flex-1 min-w-0 flex items-start gap-3">
                              {/* Drag Handle */}
                              <div className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors touch-none">
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                                </svg>
                              </div>

                              {/* Info */}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                                    {index + 1}
                                  </span>
                                  <h3 className="font-semibold text-gray-900 text-sm truncate">
                                    {lecture.title}
                                  </h3>
                                  {lecture.isPublished ? (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
                                      ታትሟል
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">
                                      ረቂቅ
                                    </span>
                                  )}
                                </div>

                                {lecture.description && (
                                  <p className="text-xs text-gray-500 mt-1.5 ml-9 line-clamp-2">
                                    {lecture.description}
                                  </p>
                                )}

                                {/* Meta Info */}
                                <div className="flex flex-wrap items-center gap-3 mt-2 ml-9">
                                  <span className="text-xs text-gray-400">
                                    {lecture.duration
                                      ? `${lecture.duration} ደቂቃ`
                                      : "ቆይታ የለም"}
                                  </span>
                                  {lecture.cloudinaryPublicId && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      ቪዲዮ ተጭኗል
                                    </span>
                                  )}
                                  {lecture.videoSize && (
                                    <span className="text-xs text-gray-400">
                                      {formatFileSize(
                                        Number(lecture.videoSize),
                                      )}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-400">
                                    {lecture.views} እይታዎች
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => handleUploadVideo(lecture.id)}
                                disabled={uploadState.isUploading}
                                className={`p-2 rounded-lg transition-colors ${
                                  lecture.cloudinaryPublicId
                                    ? "text-green-600 hover:bg-green-50"
                                    : "text-gray-400 hover:bg-gray-100 hover:text-primary"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={
                                  lecture.cloudinaryPublicId
                                    ? "ቪዲዮ ቀይር"
                                    : "ቪዲዮ ጫን"
                                }
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              </button>

                              {lecture.cloudinaryPublicId && (
                                <Link
                                  href={`/courses/${courseId}/lectures/${lecture.id}`}
                                  target="_blank"
                                  className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                                  title="ተመልከት"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                </Link>
                              )}

                              <button
                                onClick={() => handleDeleteLecture(lecture.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="ሰርዝ"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>

                              <div className="ml-3 flex flex-col items-start">
                                {isUploading && (
                                  <div className="w-36">
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                      <div
                                        className="bg-secondary h-2 rounded-full transition-all"
                                        style={{
                                          width: `${uploadState.progress}%`,
                                        }}
                                      />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 text-left">
                                      {uploadState.progress}%
                                    </p>
                                  </div>
                                )}
                                {hasError && (
                                  <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                    {uploadState.error}
                                  </div>
                                )}
                                {isUploaded && (
                                  <div className="mt-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                    Video uploaded
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })}
              </Reorder.Group>
            )}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* BUNNY STORAGE TAB */}
      {/* ============================================ */}
      {activeTab === "storage" && (
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  🐰 Bunny Storage
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Files stored for this course in Bunny CDN
                </p>
              </div>
              {bunnyStats && (
                <div className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                  {bunnyStats.totalFiles} files • {bunnyStats.totalSize}
                </div>
              )}
            </div>

            {bunnyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bunnyFiles.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm">No files uploaded yet for this course</p>
                <p className="text-xs mt-1">
                  Upload videos from the Lectures tab
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {bunnyFiles
                  .filter((f) => !f.isDirectory)
                  .map((file, i) => {
                    const isVideo = file.contentType?.startsWith("video/");
                    const isImage = file.contentType?.startsWith("image/");
                    const fileUrl =
                      `https://${process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL?.replace(/^https?:\/\//, "").replace(/\/+$/, "") || "adonaytiktokacadamy.b-cdn.net"}/${file.path}`.replace(
                        /\/+/g,
                        "/",
                      );

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                      >
                        {/* File Icon */}
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isVideo ? "bg-blue-100" : isImage ? "bg-green-100" : "bg-gray-100"}`}
                        >
                          {isVideo ? (
                            <svg
                              className="w-4 h-4 text-blue-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          ) : isImage ? (
                            <svg
                              className="w-4 h-4 text-green-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {file.objectName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatFileSize(file.length)} •{" "}
                            {file.contentType || "unknown"}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {isVideo && (
                            <button
                              onClick={() =>
                                setShowVideoPreview(
                                  showVideoPreview === fileUrl ? null : fileUrl,
                                )
                              }
                              className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                              title="Preview video"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                          )}
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Open URL"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                          <button
                            onClick={() => handleDeleteBunnyFile(file.path)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Video Preview Modal */}
            {showVideoPreview && (
              <div
                className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                onClick={() => setShowVideoPreview(null)}
              >
                <div
                  className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowVideoPreview(null)}
                    className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <video
                    src={showVideoPreview}
                    controls
                    autoPlay
                    className="w-full aspect-video"
                    style={{ maxHeight: "80vh" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Upload More */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h4 className="font-semibold text-gray-900 mb-3">
              Upload New File
            </h4>
            <p className="text-xs text-gray-500 mb-4">
              Upload directly to Bunny Storage for this course. Use the Lectures
              tab to attach videos to specific lectures.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0f1b3a] to-[#1b2a4a] text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-[#1b2a4a]/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Select & Upload
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !token) return;
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append(
                    "type",
                    file.type.startsWith("video/") ? "video" : "image",
                  );
                  try {
                    await authFetchJson("/api/upload", {
                      method: "POST",
                      body: formData,
                    });
                    fetchBunnyStorage();
                  } catch (err) {
                    console.error("[BUNNY UPLOAD] Error:", err);
                  }
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SETTINGS TAB — EDITABLE FORM */}
      {/* ============================================ */}
      {activeTab === "settings" && (
        <form onSubmit={handleUpdateCourse} className="space-y-6">
          {/* Course Status Banner */}
          <div
            className={`rounded-xl p-4 flex items-center justify-between ${
              course.isPublished
                ? "bg-green-50 border border-green-200"
                : "bg-amber-50 border border-amber-200"
            }`}
          >
            <div>
              <p className="font-semibold text-sm">
                {course.isPublished ? "✅ Published" : "📝 Draft"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {course.isPublished
                  ? "This course is visible to students"
                  : "Only you can see this course"}
              </p>
            </div>
            <div className="flex gap-2">
              {course.isPublished ? (
                <button
                  type="button"
                  onClick={() => handlePublishAction("unpublish")}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Unpublish
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePublishAction("publish")}
                  className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-[#0f1b3a] to-[#1b2a4a] text-white rounded-lg hover:shadow-lg hover:shadow-[#1b2a4a]/20 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Publish
                </button>
              )}
              <button
                type="button"
                onClick={() => handlePublishAction("archive")}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Archive
              </button>
            </div>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div
              className={`px-4 py-3 rounded-lg text-sm ${
                saveMessage.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {saveMessage.text}
            </div>
          )}

          {/* Main Editor Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h3 className="font-semibold text-primary text-lg">
              ✏️ Edit Course
            </h3>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short Description
              </label>
              <input
                type="text"
                value={editForm.shortDescription}
                onChange={(e) =>
                  setEditForm({ ...editForm, shortDescription: e.target.value })
                }
                placeholder="Brief summary (max 200 chars)"
                maxLength={200}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            {/* Full Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={5}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y"
                required
              />
            </div>

            {/* Price & Level & Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (ETB) *
                </label>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm({ ...editForm, price: e.target.value })
                  }
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select
                  value={editForm.level}
                  onChange={(e) =>
                    setEditForm({ ...editForm, level: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category: e.target.value })
                  }
                  placeholder="e.g. Science, Technology"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cover Image URL
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
                <input
                  type="url"
                  value={editForm.coverImage}
                  onChange={(e) =>
                    setEditForm({ ...editForm, coverImage: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                {editForm.coverImage && (
                  <div className="rounded-lg overflow-hidden border border-gray-200 h-20 w-full">
                    <img
                      src={editForm.coverImage}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Videos</p>
                <p className="text-lg font-bold text-primary">
                  {course.videoCount}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Students</p>
                <p className="text-lg font-bold text-primary">
                  {course.enrollmentCount}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Duration</p>
                <p className="text-lg font-bold text-primary">
                  {course.duration || 0} min
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Instructor</p>
                <p className="text-sm font-bold text-primary truncate">
                  {course.instructor?.fullName || "—"}
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  "💾 Save Changes"
                )}
              </button>
              <Link
                href={`/courses/${courseId}`}
                target="_blank"
                className="text-sm text-primary hover:underline ml-auto"
              >
                View public page →
              </Link>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
